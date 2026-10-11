import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Lead, SalesStatus, ScoringSettings, DEFAULT_SCORING_SETTINGS, LeadActivity } from '../types/lead';
import {
  getAllLeads,
  addLead,
  updateLead,
  deleteLead,
  bulkPutLeads,
  clearAllLeads,
  getStoredSettings,
  saveStoredSettings,
} from '../lib/db';
import {
  computeLeadScore,
  normalizeAndScoreLead,
  parseRating,
  parseReviewCount,
  isGoogleMapsUrl,
} from '../lib/score';
import { checkDuplicate } from '../lib/duplicates';
import { v4 as uuidv4 } from 'uuid';

interface LeadsContextProps {
  leads: Lead[];
  loading: boolean;
  scoringSettings: ScoringSettings;
  updateScoringSettings: (settings: ScoringSettings) => Promise<void>;
  add: (leadData: Partial<Lead> & { businessName: string }) => Promise<Lead>;
  update: (lead: Lead) => Promise<void>;
  remove: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], newStatus: SalesStatus) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkImport: (
    importedLeads: Partial<Lead>[],
    mode: 'skip' | 'update' | 'create_separate'
  ) => Promise<{ imported: number; updated: number; skipped: number }>;
  addActivity: (leadId: string, title: string, type: LeadActivity['type'], description?: string) => Promise<void>;
  clearDatabase: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  refreshLeads: () => Promise<void>;
  recalculateAllLeads: () => Promise<void>;
}

const LeadsContext = createContext<LeadsContextProps | undefined>(undefined);

const SAMPLE_LEADS: Partial<Lead>[] = [
  {
    businessName: 'Apex Roofing & Restoration',
    category: 'Roofing Contractor',
    phone: '+1 (555) 234-8901',
    email: 'info@apexroofingrestoration.com',
    website: 'https://apexroofingrestoration.com',
    address: '1420 Commercial Ave, Austin, TX 78701',
    googleMapsUrl: 'https://maps.google.com/?q=Apex+Roofing+Austin',
    rating: 4.8,
    reviewCount: 142,
    websiteQuality: 'poor',
    status: 'Ready to Contact',
    notes: 'Good ratings on Maps. Website is outdated with slow loading speed and missing lead capture form.',
    nextFollowUp: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  },
  {
    businessName: 'Lone Star Plumbing Pros',
    category: 'Plumber',
    phone: '+1 (555) 456-7890',
    email: 'contact@lonestarplumbing.com',
    website: '',
    address: '890 Riverside Dr, Austin, TX 78704',
    googleMapsUrl: 'https://maps.google.com/?q=Lone+Star+Plumbing+Austin',
    rating: 4.6,
    reviewCount: 88,
    websiteQuality: 'unassessed',
    status: 'New',
    notes: 'No website URL present on Google Maps profile. Urgent prospect for web design offer.',
    nextFollowUp: new Date().toISOString().split('T')[0],
  },
  {
    businessName: 'Downtown Dental Care',
    category: 'Dentist',
    phone: '+1 (555) 789-0123',
    email: 'reception@downtowndentalcare.com',
    website: 'https://downtowndentalcare.com',
    address: '300 Congress Ave #400, Austin, TX 78701',
    googleMapsUrl: 'https://maps.google.com/?q=Downtown+Dental+Austin',
    rating: 4.9,
    reviewCount: 215,
    websiteQuality: 'good',
    status: 'Contacted',
    lastContacted: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    nextFollowUp: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    notes: 'Called clinic office manager on Tuesday. Interested in Google Ads & SEO audit.',
  },
  {
    businessName: 'GreenThumb Landscape Design',
    category: 'Landscaper',
    phone: '+1 (555) 345-6789',
    email: '',
    website: '',
    address: '5200 S Congress Ave, Austin, TX 78745',
    googleMapsUrl: 'https://maps.google.com/?q=GreenThumb+Landscape+Austin',
    rating: 4.3,
    reviewCount: 34,
    websiteQuality: 'unassessed',
    status: 'To Research',
    notes: 'High demand in spring. Check if they have an active Facebook or Instagram profile.',
  },
  {
    businessName: 'Precision Auto Body & Paint',
    category: 'Auto Repair',
    phone: '+1 (555) 678-9012',
    email: 'claims@precisionautobodytx.com',
    website: 'https://precisionautobodytx.com',
    address: '1100 Airport Blvd, Austin, TX 78702',
    googleMapsUrl: 'https://maps.google.com/?q=Precision+Auto+Body+Austin',
    rating: 4.7,
    reviewCount: 168,
    websiteQuality: 'outdated',
    status: 'Meeting Booked',
    lastContacted: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    nextFollowUp: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: 'Zoom meeting confirmed for tomorrow at 2 PM with shop owner Marcus.',
  },
  {
    businessName: 'Hill Country HVAC Solutions',
    category: 'HVAC Contractor',
    phone: '+1 (555) 901-2345',
    email: 'service@hillcountryhvac.com',
    website: 'https://hillcountryhvac.com',
    address: '7600 Burnet Rd, Austin, TX 78757',
    googleMapsUrl: 'https://maps.google.com/?q=Hill+Country+HVAC+Austin',
    rating: 4.5,
    reviewCount: 110,
    websiteQuality: 'poor',
    status: 'Proposal Sent',
    lastContacted: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    nextFollowUp: new Date().toISOString().split('T')[0],
    notes: 'Proposal for website redesign & local map-pack ranking optimization ($2,400) sent.',
  },
];

