import { Lead } from '../types/lead';
import { isWebsiteListed } from './score';

/**
 * Normalizes phone numbers to standard digit strings.
 * Handles +1, leading 0, country code prefixes (e.g. +91), spaces, dashes, parentheses.
 */
export function normalizePhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 7) return '';

  // If 11 digits starting with 1 (US), extract 10 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  // If 11 digits starting with 0 (e.g. India local 09894417229), extract 10 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  // If 12 digits starting with 91 (India country code), extract 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  // Return last 10 digits if longer than 10
  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
}

/**
 * Normalizes website URL by stripping protocols, 'www.', trailing slashes,
 * query params, and paths.
 */
export function normalizeWebsite(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  if (!isWebsiteListed(url)) return '';

  let cleaned = url.trim().toLowerCase();
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  // Strip www.
  cleaned = cleaned.replace(/^www\./i, '');
  // Strip query strings and hash
  cleaned = cleaned.split('?')[0].split('#')[0];
  // Strip trailing slashes and common index paths
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/index\.(html|htm|php|asp)$/, '');

  return cleaned;
}

/**
 * Normalizes business names by converting to lowercase, removing punctuation,
 * stripping common corporate suffixes, and collapsing whitespace.
 */
export function normalizeBusinessName(name?: string): string {
  if (!name || typeof name !== 'string') return '';
  let cleaned = name.trim().toLowerCase();

  // Strip apostrophes and dots without adding extra space (e.g. Mr.Care -> mrcare)
  cleaned = cleaned.replace(/[.'’]/g, '');
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');

  // Remove corporate designators at word boundaries
  cleaned = cleaned.replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|pvt|private)\b/g, '');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Normalizes physical addresses by collapsing common street suffix abbreviations
 * and stripping punctuation.
 */
export function normalizeAddress(addr?: string): string {
  if (!addr || typeof addr !== 'string') return '';
  let cleaned = addr.trim().toLowerCase();

  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
  cleaned = cleaned.replace(/\b(street|str)\b/g, 'st');
  cleaned = cleaned.replace(/\b(road)\b/g, 'rd');
  cleaned = cleaned.replace(/\b(avenue|ave)\b/g, 'ave');
  cleaned = cleaned.replace(/\b(boulevard|blvd)\b/g, 'blvd');
  cleaned = cleaned.replace(/\b(lane|ln)\b/g, 'ln');
  cleaned = cleaned.replace(/\b(drive|dr)\b/g, 'dr');
  cleaned = cleaned.replace(/\b(floor|flr)\b/g, 'fl');

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/**
 * Enhanced similarity metric combining token/stem overlap and Levenshtein distance for fuzzy warnings.
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;

  // Word token and stem overlap
  const words1 = s1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = s2.split(/\s+/).filter((w) => w.length > 2);
  if (words1.length > 0 && words2.length > 0) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    let common = 0;
    set1.forEach((w) => {
      if (set2.has(w)) {
        common++;
      } else {
        for (const w2 of set2) {
          if (w.startsWith(w2) || w2.startsWith(w)) {
            common += 0.85;
            break;
          }
        }
      }
    });
    const union = new Set([...set1, ...set2]).size;
    const tokenScore = common / union;
    if (tokenScore >= 0.5) {
      return tokenScore;
    }
  }

  // Levenshtein character distance
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / maxLen;
}

export type DuplicateMatchLevel = 'exact' | 'fuzzy' | 'none';

export interface DuplicateCheckResult {
  matchLevel: DuplicateMatchLevel;
  matchedLead?: Lead;
  matchReason?: string;
}

/**
 * Robust Duplicate Matching Strategy:
 * 1. Match exact normalized phone numbers first (if at least 7-10 digits).
 * 2. Match exact normalized websites next (if valid website listed).
 * 3. Match exact normalized business name combined with address.
 * 4. Fuzzy business name similarity (>= 80%) treated as warning ('fuzzy'), NOT exact.
 */
export function checkDuplicate(
  incoming: {
    businessName: string;
    phone?: string;
    website?: string;
    address?: string;
  },
  existingLeads: Lead[]
): DuplicateCheckResult {
  const normPhone = normalizePhone(incoming.phone);
  const normWeb = normalizeWebsite(incoming.website);
  const normName = normalizeBusinessName(incoming.businessName);
  const normAddr = normalizeAddress(incoming.address);

  // 1. Match exact normalized phone numbers first
  if (normPhone && normPhone.length >= 7) {
    const match = existingLeads.find((l) => {
      const existingPhone = normalizePhone(l.phone);
      return existingPhone && existingPhone === normPhone;
    });
    if (match) {
      return {
        matchLevel: 'exact',
        matchedLead: match,
        matchReason: `Exact phone match (${incoming.phone})`,
      };
    }
  }

  // 2. Match exact normalized website next
  if (normWeb && normWeb.length > 3) {
    const match = existingLeads.find((l) => {
      const existingWeb = normalizeWebsite(l.website);
      return existingWeb && existingWeb === normWeb;
    });
    if (match) {
      return {
        matchLevel: 'exact',
        matchedLead: match,
        matchReason: `Exact website match (${normWeb})`,
      };
    }
  }

  // 3. Match exact normalized business name combined with address
  if (normName && normAddr && normAddr.length >= 5) {
    const match = existingLeads.find((l) => {
      const existingName = normalizeBusinessName(l.businessName);
      const existingAddr = normalizeAddress(l.address);
      if (existingName === normName && existingAddr) {
        // Check if address overlaps significantly
        if (existingAddr === normAddr || existingAddr.includes(normAddr) || normAddr.includes(existingAddr)) {
          return true;
        }
      }
      return false;
    });
    if (match) {
      return {
        matchLevel: 'exact',
        matchedLead: match,
        matchReason: `Exact business name and address match`,
      };
    }
  }

  // 4. Exact business name without phone/website/address to contradict
  if (normName && normName.length >= 3) {
    const match = existingLeads.find((l) => {
      const existingName = normalizeBusinessName(l.businessName);
      if (existingName === normName) {
        // If neither has phone or website, or both are identical
        const existingPhone = normalizePhone(l.phone);
        const existingWeb = normalizeWebsite(l.website);
        if (!normPhone && !existingPhone && !normWeb && !existingWeb) {
          return true;
        }
      }
      return false;
    });
    if (match) {
      return {
        matchLevel: 'exact',
        matchedLead: match,
        matchReason: `Identical business name`,
      };
    }
  }

  // 5. Fuzzy match check (Warning only, NOT an automatic duplicate)
  if (normName && normName.length >= 4) {
    const fuzzyMatch = existingLeads.find((l) => {
      const existingName = normalizeBusinessName(l.businessName);
      const similarity = stringSimilarity(normName, existingName);
      return similarity >= 0.60;
    });
    if (fuzzyMatch) {
      return {
        matchLevel: 'fuzzy',
        matchedLead: fuzzyMatch,
        matchReason: `Similar business name ("${fuzzyMatch.businessName}")`,
      };
    }
  }

  return { matchLevel: 'none' };
}
