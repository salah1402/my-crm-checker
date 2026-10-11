import React, { useState } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { Lead, Priority } from '../types/lead';
import {
  Users,
  UserPlus,
  PhoneCall,
  MessageSquare,
  Calendar,
  FileCheck,
  Trophy,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileUp,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { AddLeadModal } from '../components/AddLeadModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { leads, loading } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated Metrics
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'New').length;
  const contactedLeads = leads.filter(
    (l) => l.status === 'Contacted' || l.lastContacted
  ).length;
  const repliesReceived = leads.filter((l) => l.status === 'Replied').length;
  const meetingsBooked = leads.filter((l) => l.status === 'Meeting Booked').length;
  const proposalsSent = leads.filter((l) => l.status === 'Proposal Sent').length;
  const clientsWon = leads.filter((l) => l.status === 'Won').length;

  const dueTodayLeads = leads.filter((l) => l.nextFollowUp && l.nextFollowUp === todayStr);
  const overdueLeads = leads.filter((l) => l.nextFollowUp && l.nextFollowUp < todayStr);

  // Status Distribution Data for Bar Chart
  const statusCounts: Record<string, number> = {};
  leads.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const pipelineData = [
    { name: 'New', count: statusCounts['New'] || 0, color: '#64748b' },
    { name: 'To Research', count: statusCounts['To Research'] || 0, color: '#0284c7' },
    { name: 'Ready', count: statusCounts['Ready to Contact'] || 0, color: '#6366f1' },
    { name: 'Contacted', count: statusCounts['Contacted'] || 0, color: '#8b5cf6' },
    { name: 'Replied', count: statusCounts['Replied'] || 0, color: '#ec4899' },
    { name: 'Meeting', count: statusCounts['Meeting Booked'] || 0, color: '#f59e0b' },
    { name: 'Proposal', count: statusCounts['Proposal Sent'] || 0, color: '#ea580c' },
    { name: 'Won', count: statusCounts['Won'] || 0, color: '#10b981' },
    { name: 'Lost', count: statusCounts['Lost'] || 0, color: '#ef4444' },
  ];

  // Priority Distribution
  const priorityData = [
    { name: 'High Priority', value: leads.filter((l) => l.priority === 'High').length, color: '#ef4444' },
    { name: 'Medium Priority', value: leads.filter((l) => l.priority === 'Medium').length, color: '#f59e0b' },
    { name: 'Low Priority', value: leads.filter((l) => l.priority === 'Low').length, color: '#94a3b8' },
  ];

  // High Priority Prospects (Score >= 60, not Won or Lost)
  const highPriorityProspects = leads
    .filter((l) => l.priority === 'High' && l.status !== 'Won' && l.status !== 'Lost')
    .sort((a, b) => b.leadScore - a.leadScore)
    .slice(0, 5);

  // Upcoming Follow-ups (Due today or future)
  const upcomingFollowUps = leads
    .filter((l) => l.nextFollowUp && l.nextFollowUp >= todayStr)
    .sort((a, b) => (a.nextFollowUp! > b.nextFollowUp! ? 1 : -1))
    .slice(0, 5);

  // All recent activities flattened
  const recentActivities = leads
    .flatMap((lead) =>
      (lead.activities || []).map((act) => ({
        ...act,
        leadName: lead.businessName,
        leadId: lead.id,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const statCards = [
    { label: 'Total Leads', val: totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'New Leads', val: newLeads, icon: UserPlus, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Contacted', val: contactedLeads, icon: PhoneCall, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Replies', val: repliesReceived, icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Meetings Booked', val: meetingsBooked, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Proposals Sent', val: proposalsSent, icon: FileCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Clients Won', val: clientsWon, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    {
      label: 'Follow-ups Due',
      val: dueTodayLeads.length + overdueLeads.length,
      sub: `${overdueLeads.length} overdue, ${dueTodayLeads.length} today`,
      icon: Clock,
      color: overdueLeads.length > 0 ? 'text-red-600' : 'text-blue-600',
      bg: overdueLeads.length > 0 ? 'bg-red-50' : 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">LeadFlow Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time pipeline performance for local businesses collected via GeoLeadScraper.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link
            to="/import-export"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-50 transition"
          >
            <FileUp size={15} />
            <span>Import CSV</span>
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition"
          >
            <UserPlus size={15} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">{card.label}</span>
                <div className={`p-1 sm:p-1.5 rounded-md ${card.bg} ${card.color} shrink-0`}>
                  <Icon size={14} className="sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="text-xl sm:text-2xl font-bold text-slate-900">{card.val}</span>
                {card.sub && (
                  <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">{card.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Pipeline Stage Distribution</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Live lead count across sales cycle stages</p>
            </div>
            <Link to="/pipeline" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 shrink-0">
              View Board <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-60 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Leads`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Opportunity Score Breakdown</h3>
            <p className="text-xs text-slate-500 mb-2">Automated lead prioritization distribution</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center">
            {totalLeads > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Leads`, 'Count']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No leads in database</div>
            )}
          </div>
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {priorityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prospect & Follow-up lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Priority Prospects */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-red-500" />
              <h3 className="text-base font-bold text-slate-900">High-Priority Prospects</h3>
            </div>
            <Link to="/leads" className="text-xs font-semibold text-blue-600 hover:underline">
              All Leads
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {highPriorityProspects.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No high priority prospects.</p>
            ) : (
              highPriorityProspects.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{lead.businessName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {lead.category || 'Business'} {lead.phone ? `• ${lead.phone}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      {lead.leadScore} pts
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{lead.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              <h3 className="text-base font-bold text-slate-900">Upcoming Follow-Ups</h3>
            </div>
            <Link to="/follow-ups" className="text-xs font-semibold text-blue-600 hover:underline">
              View Schedule
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingFollowUps.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No follow-ups scheduled.</p>
            ) : (
              upcomingFollowUps.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{lead.businessName}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.notes || 'No notes'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        lead.nextFollowUp === todayStr
                          ? 'bg-amber-100 text-amber-800 font-semibold'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {lead.nextFollowUp === todayStr ? 'Today' : lead.nextFollowUp}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{lead.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent CRM Activities */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent CRM Activity</h3>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent actions logged.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  <div className="mt-0.5 p-1 rounded-full bg-slate-100 text-slate-600">
                    <CheckCircle size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                    <p className="text-slate-500 truncate">{act.leadName}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Dashboard;
