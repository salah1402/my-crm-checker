import React, { useState } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { ScoringSettings, DEFAULT_SCORING_SETTINGS } from '../types/lead';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Database,
  Sparkles,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const {
    leads,
    scoringSettings,
    updateScoringSettings,
    clearDatabase,
    loadSampleData,
    bulkImport,
  } = useLeads();

  const [settings, setSettings] = useState<ScoringSettings>({ ...scoringSettings });
  const [isSaved, setIsSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setSettings(scoringSettings);
  }, [scoringSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateScoringSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SCORING_SETTINGS);
  };

  // Full JSON Database Backup Export
  const handleExportBackup = () => {
    const backup = {
      app: 'LeadFlow CRM',
      exportedAt: new Date().toISOString(),
      leadCount: leads.length,
      scoringSettings,
      leads,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leadflow_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Restore JSON Database Backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.leads || !Array.isArray(json.leads)) {
          alert('Invalid backup file format: leads array missing.');
          return;
        }

        if (json.scoringSettings) {
          await updateScoringSettings(json.scoringSettings);
          setSettings(json.scoringSettings);
        }

        const res = await bulkImport(json.leads, 'update');
        setRestoreMessage(
          `Successfully restored ${res.imported} new and ${res.updated} existing records!`
        );
        setTimeout(() => setRestoreMessage(null), 4000);
      } catch (err: any) {
        alert(`Failed to restore backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure lead scoring algorithms, data backups, and database utilities.
        </p>
      </div>

      {/* Configurable Lead Scoring */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders size={20} className="text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Lead Scoring Engine</h3>
              <p className="text-xs text-slate-500">
                Transparent rule weights used to calculate the 0–100 lead score.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <RotateCcw size={12} />
            Reset Defaults
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No Website Points
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Bonus points awarded when a prospect does not have any website listed.
              </p>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.noWebsitePoints}
                onChange={(e) =>
                  setSettings({ ...settings, noWebsitePoints: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Poor / Outdated Website Points
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Points awarded when website quality is assessed as poor or outdated.
              </p>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.poorWebsitePoints}
                onChange={(e) =>
                  setSettings({ ...settings, poorWebsitePoints: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                High Review Count Weight
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <span className="text-[10px] text-slate-500">Points</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.highReviewsPoints}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        highReviewsPoints: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Threshold (Reviews &ge;)</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.highReviewsThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        highReviewsThreshold: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                High Google Rating Weight
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <span className="text-[10px] text-slate-500">Points</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.highRatingPoints}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        highRatingPoints: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Threshold (Rating &ge;)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={settings.highRatingThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        highRatingThreshold: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Priority Thresholds */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                High Priority Threshold (Score &ge;)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.highPriorityThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    highPriorityThreshold: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Medium Priority Threshold (Score &ge;)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.mediumPriorityThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    mediumPriorityThreshold: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Saving recalculates the score and priority for all stored leads immediately.
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs"
            >
              <Save size={16} />
              {isSaved ? 'Settings Saved & Recalculated!' : 'Save & Recalculate Leads'}
            </button>
          </div>
        </form>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <Database size={20} className="text-emerald-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Backup &amp; Restore</h3>
            <p className="text-xs text-slate-500">
              Download complete local JSON database backups or restore from an earlier export.
            </p>
          </div>
        </div>

        {restoreMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} />
            {restoreMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Export Full JSON Backup</h4>
            <p className="text-[11px] text-slate-500">
              Contains all leads, activities, notes, custom source fields, and scoring rules.
            </p>
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
            >
              <Download size={14} />
              Download Backup ({leads.length} leads)
            </button>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Restore from Backup</h4>
            <p className="text-[11px] text-slate-500">
              Import a previously exported LeadFlow JSON file to recover records.
            </p>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer transition">
              <Upload size={14} />
              Select Backup JSON
              <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Database Management & Danger Zone */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Database Tools</h3>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Reload Sample Demo Data</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reset database with realistic local businesses for testing and evaluation.
            </p>
          </div>
          <button
            onClick={loadSampleData}
            className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
          >
            Load Sample Data
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-rose-50/50 rounded-xl border border-rose-200">
          <div>
            <h4 className="text-xs font-bold text-rose-900">Clear All CRM Records</h4>
            <p className="text-[11px] text-rose-600 mt-0.5">
              Permanently delete all leads and activity logs from local IndexedDB storage.
            </p>
          </div>
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              Clear Database
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-800 font-bold">Are you sure?</span>
              <button
                onClick={async () => {
                  await clearDatabase();
                  setConfirmClear(false);
                }}
                className="px-3 py-1 bg-rose-700 text-white rounded text-xs font-bold"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
