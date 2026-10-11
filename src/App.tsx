import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Clock,
  FileUp,
  Settings as SettingsIcon,
  Search,
  Plus,
  Menu,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import FollowUps from './pages/FollowUps';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import { LeadsProvider, useLeads } from './contexts/LeadsContext';
import { LeadDetailModal } from './components/LeadDetailModal';
import { AddLeadModal } from './components/AddLeadModal';
import { Lead } from './types/lead';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { leads } = useLeads();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: Users, badge: leads.length },
    { to: '/pipeline', label: 'Pipeline', icon: Kanban },
    {
      to: '/follow-ups',
      label: 'Follow‑ups',
      icon: Clock,
      badge: leads.filter((l) => l.nextFollowUp).length,
    },
    { to: '/import-export', label: 'Import / Export', icon: FileUp },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case '/':
        return 'Executive Dashboard';
      case '/leads':
        return 'Leads Directory';
      case '/pipeline':
        return 'Sales Pipeline';
      case '/follow-ups':
        return 'Follow-Up Tasks';
      case '/import-export':
        return 'Import & Export';
      case '/settings':
        return 'Settings & Scoring';
      default:
        return 'LeadFlow CRM';
    }
  }, [location.pathname]);

  // Global search matching results
  const searchResults = useMemo(() => {
    if (!globalSearch.trim() || globalSearch.trim().length < 2) return [];
    const q = globalSearch.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          l.category?.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.address?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [leads, globalSearch]);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Branding */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                LF
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight">LeadFlow</span>
                <span className="text-[10px] font-semibold text-blue-600 block leading-none">
                  LOCAL CRM
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 md:hidden text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
              <span>GeoLeadScraper Sync</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-500">
              Offline IndexedDB ready. No paid API keys required.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {pageTitle}
              </h2>
            </div>
          </div>

          {/* Center Search & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Global Search Bar */}
            <div className="relative w-32 xs:w-44 sm:w-64 md:w-72">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find lead..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full pl-7.5 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />

              {/* Global search dropdown */}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute right-0 sm:left-0 sm:right-0 top-9 mt-1 w-64 sm:w-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs">
                  <div className="p-2 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.map((r) => (
                    <div
                      key={r.id}
                      onMouseDown={() => {
                        setSelectedLead(r);
                        setGlobalSearch('');
                      }}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate">{r.businessName}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {r.category || 'Business'} {r.phone ? `• ${r.phone}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 shrink-0">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Add Lead"
              className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition shadow-2xs shrink-0"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Lead</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto flex flex-col justify-between bg-slate-50">
          <div className="p-4 sm:p-6 flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/follow-ups" element={<FollowUps />} />
              <Route path="/import-export" element={<ImportExport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Premium Developer Attribution Footer */}
          <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xs px-4 sm:px-6 py-3.5 transition-colors">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
              <a
                href="https://salah-portfolio-pink.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                title="Portfolio of Salah — Software Developer & Creative Technologist"
                className="group inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100/80 text-slate-500 hover:text-slate-900 transition-all duration-200"
              >
                <img
                  src="/s-symbol.webp"
                  alt="Salah Logo"
                  width="15"
                  height="17"
                  className="h-4 w-auto object-contain shrink-0 transition-transform duration-200 group-hover:scale-110 drop-shadow-2xs"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex items-center flex-wrap justify-center sm:justify-start gap-1.5 font-mono text-[11px] tracking-wider uppercase leading-none">
                  <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    SALAH
                  </span>
                  <span className="text-slate-300 select-none" aria-hidden="true">·</span>
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                    SOFTWARE DEVELOPER
                  </span>
                  <span className="text-slate-300 select-none" aria-hidden="true">·</span>
                  <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                    CREATIVE TECHNOLOGIST
                  </span>
                  <ExternalLink
                    size={11}
                    className="text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-0.5"
                    aria-hidden="true"
                  />
                </div>
              </a>

              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span>LeadFlow CRM v1.0</span>
                <span className="text-slate-300 select-none" aria-hidden="true">·</span>
                <span>Offline-First</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Global Modals */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={(id) => {
          const l = leads.find((x) => x.id === id);
          if (l) setSelectedLead(l);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LeadsProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </LeadsProvider>
  );
}
