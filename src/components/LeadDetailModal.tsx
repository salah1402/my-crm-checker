import React, { useState } from 'react';
import { Lead, SalesStatus, ALL_SALES_STATUSES, WebsiteQuality, Priority } from '../types/lead';
import { useLeads } from '../contexts/LeadsContext';
import { computeLeadScore } from '../lib/score';
import {
  X,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Trash2,
  Save,
  PlusCircle,
  History,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  lead: Lead | null;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<Props> = ({ lead, onClose }) => {
  const { update, remove, addActivity, scoringSettings } = useLeads();

  const [formData, setFormData] = useState<Lead>(lead ? { ...lead } : ({} as Lead));
  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'notes' | 'raw'>('details');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityType, setNewActivityType] = useState<
    'contact_attempt' | 'reply' | 'meeting' | 'proposal' | 'note'
  >('contact_attempt');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
    }
  }, [lead]);

  if (!lead) return null;

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const { score, priority } = computeLeadScore(next, scoringSettings);
      return {
        ...next,
        leadScore: score,
        priority,
      };
    });
    setIsSaved(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await update(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDelete = async () => {
    await remove(lead.id);
    onClose();
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) return;

    await addActivity(lead.id, newActivityTitle.trim(), newActivityType, newActivityDesc.trim());
    setNewActivityTitle('');
    setNewActivityDesc('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">{formData.businessName}</h2>
            <span
              className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium border shrink-0 ${getPriorityBadge(
                formData.priority
              )}`}
            >
              {formData.priority} ({formData.leadScore} pts)
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => handleSave()}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition"
            >
              <Save size={14} className="sm:w-4 sm:h-4" />
              <span>{isSaved ? 'Saved!' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs (Scrollable on small devices) */}
        <div className="px-4 sm:px-6 border-b border-slate-200 flex gap-4 sm:gap-6 bg-white text-xs sm:text-sm font-medium text-slate-600 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 sm:py-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Lead Information
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-2.5 sm:py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'activities'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <History size={15} />
            Activity Log ({lead.activities?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2.5 sm:py-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-2.5 sm:py-3 border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'raw'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Raw CSV Fields
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'details' && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Quick Actions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                {formData.phone ? (
                  <a
                    href={`tel:${formData.phone}`}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Phone size={16} />
                    </div>
                    <span className="truncate">{formData.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-slate-400 text-sm">
                    <Phone size={16} />
                    <span>No phone</span>
                  </div>
                )}

                {formData.email ? (
                  <a
                    href={`mailto:${formData.email}`}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Mail size={16} />
                    </div>
                    <span className="truncate">{formData.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-slate-400 text-sm">
                    <Mail size={16} />
                    <span>No email</span>
                  </div>
                )}

                {formData.website ? (
                  <a
                    href={
                      formData.website.startsWith('http')
                        ? formData.website
                        : `https://${formData.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 text-blue-600 text-sm font-medium transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <ExternalLink size={16} />
                    </div>
                    <span className="truncate">Visit Website</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-amber-600 text-sm font-medium">
                    <Sparkles size={16} />
                    <span>No website listed</span>
                  </div>
                )}
              </div>

              {/* Status and Followup section */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Pipeline Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as SalesStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {ALL_SALES_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Last Contacted Date
                  </label>
                  <input
                    type="date"
                    value={formData.lastContacted || ''}
                    onChange={(e) => handleChange('lastContacted', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextFollowUp || ''}
                    onChange={(e) => handleChange('nextFollowUp', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="bg-white p-5 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Category / Industry
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Website Quality Assessment
                  </label>
                  <select
                    value={formData.websiteQuality || 'unassessed'}
                    onChange={(e) =>
                      handleChange('websiteQuality', e.target.value as WebsiteQuality)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="unassessed">Unassessed</option>
                    <option value="none">None (No Website)</option>
                    <option value="poor">Poor Quality (+25 pts)</option>
                    <option value="outdated">Outdated Design (+25 pts)</option>
                    <option value="average">Average / Adequate</option>
                    <option value="good">Good / Modern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Google Maps URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.googleMapsUrl || ''}
                      onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                    {formData.googleMapsUrl && (
                      <a
                        href={formData.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center"
                        title="Open in Maps"
                      >
                        <MapPin size={16} />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Google Rating (0 - 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.rating ?? ''}
                    onChange={(e) =>
                      handleChange('rating', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Review Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reviewCount ?? ''}
                    onChange={(e) =>
                      handleChange(
                        'reviewCount',
                        e.target.value ? parseInt(e.target.value, 10) : undefined
                      )
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </form>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-6">
              {/* Add Activity Form */}
              <form
                onSubmit={handleAddActivity}
                className="bg-white p-4 rounded-lg border border-slate-200 space-y-3"
              >
                <h4 className="text-sm font-semibold text-slate-900">Log an Interaction</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <select
                      value={newActivityType}
                      onChange={(e) => setNewActivityType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="contact_attempt">Contact Attempt (Call/SMS)</option>
                      <option value="reply">Reply Received</option>
                      <option value="meeting">Meeting Booked</option>
                      <option value="proposal">Proposal Sent</option>
                      <option value="note">Internal Note</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Title / Summary (e.g., Called owner Marcus)"
                      value={newActivityTitle}
                      onChange={(e) => setNewActivityTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    rows={2}
                    placeholder="Details or notes from this interaction..."
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <PlusCircle size={16} />
                    Log Activity
                  </button>
                </div>
              </form>

              {/* Activity Timeline */}
              <div className="space-y-3">
                {(!lead.activities || lead.activities.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-6">No logged activities yet.</p>
                )}
                {lead.activities?.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-lg border border-slate-200 flex items-start gap-3"
                  >
                    <div className="mt-0.5 p-1.5 rounded-md bg-blue-50 text-blue-600">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-slate-600 text-xs">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Internal Notes</label>
              <textarea
                rows={8}
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add prospect research, qualification notes, or sales strategy..."
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  Save Notes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">
                Preserved Source Fields from CSV
              </h4>
              <p className="text-xs text-slate-500">
                All unmapped columns from your GeoLeadScraper CSV are safely preserved below.
              </p>
              {formData.sourceFields && Object.keys(formData.sourceFields).length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">
                          Original Header
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {Object.entries(formData.sourceFields).map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-3 py-2 font-mono text-slate-700">{k}</td>
                          <td className="px-3 py-2 text-slate-600">{String(v ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-4 italic">No custom source fields saved.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition"
              >
                <Trash2 size={16} />
                Delete Lead
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
