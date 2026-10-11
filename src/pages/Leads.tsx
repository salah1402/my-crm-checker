import React, { useState, useMemo } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { Lead, SalesStatus, ALL_SALES_STATUSES, Priority } from '../types/lead';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  CheckSquare,
  Square,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { AddLeadModal } from '../components/AddLeadModal';

export const Leads: React.FC = () => {
  const { leads, bulkUpdateStatus, bulkDelete } = useLeads();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [websiteFilter, setWebsiteFilter] = useState<string>('ALL'); // ALL | HAS_WEBSITE | NO_WEBSITE
  const [ratingFilter, setRatingFilter] = useState<string>('ALL'); // ALL | HIGH_RATING (>=4.5)
  const [reviewsFilter, setReviewsFilter] = useState<string>('ALL'); // ALL | HIGH_REVIEWS (>=100)

  // Sorting state
  const [sortField, setSortField] = useState<keyof Lead>('leadScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // View mode: 'auto' | 'table' | 'cards'
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Categories list for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtering & Sorting
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = lead.businessName.toLowerCase().includes(query);
        const matchesCat = lead.category?.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.toLowerCase().includes(query);
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        const matchesAddress = lead.address?.toLowerCase().includes(query);
        const matchesNotes = lead.notes?.toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesPhone && !matchesEmail && !matchesAddress && !matchesNotes) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && lead.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'ALL' && lead.category !== categoryFilter) return false;

      // Website
      if (websiteFilter === 'NO_WEBSITE' && (lead.website && lead.website.trim().length > 0)) return false;
      if (websiteFilter === 'HAS_WEBSITE' && (!lead.website || lead.website.trim().length === 0)) return false;

      // Rating
      if (ratingFilter === 'HIGH_RATING' && (!lead.rating || lead.rating < 4.5)) return false;

      // Reviews
      if (reviewsFilter === 'HIGH_REVIEWS' && (!lead.reviewCount || lead.reviewCount < 100)) return false;

      return true;
    });
  }, [leads, searchTerm, statusFilter, priorityFilter, categoryFilter, websiteFilter, ratingFilter, reviewsFilter]);

  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLeads, sortField, sortDirection]);

  // Paginated leads
  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const currentLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, currentPage, pageSize]);

  // Sort toggle handler
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Selection handlers
  const handleSelectAllOnPage = () => {
    const newSelected = new Set(selectedIds);
    const allSelected = currentLeads.every((l) => newSelected.has(l.id));

    if (allSelected) {
      currentLeads.forEach((l) => newSelected.delete(l.id));
    } else {
      currentLeads.forEach((l) => newSelected.add(l.id));
    }
    setSelectedIds(newSelected);
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk actions
  const handleBulkStatusChange = async (newStatus: SalesStatus) => {
    if (selectedIds.size === 0) return;
    await bulkUpdateStatus(Array.from(selectedIds), newStatus);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  };

  // Export selected to CSV
  const handleExportSelectedCSV = () => {
    const toExport = leads.filter((l) => selectedIds.has(l.id));
    if (toExport.length === 0) return;

    const headers = [
      'Business Name',
      'Category',
      'Phone',
      'Email',
      'Website',
      'Address',
      'Google Maps URL',
      'Rating',
      'Review Count',
      'Website Quality',
      'Lead Score',
      'Priority',
      'Status',
      'Next Follow-Up',
      'Notes',
    ];

    const rows = toExport.map((l) => [
      `"${(l.businessName || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.website || '').replace(/"/g, '""')}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.googleMapsUrl || '').replace(/"/g, '""')}"`,
      l.rating ?? '',
      l.reviewCount ?? '',
      `"${l.websiteQuality || ''}"`,
      l.leadScore,
      `"${l.priority}"`,
      `"${l.status}"`,
      `"${l.nextFollowUp || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leadflow_selected_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeStyle = (status: SalesStatus) => {
    switch (status) {
      case 'Won':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Lost':
      case 'Not Interested':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Meeting Booked':
      case 'Proposal Sent':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Contacted':
      case 'Replied':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Add Lead */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leads Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredLeads.length} of {leads.length} local businesses
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Card / Table Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md flex items-center gap-1 transition ${
                viewMode === 'cards' || (viewMode === 'auto' && window.innerWidth < 768)
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cards view"
              aria-label="Cards view"
            >
              <LayoutGrid size={15} />
              <span className="hidden xs:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md flex items-center gap-1 transition ${
                viewMode === 'table' || (viewMode === 'auto' && window.innerWidth >= 768)
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <LayoutList size={15} />
              <span className="hidden xs:inline">Table</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition shadow-xs"
          >
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search business name, phone, email, notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              {ALL_SALES_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High Priority (60+ pts)</option>
              <option value="Medium">Medium Priority (30-59 pts)</option>
              <option value="Low">Low Priority (&lt;30 pts)</option>
            </select>
          </div>
        </div>

        {/* Second Row Filters: Category, Website, Rating, Reviews */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Website</label>
            <select
              value={websiteFilter}
              onChange={(e) => {
                setWebsiteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Websites</option>
              <option value="NO_WEBSITE">Missing Website (+40 pts)</option>
              <option value="HAS_WEBSITE">Has Website</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Google Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Ratings</option>
              <option value="HIGH_RATING">Rating &ge; 4.5</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Review Count</label>
            <select
              value={reviewsFilter}
              onChange={(e) => {
                setReviewsFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Review Counts</option>
              <option value="HIGH_REVIEWS">Reviews &ge; 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (When rows selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900 bg-blue-200 px-2 py-0.5 rounded-full">
              {selectedIds.size} selected
            </span>
            <span className="text-xs text-blue-800">Apply action to selected leads:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) handleBulkStatusChange(e.target.value as SalesStatus);
              }}
              defaultValue=""
              className="text-xs bg-white border border-blue-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium"
            >
              <option value="" disabled>
                Change Status to...
              </option>
              {ALL_SALES_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportSelectedCSV}
              className="inline-flex items-center gap-1.5 text-xs bg-white border border-blue-300 text-blue-800 px-2.5 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition"
            >
              <Download size={14} />
              Export Selected ({selectedIds.size})
            </button>

            {!confirmBulkDelete ? (
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs bg-rose-100 border border-rose-300 text-rose-800 px-2.5 py-1.5 rounded-lg font-medium hover:bg-rose-200 transition"
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBulkDelete}
                  className="text-xs bg-rose-600 text-white px-2 py-1.5 rounded-lg font-medium hover:bg-rose-700 transition"
                >
                  Confirm Delete ({selectedIds.size})
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="text-xs bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive Cards View (Mobile Default or Selected) */}
      <div className={viewMode === 'table' ? 'hidden' : viewMode === 'cards' ? 'block' : 'block md:hidden'}>
        {currentLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <p className="text-sm font-medium">No leads match your filter criteria.</p>
            <p className="text-xs mt-1">Try resetting filters or adding new leads.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentLeads.map((lead) => {
              const isSelected = selectedIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-sm transition cursor-pointer ${
                    isSelected ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200'
                  }`}
                >
                  {/* Card Top: Checkbox, Name, Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={(e) => handleToggleSelect(lead.id, e)}
                        className="mt-0.5 text-slate-400 hover:text-blue-600 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare size={17} className="text-blue-600" />
                        ) : (
                          <Square size={17} />
                        )}
                      </button>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                          {lead.businessName}
                          {lead.googleMapsUrl && (
                            <a
                              href={lead.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-blue-600 shrink-0"
                              title="Google Maps"
                            >
                              <MapPin size={13} />
                            </a>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {lead.category || 'General'}{lead.address ? ` • ${lead.address}` : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-bold border text-[10px] shrink-0 ${getPriorityStyle(
                        lead.priority
                      )}`}
                    >
                      {lead.leadScore} pts
                    </span>
                  </div>

                  {/* Badges: Status, Rating, Reviews */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(
                        lead.status
                      )}`}
                    >
                      {lead.status}
                    </span>

                    {lead.rating !== undefined && (
                      <span className="text-[11px] font-medium text-slate-700">
                        ★ {lead.rating} <span className="text-slate-400">({lead.reviewCount ?? 0})</span>
                      </span>
                    )}

                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[140px]"
                      >
                        <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium border border-amber-200">
                        No website
                      </span>
                    )}
                  </div>

                  {/* Card Bottom: Contact & Action */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3 text-slate-600">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-slate-700 hover:text-blue-600"
                        >
                          <Phone size={12} className="text-slate-400" />
                          <span>{lead.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No phone</span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLead(lead);
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs transition"
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Leads Table (Desktop default or Table Selected) */}
      <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${
        viewMode === 'cards' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden md:block'
      }`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <button
                    onClick={handleSelectAllOnPage}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {currentLeads.length > 0 &&
                    currentLeads.every((l) => selectedIds.has(l.id)) ? (
                      <CheckSquare size={16} className="text-blue-600" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('businessName')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    Business Name
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('leadScore')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    Score & Priority
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Website & Quality</th>
                <th
                  onClick={() => handleSort('rating')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    Rating & Reviews
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nextFollowUp')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-1">
                    Follow-Up
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No leads match your filter criteria.</p>
                    <p className="text-xs mt-1">Try resetting filters or adding new leads.</p>
                  </td>
                </tr>
              ) : (
                currentLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="px-3 py-3 text-center"
                        onClick={(e) => handleToggleSelect(lead.id, e)}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-blue-600 inline" />
                        ) : (
                          <Square size={16} className="text-slate-300 inline" />
                        )}
                      </td>

                      {/* Business Name & Address */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {lead.businessName}
                          {lead.googleMapsUrl && (
                            <a
                              href={lead.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-blue-600"
                              title="Google Maps"
                            >
                              <MapPin size={13} />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {lead.category || 'General'} {lead.address ? `• ${lead.address}` : ''}
                        </div>
                      </td>

                      {/* Score & Priority */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${getPriorityStyle(
                              lead.priority
                            )}`}
                          >
                            {lead.leadScore} pts • {lead.priority}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getStatusBadgeStyle(
                            lead.status
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-700 hover:text-blue-600 flex items-center gap-1"
                            >
                              <Phone size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 italic">No phone</span>
                          )}

                          {lead.email ? (
                            <a
                              href={`mailto:${lead.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-700 hover:text-blue-600 flex items-center gap-1"
                            >
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{lead.email}</span>
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* Website & Quality */}
                      <td className="px-3 py-3">
                        {lead.website ? (
                          <div>
                            <a
                              href={
                                lead.website.startsWith('http')
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                            >
                              <span className="truncate max-w-[130px]">
                                {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                              </span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                            <span className="text-[10px] text-slate-400">
                              Quality: {lead.websiteQuality || 'unassessed'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 font-medium">
                            <Sparkles size={12} />
                            <span>No website</span>
                          </div>
                        )}
                      </td>

                      {/* Rating & Reviews */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {lead.rating !== undefined ? (
                          <div>
                            <span className="font-semibold text-slate-800">★ {lead.rating}</span>
                            <span className="text-[11px] text-slate-500 ml-1">
                              ({lead.reviewCount ?? 0} reviews)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Follow-Up */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {lead.nextFollowUp ? (
                          <span className="text-[11px] font-medium text-slate-700">
                            {lead.nextFollowUp}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None set</span>
                        )}
                      </td>

                      {/* View Button */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                          }}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar (Visible for both Cards and Table) */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shadow-2xs">
        <div className="text-center sm:text-left">
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, sortedLeads.length)} of {sortedLeads.length} leads
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <AddLeadModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default Leads;
