import { Lead, ScoringSettings, DEFAULT_SCORING_SETTINGS, Priority } from '../types/lead';

/**
 * Checks whether a URL is a Google Maps or Google search link rather than a real business website.
 */
export function isGoogleMapsUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('maps.google.') ||
    lower.includes('google.com/maps') ||
    lower.includes('goo.gl/maps') ||
    lower.includes('maps.app.goo.gl') ||
    lower.includes('search.google.com/local')
  );
}

/**
 * Checks if a legitimate business website is listed.
 */
export function isWebsiteListed(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  const lower = trimmed.toLowerCase();
  if (lower === 'none' || lower === 'n/a' || lower === 'null' || lower === 'undefined' || lower === 'no') {
    return false;
  }

  // Google Maps links or review links are not business websites
  if (isGoogleMapsUrl(lower)) {
    return false;
  }

  return true;
}

/**
 * Safely parses rating to a clean number between 0 and 5.
 */
export function parseRating(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    if (isNaN(val)) return undefined;
    return Math.max(0, Math.min(5, Math.round(val * 10) / 10));
  }
  const str = String(val).trim().replace(',', '.');
  const match = str.match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const num = parseFloat(match[0]);
  if (isNaN(num)) return undefined;
  return Math.max(0, Math.min(5, Math.round(num * 10) / 10));
}

/**
 * Safely parses review count to an integer (handling commas like "1,234").
 */
export function parseReviewCount(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') {
    if (isNaN(val)) return undefined;
    return Math.max(0, Math.round(val));
  }
  const str = String(val).trim();
  const cleaned = str.replace(/,/g, '').match(/\d+/);
  if (!cleaned) return undefined;
  const num = parseInt(cleaned[0], 10);
  if (isNaN(num)) return undefined;
  return Math.max(0, num);
}

/**
 * Computes transparent lead score (0-100) and priority (High, Medium, Low).
 *
 * Rules:
 * - +40 points when no website is listed (or missing).
 * - +25 points when website quality has been MANUALLY marked as Poor or Outdated.
 * - +20 points when review count is at least 100.
 * - +15 points when Google rating is at least 4.5.
 *
 * Priority:
 * - High: score >= 60
 * - Medium: score >= 30 and score < 60
 * - Low: score < 30
 */
export function computeLeadScore(
  lead: Partial<Lead>,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): { score: number; priority: Priority } {
  let score = 0;

  // 1. Missing website listing (+40 points by default)
  const hasWebsite = isWebsiteListed(lead.website);
  if (!hasWebsite) {
    score += settings.noWebsitePoints;
  }

  // 2. Website assessed manually as poor or outdated (+25 points by default)
  // Only award if manually assessed as poor or outdated
  if (
    lead.websiteQuality &&
    ['poor', 'outdated'].includes(lead.websiteQuality.trim().toLowerCase())
  ) {
    score += settings.poorWebsitePoints;
  }

  // 3. Review count >= threshold (+20 points by default, threshold >= 100)
  const parsedReviews = parseReviewCount(lead.reviewCount);
  if (
    typeof parsedReviews === 'number' &&
    parsedReviews >= settings.highReviewsThreshold
  ) {
    score += settings.highReviewsPoints;
  }

  // 4. Rating >= threshold (+15 points by default, threshold >= 4.5)
  const parsedRating = parseRating(lead.rating);
  if (
    typeof parsedRating === 'number' &&
    parsedRating >= settings.highRatingThreshold
  ) {
    score += settings.highRatingPoints;
  }

  // Clamp strictly 0 - 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Priority thresholds
  let priority: Priority = 'Low';
  if (score >= settings.highPriorityThreshold) {
    priority = 'High';
  } else if (score >= settings.mediumPriorityThreshold) {
    priority = 'Medium';
  }

  return { score, priority };
}

/**
 * Normalizes a lead record, extracts actual fields from sourceFields if needed,
 * and recalculates score and priority while preserving all user-edited data.
 */
export function normalizeAndScoreLead(
  lead: Lead,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): { lead: Lead; changed: boolean } {
  const sf = lead.sourceFields || {};

  // Check website & Google Maps URL
  let website = (lead.website || '').trim();
  let googleMapsUrl = (lead.googleMapsUrl || '').trim();

  // If website was accidentally mapped to a Google Maps URL, fix it
  if (isGoogleMapsUrl(website)) {
    if (!googleMapsUrl) {
      googleMapsUrl = website;
    }
    // Check if sourceFields has the actual website
    const rawWebsite = sf.website || sf.Website || sf.web || sf.url;
    if (rawWebsite && !isGoogleMapsUrl(String(rawWebsite))) {
      website = String(rawWebsite).trim();
    } else {
      website = '';
    }
  } else if (!website) {
    // Check if sourceFields has website
    const rawWebsite = sf.website || sf.Website;
    if (rawWebsite && !isGoogleMapsUrl(String(rawWebsite))) {
      website = String(rawWebsite).trim();
    }
  }

  // Check googleMapsUrl in sourceFields
  if (!googleMapsUrl) {
    const rawMap = sf.maps_url || sf.map_url || sf.googleMapsUrl || sf['Maps URL'];
    if (rawMap) {
      googleMapsUrl = String(rawMap).trim();
    }
  }

  // Check category in sourceFields
  let category = lead.category || '';
  if (!category || category === 'General') {
    const rawCat = sf.categories || sf.category || sf['Categories'] || sf['Category'];
    if (rawCat) {
      category = String(rawCat).trim();
    }
  }

  // Check and parse rating
  let rating = parseRating(lead.rating);
  if (rating === undefined) {
    rating = parseRating(sf.rating || sf.Rating || sf.stars);
  }

  // Check and parse reviewCount
  let reviewCount = parseReviewCount(lead.reviewCount);
  if (reviewCount === undefined) {
    reviewCount = parseReviewCount(
      sf.review_count || sf.reviews_count || sf['Review Count'] || sf.reviews
    );
  }

  // Calculate score and priority
  const { score, priority } = computeLeadScore(
    {
      ...lead,
      website,
      websiteQuality: lead.websiteQuality,
      rating,
      reviewCount,
    },
    settings
  );

  const changed =
    lead.leadScore !== score ||
    lead.priority !== priority ||
    lead.website !== website ||
    lead.googleMapsUrl !== googleMapsUrl ||
    lead.rating !== rating ||
    lead.reviewCount !== reviewCount ||
    lead.category !== category;

  const normalizedLead: Lead = {
    ...lead,
    website,
    googleMapsUrl,
    category: category || lead.category,
    rating,
    reviewCount,
    leadScore: score,
    priority,
  };

  return { lead: normalizedLead, changed };
}
