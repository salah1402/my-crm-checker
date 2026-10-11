export type SalesStatus =
  | 'New'
  | 'To Research'
  | 'Ready to Contact'
  | 'Contacted'
  | 'Replied'
  | 'Meeting Booked'
  | 'Proposal Sent'
  | 'Won'
  | 'Lost'
  | 'Not Interested';

export const ALL_SALES_STATUSES: SalesStatus[] = [
  'New',
  'To Research',
  'Ready to Contact',
  'Contacted',
  'Replied',
  'Meeting Booked',
  'Proposal Sent',
  'Won',
  'Lost',
  'Not Interested',
];

export type Priority = 'High' | 'Medium' | 'Low';

export type WebsiteQuality = 'unassessed' | 'none' | 'poor' | 'outdated' | 'average' | 'good';

export interface LeadActivity {
  id: string;
  leadId: string;
  timestamp: string;
  type: 'status_change' | 'contact_attempt' | 'reply' | 'meeting' | 'proposal' | 'note' | 'followup_scheduled' | 'created';
  title: string;
  description?: string;
}

export interface Lead {
  id: string;
  businessName: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  websiteQuality?: WebsiteQuality;
  leadScore: number;
  priority: Priority;
  status: SalesStatus;
  lastContacted?: string; // YYYY-MM-DD or ISO
  nextFollowUp?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  notes?: string;
  sourceFields?: Record<string, any>;
  activities?: LeadActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoringSettings {
  noWebsitePoints: number;
  poorWebsitePoints: number;
  highReviewsPoints: number;
  highReviewsThreshold: number;
  highRatingPoints: number;
  highRatingThreshold: number;
  highPriorityThreshold: number;
  mediumPriorityThreshold: number;
}

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  noWebsitePoints: 40,
  poorWebsitePoints: 25,
  highReviewsPoints: 20,
  highReviewsThreshold: 100,
  highRatingPoints: 15,
  highRatingThreshold: 4.5,
  highPriorityThreshold: 60,
  mediumPriorityThreshold: 30,
};