export const LeadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scoringSettings, setScoringSettings] = useState<ScoringSettings>(DEFAULT_SCORING_SETTINGS);

  const refreshLeads = useCallback(async () => {
    try {
      const all = await getAllLeads();
      setLeads(all);
    } catch (err) {
      console.error('Failed to load leads from IndexedDB', err);
    }
  }, []);

  const recalculateAllLeads = useCallback(async () => {
    try {
      const all = await getAllLeads();
      const currentSettings = await getStoredSettings();
      let anyChanged = false;
      const updated = all.map((lead) => {
        const { lead: normalized, changed } = normalizeAndScoreLead(lead, currentSettings);
        if (changed) anyChanged = true;
        return normalized;
      });

      if (anyChanged) {
        await bulkPutLeads(updated);
      }
      setLeads(updated);
    } catch (err) {
      console.error('Failed to recalculate leads', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const storedSettings = await getStoredSettings();
        setScoringSettings(storedSettings);

        const all = await getAllLeads();
        if (all.length === 0) {
          // Initialize with sample leads on first run
          const seeded: Lead[] = SAMPLE_LEADS.map((item) => {
            const rating = parseRating(item.rating);
            const reviewCount = parseReviewCount(item.reviewCount);
            const { score, priority } = computeLeadScore(
              {
                ...item,
                rating,
                reviewCount,
              },
              storedSettings
            );
            const now = new Date().toISOString();
            return {
              id: uuidv4(),
              businessName: item.businessName!,
              category: item.category || 'General',
              phone: item.phone || '',
              email: item.email || '',
              website: item.website || '',
              address: item.address || '',
              googleMapsUrl: item.googleMapsUrl || '',
              rating,
              reviewCount,
              websiteQuality: item.websiteQuality || 'unassessed',
              leadScore: score,
              priority: priority,
              status: (item.status as SalesStatus) || 'New',
              lastContacted: item.lastContacted,
              nextFollowUp: item.nextFollowUp,
              notes: item.notes || '',
              sourceFields: {},
              activities: [
                {
                  id: uuidv4(),
                  leadId: '',
                  timestamp: now,
                  type: 'created',
                  title: 'Lead record initialized',
                },
              ],
              createdAt: now,
              updatedAt: now,
            };
          });
          await bulkPutLeads(seeded);
          setLeads(seeded);
        } else {
          // Automatic reconciliation and recalculation of all stored leads
          // Ensures any previously imported CSV data has accurate numeric rating, review count,
          // restored website/maps fields, and recalculated scores/priorities.
          let anyChanged = false;
          const updatedAll = all.map((lead) => {
            const { lead: normalized, changed } = normalizeAndScoreLead(lead, storedSettings);
            if (changed) anyChanged = true;
            return normalized;
          });

          if (anyChanged) {
            await bulkPutLeads(updatedAll);
          }
          setLeads(updatedAll);
        }
      } catch (err) {
        console.error('Database initialization error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateScoringSettings = async (newSettings: ScoringSettings) => {
    await saveStoredSettings(newSettings);
    setScoringSettings(newSettings);

    // Recalculate score and priority for all stored leads
    const updated = leads.map((lead) => {
      const { lead: normalized } = normalizeAndScoreLead(lead, newSettings);
      return {
        ...normalized,
        updatedAt: new Date().toISOString(),
      };
    });

    await bulkPutLeads(updated);
    setLeads(updated);
  };

  const add = async (leadData: Partial<Lead> & { businessName: string }): Promise<Lead> => {
    const rating = parseRating(leadData.rating);
    const reviewCount = parseReviewCount(leadData.reviewCount);
    let website = (leadData.website || '').trim();
    let googleMapsUrl = (leadData.googleMapsUrl || '').trim();

    if (isGoogleMapsUrl(website)) {
      if (!googleMapsUrl) googleMapsUrl = website;
      website = '';
    }

    const { score, priority } = computeLeadScore(
      {
        ...leadData,
        website,
        rating,
        reviewCount,
      },
      scoringSettings
    );

    const now = new Date().toISOString();
    const id = uuidv4();
    const newLead: Lead = {
      id,
      businessName: leadData.businessName.trim(),
      category: leadData.category || '',
      phone: leadData.phone || '',
      email: leadData.email || '',
      website,
      address: leadData.address || '',
      googleMapsUrl,
      rating,
      reviewCount,
      websiteQuality: leadData.websiteQuality || 'unassessed',
      leadScore: score,
      priority,
      status: (leadData.status as SalesStatus) || 'New',
      lastContacted: leadData.lastContacted,
      nextFollowUp: leadData.nextFollowUp,
      notes: leadData.notes || '',
      sourceFields: leadData.sourceFields || {},
      activities: [
        {
          id: uuidv4(),
          leadId: id,
          timestamp: now,
          type: 'created',
          title: 'Lead created manually',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await addLead(newLead);
    setLeads((prev) => [newLead, ...prev]);
    return newLead;
  };

  const update = async (updatedLead: Lead): Promise<void> => {
    const rating = parseRating(updatedLead.rating);
    const reviewCount = parseReviewCount(updatedLead.reviewCount);
    let website = (updatedLead.website || '').trim();
    let googleMapsUrl = (updatedLead.googleMapsUrl || '').trim();

    if (isGoogleMapsUrl(website)) {
      if (!googleMapsUrl) googleMapsUrl = website;
      website = '';
    }

    const { score, priority } = computeLeadScore(
      {
        ...updatedLead,
        website,
        rating,
        reviewCount,
      },
      scoringSettings
    );

    const now = new Date().toISOString();
    const existing = leads.find((l) => l.id === updatedLead.id);
    const activities = [...(existing?.activities || [])];

    if (existing && existing.status !== updatedLead.status) {
      activities.unshift({
        id: uuidv4(),
        leadId: updatedLead.id,
        timestamp: now,
        type: 'status_change',
        title: `Status changed from "${existing.status}" to "${updatedLead.status}"`,
      });
    }

    const leadToSave: Lead = {
      ...updatedLead,
      website,
      googleMapsUrl,
      rating,
      reviewCount,
      leadScore: score,
      priority,
      activities,
      updatedAt: now,
    };

    await updateLead(leadToSave);
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? leadToSave : l)));
  };

  const remove = async (id: string): Promise<void> => {
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const bulkUpdateStatus = async (ids: string[], newStatus: SalesStatus): Promise<void> => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    const updated = leads.map((lead) => {
      if (!idSet.has(lead.id)) return lead;
      const activities = [
        {
          id: uuidv4(),
          leadId: lead.id,
          timestamp: now,
          type: 'status_change' as const,
          title: `Bulk update: status set to "${newStatus}"`,
        },
        ...(lead.activities || []),
      ];
      return {
        ...lead,
        status: newStatus,
        activities,
        updatedAt: now,
      };
    });

    const affected = updated.filter((l) => idSet.has(l.id));
    await bulkPutLeads(affected);
    setLeads(updated);
  };

  const bulkDelete = async (ids: string[]): Promise<void> => {
    const idSet = new Set(ids);
    for (const id of ids) {
      await deleteLead(id);
    }
    setLeads((prev) => prev.filter((l) => !idSet.has(l.id)));
  };

  const bulkImport = async (
    incoming: Partial<Lead>[],
    mode: 'skip' | 'update' | 'create_separate'
  ): Promise<{ imported: number; updated: number; skipped: number }> => {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const currentLeads = [...leads];
    const leadsToSave: Lead[] = [];
    const now = new Date().toISOString();

    for (const item of incoming) {
      if (!item.businessName || item.businessName.trim().length === 0) {
        continue;
      }

      const ratingVal = parseRating(item.rating ?? item.sourceFields?.rating);
      const reviewsVal = parseReviewCount(item.reviewCount ?? item.sourceFields?.review_count);
      let websiteVal = (item.website || '').trim();
      let googleMapsUrlVal = (item.googleMapsUrl || '').trim();

      if (isGoogleMapsUrl(websiteVal)) {
        if (!googleMapsUrlVal) googleMapsUrlVal = websiteVal;
        websiteVal = '';
      }

      // Check duplicates using normalized phone, website, and business name + address
      const dupCheck = checkDuplicate(
        {
          businessName: item.businessName,
          phone: item.phone,
          website: websiteVal,
          address: item.address,
        },
        currentLeads
      );

      const isExactDuplicate = dupCheck.matchLevel === 'exact';
      const existingMatch = dupCheck.matchedLead;

      if (isExactDuplicate && mode === 'skip') {
        skippedCount++;
        continue;
      }

      if (isExactDuplicate && mode === 'update' && existingMatch) {
        const existingIndex = currentLeads.findIndex((l) => l.id === existingMatch.id);
        if (existingIndex >= 0) {
          const merged: Lead = {
            ...existingMatch,
            // Update contact and business profile attributes
            businessName: item.businessName || existingMatch.businessName,
            category: item.category && item.category !== 'General' ? item.category : existingMatch.category,
            phone: item.phone || existingMatch.phone,
            email: item.email || existingMatch.email,
            website: websiteVal || existingMatch.website,
            address: item.address || existingMatch.address,
            googleMapsUrl: googleMapsUrlVal || existingMatch.googleMapsUrl,
            rating: ratingVal !== undefined ? ratingVal : existingMatch.rating,
            reviewCount: reviewsVal !== undefined ? reviewsVal : existingMatch.reviewCount,
            websiteQuality: existingMatch.websiteQuality && existingMatch.websiteQuality !== 'unassessed'
              ? existingMatch.websiteQuality
              : (item.websiteQuality || 'unassessed'),
            // CRITICAL: NEVER OVERWRITE EXISTING STATUS, NOTES, ACTIVITIES, OR FOLLOW-UP DATES
            status: existingMatch.status,
            notes: existingMatch.notes,
            lastContacted: existingMatch.lastContacted,
            nextFollowUp: existingMatch.nextFollowUp,
            sourceFields: { ...(existingMatch.sourceFields || {}), ...(item.sourceFields || {}) },
            updatedAt: now,
            activities: [
              {
                id: uuidv4(),
                leadId: existingMatch.id,
                timestamp: now,
                type: 'created',
                title: 'Data enriched from CSV import (status, notes & schedule preserved)',
              },
              ...(existingMatch.activities || []),
            ],
          };

          const { score, priority } = computeLeadScore(merged, scoringSettings);
          merged.leadScore = score;
          merged.priority = priority;

          currentLeads[existingIndex] = merged;
          leadsToSave.push(merged);
          updatedCount++;
          continue;
        }
      }

      // Default: create separate / new entry
      const { score, priority } = computeLeadScore(
        {
          ...item,
          website: websiteVal,
          rating: ratingVal,
          reviewCount: reviewsVal,
        },
        scoringSettings
      );
      const newId = uuidv4();
      const newLead: Lead = {
        id: newId,
        businessName: item.businessName.trim(),
        category: item.category || 'General',
        phone: item.phone || '',
        email: item.email || '',
        website: websiteVal,
        address: item.address || '',
        googleMapsUrl: googleMapsUrlVal,
        rating: ratingVal,
        reviewCount: reviewsVal,
        websiteQuality: item.websiteQuality || 'unassessed',
        leadScore: score,
        priority: priority,
        status: (item.status as SalesStatus) || 'New',
        lastContacted: item.lastContacted,
        nextFollowUp: item.nextFollowUp,
        notes: item.notes || '',
        sourceFields: item.sourceFields || {},
        activities: [
          {
            id: uuidv4(),
            leadId: newId,
            timestamp: now,
            type: 'created',
            title: 'Imported from GeoLeadScraper CSV',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      currentLeads.push(newLead);
      leadsToSave.push(newLead);
      importedCount++;
    }

    if (leadsToSave.length > 0) {
      await bulkPutLeads(leadsToSave);
      setLeads([...currentLeads]);
    }

    return { imported: importedCount, updated: updatedCount, skipped: skippedCount };
  };

  const addActivity = async (
    leadId: string,
    title: string,
    type: LeadActivity['type'],
    description?: string
  ): Promise<void> => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const newActivity: LeadActivity = {
      id: uuidv4(),
      leadId,
      timestamp: new Date().toISOString(),
      type,
      title,
      description,
    };

    const updatedLead: Lead = {
      ...lead,
      activities: [newActivity, ...(lead.activities || [])],
      updatedAt: new Date().toISOString(),
    };

    await updateLead(updatedLead);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? updatedLead : l)));
  };

  const clearDatabase = async (): Promise<void> => {
    await clearAllLeads();
    setLeads([]);
  };

  const loadSampleData = async (): Promise<void> => {
    await clearAllLeads();
    const seeded: Lead[] = SAMPLE_LEADS.map((item) => {
      const rating = parseRating(item.rating);
      const reviewCount = parseReviewCount(item.reviewCount);
      const { score, priority } = computeLeadScore(
        {
          ...item,
          rating,
          reviewCount,
        },
        scoringSettings
      );
      const now = new Date().toISOString();
      const id = uuidv4();
      return {
        id,
        businessName: item.businessName!,
        category: item.category || 'General',
        phone: item.phone || '',
        email: item.email || '',
        website: item.website || '',
        address: item.address || '',
        googleMapsUrl: item.googleMapsUrl || '',
        rating,
        reviewCount,
        websiteQuality: item.websiteQuality || 'unassessed',
        leadScore: score,
        priority: priority,
        status: (item.status as SalesStatus) || 'New',
        lastContacted: item.lastContacted,
        nextFollowUp: item.nextFollowUp,
        notes: item.notes || '',
        sourceFields: {},
        activities: [
          {
            id: uuidv4(),
            leadId: id,
            timestamp: now,
            type: 'created',
            title: 'Sample lead created',
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
    });
    await bulkPutLeads(seeded);
    setLeads(seeded);
  };

  return (
    <LeadsContext.Provider
      value={{
        leads,
        loading,
        scoringSettings,
        updateScoringSettings,
        add,
        update,
        remove,
        bulkUpdateStatus,
        bulkDelete,
        bulkImport,
        addActivity,
        clearDatabase,
        loadSampleData,
        refreshLeads,
        recalculateAllLeads,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
};

export const useLeads = () => {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error('useLeads must be used within LeadsProvider');
  return ctx;
};
