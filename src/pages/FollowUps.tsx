import React, { useState, useMemo } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { Lead } from '../types/lead';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { LeadDetailModal } from '../components/LeadDetailModal';

export const FollowUps: React.FC = () => {
  const { leads, update, addActivity } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterTab, setFilterTab] = useState<'overdue' | 'today' | 'upcoming' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  // Group leads
  const categorized = useMemo(() => {
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const upcoming: Lead[] = [];
    const unscheduled: Lead[] = [];

    leads.forEach((lead) => {
      if (!lead.nextFollowUp) {
        unscheduled.push(lead);
      } else if (lead.nextFollowUp < todayStr) {
        overdue.push(lead);
      } else if (lead.nextFollowUp === todayStr) {
        today.push(lead);
      } else {
        upcoming.push(lead);
      }
    });

    // Sort overdue by oldest first
    overdue.sort((a, b) => (a.nextFollowUp! > b.nextFollowUp! ? 1 : -1));
    // Sort upcoming by closest date first
    upcoming.sort((a, b) => (a.nextFollowUp! > b.nextFollowUp! ? 1 : -1));

    return { overdue, today, upcoming, unscheduled };
  }, [leads, todayStr]);

  // Current display leads based on active tab
  const displayLeads = useMemo(() => {
    switch (filterTab) {
      case 'overdue':
        return categorized.overdue;
      case 'today':
        return categorized.today;
      case 'upcoming':
        return categorized.upcoming;
      case 'all':
        return [...categorized.overdue, ...categorized.today, ...categorized.upcoming];
    }
  }, [categorized, filterTab]);

  // Actions
  const handleCompleteFollowUp = async (lead: Lead) => {
    await addActivity(
      lead.id,
      'Follow-up completed',
      'contact_attempt',
      `Completed scheduled follow-up on ${new Date().toLocaleDateString()}`
    );
    await update({
      ...lead,
      lastContacted: todayStr,
      nextFollowUp: undefined,
    });
  };

  const handleReschedule = async (lead: Lead, days: number) => {
    const nextDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    await addActivity(
      lead.id,
      `Follow-up rescheduled to ${nextDate}`,
      'followup_scheduled',
      `Moved follow-up out by ${days} days.`
    );
    await update({
      ...lead,
      nextFollowUp: nextDate,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Follow-Up Schedule</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stay on top of prospect touchpoints and prevent warm leads from going cold.
          </p>
        </div>
        <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold shrink-0 min-w-max">
            <button
              onClick={() => setFilterTab('today')}
              className={`px-3 py-1.5 rounded-md transition ${
                filterTab === 'today'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Due Today ({categorized.today.length})
            </button>
            <button
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-md transition ${
                filterTab === 'overdue'
                  ? 'bg-white text-red-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overdue ({categorized.overdue.length})
            </button>
            <button
              onClick={() => setFilterTab('upcoming')}
              className={`px-3 py-1.5 rounded-md transition ${
                filterTab === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({categorized.upcoming.length})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Scheduled ({categorized.overdue.length + categorized.today.length + categorized.upcoming.length})
            </button>
          </div>
        </div>
      </div>


      {/* Follow-up Cards List */}
      <div className="space-y-3">
        {displayLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">All clear!</h3>
            <p className="text-xs text-slate-500 mt-1">
              {filterTab === 'today'
                ? 'No follow-ups due today.'
                : filterTab === 'overdue'
                ? 'No overdue follow-ups.'
                : 'No upcoming follow-ups scheduled.'}
            </p>
          </div>
        ) : (
          displayLeads.map((lead) => {
            const isOverdue = lead.nextFollowUp! < todayStr;
            const isToday = lead.nextFollowUp! === todayStr;

            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`bg-white rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:shadow-sm transition ${
                  isOverdue
                    ? 'border-red-200 hover:border-red-300'
                    : isToday
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left: Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{lead.businessName}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                        isOverdue
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isToday
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isOverdue ? 'Overdue' : isToday ? 'Due Today' : `Due: ${lead.nextFollowUp}`}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      {lead.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-2">
                    <span>{lead.category || 'General Business'}</span>
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        • <Phone size={12} /> {lead.phone}
                      </span>
                    )}
                    {lead.email && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        • <Mail size={12} /> {lead.email}
                      </span>
                    )}
                  </p>

                  {lead.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 italic">
                      "{lead.notes}"
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-wrap items-center gap-2 shrink-0"
                >
                  <button
                    onClick={() => handleCompleteFollowUp(lead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                  >
                    <CheckCircle2 size={14} />
                    Mark Done
                  </button>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
                    <button
                      onClick={() => handleReschedule(lead, 1)}
                      className="px-2 py-1 hover:bg-white rounded transition text-slate-700"
                      title="Move to tomorrow"
                    >
                      +1 Day
                    </button>
                    <button
                      onClick={() => handleReschedule(lead, 3)}
                      className="px-2 py-1 hover:bg-white rounded transition text-slate-700"
                      title="Move out 3 days"
                    >
                      +3 Days
                    </button>
                    <button
                      onClick={() => handleReschedule(lead, 7)}
                      className="px-2 py-1 hover:bg-white rounded transition text-slate-700"
                      title="Move out 1 week"
                    >
                      +1 Wk
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
};

export default FollowUps;
