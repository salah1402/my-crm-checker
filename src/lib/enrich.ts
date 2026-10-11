import { computeLeadScore } from '../lib/score';
import { Lead } from '../types/lead';

export function enrichLead(lead: Omit<Lead, 'id' | 'leadScore' | 'priority'>): Lead {
  const { score, priority } = computeLeadScore(lead);
  return {
    ...lead,
    id: '', // placeholder, will be set by context
    leadScore: score,
    priority,
  } as Lead;
}
