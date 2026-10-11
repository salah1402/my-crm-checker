import React, { useState, useMemo } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { Lead, SalesStatus, ALL_SALES_STATUSES, Priority } from '../types/lead';
import {
  Search,
  Filter,
  MoveRight,
  MoreVertical,
  Calendar,
  Sparkles,
  Phone,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { LeadDetailModal } from '../components/LeadDetailModal';

export const Pipeline: React.FC = () => {
  const { leads, update } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          lead.businessName.toLowerCase().includes(q) ||
          lead.category?.toLowerCase().includes(q) ||
          lead.phone?.toLowerCase().includes(q) ||
          lead.notes?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (priorityFilter !== 'ALL' && lead.priority !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [leads, searchTerm, priorityFilter]);

  // Group by status
  const leadsByStatus = useMemo(() => {
    const map: Record<SalesStatus, Lead[]> = {
      'New': [],
      'To Research': [],
      'Ready to Contact': [],
      'Contacted': [],
      'Replied': [],
      'Meeting Booked': [],
      'Proposal Sent': [],
      'Won': [],
      'Lost': [],
      'Not Interested': [],
    };
    filteredLeads.forEach((l) => {
      if (map[l.status]) {
        map[l.status].push(l);
      } else {
        map['New'].push(l);
      }
    });
    return map;
  }, [filteredLeads]);

  // Drag and drop handlers
  const handleDragStart = (leadId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: SalesStatus, e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggingLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== status) {
      await update({ ...lead, status });
    }
    setDraggingLeadId(null);
  };

  // Move status programmatically (Mobile / Touch friendly)
  const handleQuickMove = async (lead: Lead, newStatus: SalesStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.status !== newStatus) {
      await update({ ...lead, status: newStatus });
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sales Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive Kanban board. Drag cards or use the dropdown to advance prospect stages.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter pipeline leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 shrink-0"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Mobile Stage Quick Switcher Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs md:hidden scrollbar-none">
        {ALL_SALES_STATUSES.map((status) => {
          const count = leadsByStatus[status]?.length || 0;
          return (
            <button
              key={status}
              onClick={() => {
                const el = document.getElementById(`kanban-col-${status.replace(/\s+/g, '-')}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start' });
              }}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700 whitespace-nowrap text-[11px] font-medium flex items-center gap-1.5 hover:bg-slate-50 shadow-2xs shrink-0"
            >
              <span>{status}</span>
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-4 pt-1 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="flex gap-4 min-w-max items-start">
          {ALL_SALES_STATUSES.map((status) => {
            const columnLeads = leadsByStatus[status] || [];
            return (
              <div
                key={status}
                id={`kanban-col-${status.replace(/\s+/g, '-')}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(status, e)}
                className="w-72 bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col max-h-[calc(100vh-190px)] shrink-0"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{status}</span>
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {columnLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-lg">
                      Drop lead here
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(lead.id, e)}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing hover:border-blue-400 transition group select-none"
                      >
                        {/* Top card row: business & score */}
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate flex-1">
                            {lead.businessName}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${getPriorityBadge(
                              lead.priority
                            )}`}
                          >
                            {lead.leadScore} pts
                          </span>
                        </div>

                        {/* Category & Phone */}
                        <div className="text-[11px] text-slate-500 mb-2 truncate">
                          {lead.category || 'General'}{' '}
                          {lead.phone && <span className="text-slate-400">• {lead.phone}</span>}
                        </div>

                        {/* Card metadata row */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <div className="flex items-center gap-1">
                            {lead.nextFollowUp ? (
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Calendar size={11} className="text-slate-400" />
                                {lead.nextFollowUp}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No follow-up</span>
                            )}
                          </div>

                          {/* Quick Move Dropdown (for touch/non-drag users) */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative flex items-center"
                          >
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleQuickMove(lead, e.target.value as SalesStatus, e as any)
                              }
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 focus:outline-hidden"
                            >
                              {ALL_SALES_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  &rarr; {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
};

export default Pipeline;
