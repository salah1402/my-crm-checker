import React, { useState, useRef } from 'react';
import { useLeads } from '../contexts/LeadsContext';
import { Lead, SalesStatus } from '../types/lead';
import { parseRating, parseReviewCount, isGoogleMapsUrl, isWebsiteListed } from '../lib/score';
import { checkDuplicate } from '../lib/duplicates';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Check,
  X,
  FileText,
} from 'lucide-react';

interface Mapping {
  businessName: string;
  category: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  googleMapsUrl: string;
  rating: string;
  reviewCount: string;
}

export const ImportExport: React.FC = () => {
  const { leads, bulkImport } = useLeads();

  // Wizard state (Steps 1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);

  // Field mapping
  const [columnMapping, setColumnMapping] = useState<Mapping>({
    businessName: '',
    category: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    googleMapsUrl: '',
    rating: '',
    reviewCount: '',
  });

  // Duplicate mode: 'skip' | 'update' | 'create_separate'
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update' | 'create_separate'>('skip');

  // Processing & progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-mapping heuristics for GeoLeadScraper & common CSV variations
  const autoDetectColumns = (headers: string[]) => {
    const mapping: Mapping = {
      businessName: '',
      category: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      googleMapsUrl: '',
      rating: '',
      reviewCount: '',
    };

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Google Maps URL (must be matched before generic 'url')
    const mapsHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'mapsurl' || c === 'googlemapsurl' || c === 'placeurl' || c === 'mapurl' || c.includes('maps_url');
    });
    if (mapsHeader) mapping.googleMapsUrl = mapsHeader;

    // 2. Business Name
    const nameHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'title' || c === 'businessname' || c === 'companyname' || c === 'name' || c === 'business';
    });
    if (nameHeader) mapping.businessName = nameHeader;

    // 3. Category
    const catHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'categories' || c === 'category' || c === 'industry' || c === 'type';
    });
    if (catHeader) mapping.category = catHeader;

    // 4. Phone
    const phoneHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'phone' || c === 'phonenumber' || c === 'telephone' || c === 'mobile' || c === 'tel';
    });
    if (phoneHeader) mapping.phone = phoneHeader;

    // 5. Email
    const emailHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'email' || c === 'emailaddress' || c === 'mail';
    });
    if (emailHeader) mapping.email = emailHeader;

    // 6. Review Count (must NOT match review_url)
    const reviewsHeader = headers.find((h) => {
      const c = clean(h);
      return (
        (c === 'reviewcount' || c === 'reviewscount' || c === 'reviews' || c === 'numreviews' || c.includes('reviewcount')) &&
        !c.includes('url') &&
        !c.includes('link')
      );
    });
    if (reviewsHeader) mapping.reviewCount = reviewsHeader;

    // 7. Rating (must NOT match review_count)
    const ratingHeader = headers.find((h) => {
      const c = clean(h);
      return (c === 'rating' || c === 'googlerating' || c === 'stars' || c === 'score') && !c.includes('review');
    });
    if (ratingHeader) mapping.rating = ratingHeader;

    // 8. Website (must NOT match maps_url, review_url, or other links)
    const webHeader = headers.find((h) => {
      const c = clean(h);
      return (
        (c === 'website' || c === 'domain' || c === 'site' || c === 'url') &&
        !c.includes('maps') &&
        !c.includes('review') &&
        !c.includes('menu') &&
        !c.includes('booking')
      );
    });
    if (webHeader) mapping.website = webHeader;

    // 9. Address
    const addrHeader = headers.find((h) => {
      const c = clean(h);
      return c === 'address' || c === 'fulladdress' || c === 'location' || c === 'street';
    });
    if (addrHeader) mapping.address = addrHeader;

    return mapping;
  };

  // Step 1 & 2: Handle File Parse
  const handleFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);

    Papa.parse<Record<string, any>>(uploadedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'utf-8',
      complete: (results) => {
        setIsProcessing(false);
        const headers = results.meta.fields || [];
        setRawHeaders(headers);
        setParsedRows(results.data);

        // Auto Map
        const detected = autoDetectColumns(headers);
        setColumnMapping(detected);

        // Move to Preview
        setCurrentStep(3);
      },
      error: (err) => {
        setIsProcessing(false);
        alert(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Helper for duplicate normalization
  const normalize = (str?: string) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // Step 5: Validation calculations with robust duplicate detection
  const validationSummary = React.useMemo(() => {
    let valid = 0;
    let missingName = 0;
    let missingPhone = 0;
    let missingWebsite = 0;
    let newRecords = 0;
    let exactDuplicates = 0;
    const exactMatchesList: { name: string; reason: string; matchedWith: string }[] = [];
    const possibleDuplicatesList: { name: string; reason: string; matchedWith: string }[] = [];
    const invalidRows: { rowNumber: number; reason: string; data: any }[] = [];

    parsedRows.forEach((row, index) => {
      const name = (row[columnMapping.businessName] || '').toString().trim();
      const phone = (row[columnMapping.phone] || '').toString().trim();
      const rawWeb = (row[columnMapping.website] || '').toString().trim();
      const address = (row[columnMapping.address] || '').toString().trim();

      if (!name) {
        missingName++;
        invalidRows.push({ rowNumber: index + 1, reason: 'Missing Business Name', data: row });
        return;
      }

      valid++;

      if (!phone) missingPhone++;
      if (!isWebsiteListed(rawWeb)) missingWebsite++;

      const dupCheck = checkDuplicate(
        {
          businessName: name,
          phone,
          website: rawWeb,
          address,
        },
        leads
      );

      if (dupCheck.matchLevel === 'exact') {
        exactDuplicates++;
        exactMatchesList.push({
          name,
          reason: dupCheck.matchReason || 'Exact match',
          matchedWith: dupCheck.matchedLead?.businessName || '',
        });
      } else if (dupCheck.matchLevel === 'fuzzy') {
        possibleDuplicatesList.push({
          name,
          reason: dupCheck.matchReason || 'Similar business name',
          matchedWith: dupCheck.matchedLead?.businessName || '',
        });
        newRecords++;
      } else {
        newRecords++;
      }
    });

    return {
      total: parsedRows.length,
      valid,
      missingName,
      missingPhone,
      missingWebsite,
      newRecords,
      exactDuplicates,
      possibleDuplicates: possibleDuplicatesList,
      exactMatchesList,
      invalidRows,
    };
  }, [parsedRows, columnMapping, leads]);

  // Step 7: Run Import
  const executeImport = async () => {
    setIsProcessing(true);
    setCurrentStep(7);

    // Prepare leads payload preserving unmapped source fields
    const mappedLeads: Partial<Lead>[] = [];

    parsedRows.forEach((row) => {
      const name = (row[columnMapping.businessName] || '').toString().trim();
      if (!name) return; // Skip invalid records without name

      // Collect unmapped source fields
      const sourceFields: Record<string, any> = {};
      const mappedHeaderSet = new Set(Object.values(columnMapping).filter(Boolean));

      Object.entries(row).forEach(([header, val]) => {
        if (!mappedHeaderSet.has(header)) {
          sourceFields[header] = val;
        }
      });

      let rawWebsite = columnMapping.website ? String(row[columnMapping.website] || '').trim() : '';
      let googleMapsUrl = columnMapping.googleMapsUrl ? String(row[columnMapping.googleMapsUrl] || '').trim() : '';

      // If website points to Google Maps, move it to googleMapsUrl
      if (isGoogleMapsUrl(rawWebsite)) {
        if (!googleMapsUrl) googleMapsUrl = rawWebsite;
        rawWebsite = '';
      }

      const ratingVal = parseRating(columnMapping.rating ? row[columnMapping.rating] : undefined);
      const reviewsVal = parseReviewCount(columnMapping.reviewCount ? row[columnMapping.reviewCount] : undefined);

      mappedLeads.push({
        businessName: name,
        category: columnMapping.category ? String(row[columnMapping.category] || '') : 'General',
        phone: columnMapping.phone ? String(row[columnMapping.phone] || '') : '',
        email: columnMapping.email ? String(row[columnMapping.email] || '') : '',
        website: rawWebsite,
        address: columnMapping.address ? String(row[columnMapping.address] || '') : '',
        googleMapsUrl,
        rating: ratingVal,
        reviewCount: reviewsVal,
        websiteQuality: 'unassessed',
        status: 'New' as SalesStatus,
        sourceFields,
      });
    });

    const result = await bulkImport(mappedLeads, duplicateMode);
    setIsProcessing(false);
    setImportResult({
      ...result,
      total: mappedLeads.length,
    });
  };

  // Download invalid rows CSV
  const handleDownloadInvalidRows = () => {
    if (validationSummary.invalidRows.length === 0) return;
    const csvContent = Papa.unparse(validationSummary.invalidRows.map((r) => r.data));
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invalid_rows_${Date.now()}.csv`;
    link.click();
  };

  // Full CRM CSV Export
  const handleExportAllToCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export.');
      return;
    }

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
      'Last Contacted',
      'Next Follow-Up',
      'Notes',
      'Created At',
    ];

    const rows = leads.map((l) => [
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
      `"${l.lastContacted || ''}"`,
      `"${l.nextFollowUp || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      `"${l.createdAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leadflow_crm_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFile(null);
    setRawHeaders([]);
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Import &amp; Export Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Import GeoLeadScraper CSV files with automatic column mapping, duplicate protection, and
            error handling.
          </p>
        </div>
        <div>
          <button
            onClick={handleExportAllToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-xs"
          >
            <Download size={16} />
            Export All Leads to CSV ({leads.length})
          </button>
        </div>
      </div>

      {/* Wizard Steps Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between overflow-x-auto text-xs font-semibold">
          {[
            { step: 1, title: 'Upload' },
            { step: 3, title: 'Preview' },
            { step: 4, title: 'Map Fields' },
            { step: 5, title: 'Validate' },
            { step: 6, title: 'Duplicates' },
            { step: 7, title: 'Results' },
          ].map((item, idx, arr) => (
            <React.Fragment key={item.step}>
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded-md shrink-0 ${
                  currentStep === item.step
                    ? 'text-blue-600 bg-blue-50'
                    : currentStep > item.step
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentStep === item.step
                      ? 'bg-blue-600 text-white'
                      : currentStep > item.step
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {currentStep > item.step ? '✓' : idx + 1}
                </span>
                <span>{item.title}</span>
              </div>
              {idx < arr.length - 1 && <div className="h-px w-6 bg-slate-200 shrink-0 mx-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: Upload CSV */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-blue-50/20"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Upload size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Drag &amp; Drop GeoLeadScraper CSV file here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Supports standard UTF-8 CSV exports with quotes, commas, and arbitrary column names.
            </p>
            <button
              type="button"
              className="mt-4 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50"
            >
              Browse Computer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* STEP 3: Preview Records */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">File Preview &amp; Verification</h3>
              <p className="text-xs text-slate-500">
                Found {parsedRows.length} rows and {rawHeaders.length} columns in {file?.name}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetWizard}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Choose Different File
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Next: Map Fields <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="px-3 py-2 w-12 text-slate-400">#</th>
                  {rawHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    {rawHeaders.map((h) => (
                      <td key={h} className="px-3 py-2 text-slate-600 max-w-xs truncate">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 italic">Showing first 10 rows of {parsedRows.length} total.</p>
        </div>
      )}

      {/* STEP 4: Column Mapping */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Map Columns to CRM Fields</h3>
              <p className="text-xs text-slate-500">
                Headers were auto-detected. Adjust any dropdown to manually override fields.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                disabled={!columnMapping.businessName}
                onClick={() => setCurrentStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Validate Records <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {!columnMapping.businessName && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              Please map the <strong>Business Name</strong> column before proceeding.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { field: 'businessName', label: 'Business Name', req: true },
              { field: 'category', label: 'Category / Niche', req: false },
              { field: 'phone', label: 'Phone Number', req: false },
              { field: 'email', label: 'Email Address', req: false },
              { field: 'website', label: 'Website URL', req: false },
              { field: 'address', label: 'Physical Address', req: false },
              { field: 'googleMapsUrl', label: 'Google Maps Link', req: false },
              { field: 'rating', label: 'Google Rating (e.g. 4.8)', req: false },
              { field: 'reviewCount', label: 'Review Count (e.g. 150)', req: false },
            ].map(({ field, label, req }) => (
              <div key={field} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    {label} {req && <span className="text-red-500">*</span>}
                  </label>
                  {columnMapping[field as keyof Mapping] ? (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check size={12} /> Mapped
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Unmapped</span>
                  )}
                </div>
                <select
                  value={columnMapping[field as keyof Mapping]}
                  onChange={(e) =>
                    setColumnMapping({ ...columnMapping, [field]: e.target.value })
                  }
                  className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Do Not Map / None --</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p>
              <strong>Data safety guarantee:</strong> Any CSV column not selected above will NOT be
              discarded. They are automatically saved into a structured <code>sourceFields</code> object
              on each lead.
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: Validation Summary */}
      {currentStep === 5 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Validation &amp; Quality Check</h3>
              <p className="text-xs text-slate-500">
                Review lead completeness and duplicate breakdown before writing to database.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={resetWizard}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
              >
                Next: Duplicate Handling <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
              <span className="text-xs font-semibold">New Records</span>
              <p className="text-2xl font-bold mt-1">{validationSummary.newRecords}</p>
              <span className="text-[10px] text-emerald-700">Distinct businesses</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              <span className="text-xs font-semibold">Exact Duplicates</span>
              <p className="text-2xl font-bold mt-1">{validationSummary.exactDuplicates}</p>
              <span className="text-[10px] text-amber-700">Phone / Web / Addr match</span>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900">
              <span className="text-xs font-semibold">Possible Duplicates</span>
              <p className="text-2xl font-bold mt-1">{validationSummary.possibleDuplicates.length}</p>
              <span className="text-[10px] text-indigo-700">Fuzzy name warnings</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              <span className="text-xs font-semibold">Invalid (No Name)</span>
              <p className="text-2xl font-bold mt-1">{validationSummary.missingName}</p>
              <span className="text-[10px] text-rose-700">Cannot be imported</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-between">
              <span>Missing Website (+40 pts opportunity)</span>
              <span className="font-bold text-slate-900 text-sm">{validationSummary.missingWebsite}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center justify-between">
              <span>Missing Phone Number</span>
              <span className="font-bold text-slate-900 text-sm">{validationSummary.missingPhone}</span>
            </div>
          </div>

          {validationSummary.exactDuplicates > 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                {validationSummary.exactDuplicates} exact duplicates detected with current CRM records.
              </p>
              <p className="text-amber-800 text-[11px]">
                Matched against existing leads by normalized phone number, website, or business name and address. You will choose how to handle these in the next step.
              </p>
            </div>
          )}

          {validationSummary.possibleDuplicates.length > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info size={14} className="text-indigo-600 shrink-0" />
                {validationSummary.possibleDuplicates.length} potential name matches (warning only).
              </p>
              <p className="text-indigo-800 text-[11px]">
                These businesses have names similar to existing leads but different contact info. By design, they are treated as distinct records and will not be merged automatically.
              </p>
            </div>
          )}

          {validationSummary.invalidRows.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-900">
              <div>
                <p className="font-bold">
                  {validationSummary.invalidRows.length} rows are missing a business name and cannot be imported.
                </p>
                <p className="text-rose-700 mt-0.5">
                  You can download the invalid rows as a CSV to correct them.
                </p>
              </div>
              <button
                onClick={handleDownloadInvalidRows}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition"
              >
                Download Invalid Rows
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: Duplicate Handling Configuration */}
      {currentStep === 6 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Choose Duplicate Handling Strategy</h3>
              <p className="text-xs text-slate-500">
                How should LeadFlow handle the {validationSummary.exactDuplicates} records that already exist in your database?
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={resetWizard}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={executeImport}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-xs"
              >
                {isProcessing ? 'Importing...' : 'Start Import Now'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                mode: 'skip',
                title: 'Skip Duplicates (Recommended)',
                desc: `Leaves your existing leads intact without modification. The ${validationSummary.exactDuplicates} duplicate records in the CSV are ignored. Only ${validationSummary.newRecords} new records will be added (zero increase in record count for existing leads).`,
                badge: 'Safe & Unchanged',
              },
              {
                mode: 'update',
                title: 'Update Existing Records',
                desc: `Merges fresh CSV data (phone, email, category, rating, reviews, raw CSV fields) into the matching ${validationSummary.exactDuplicates} leads. Existing sales status, notes, activity history, and scheduled follow-up dates are NEVER overwritten.`,
                badge: 'Enrich & Protect',
              },
              {
                mode: 'create_separate',
                title: 'Import as Separate Entries',
                desc: `Creates a brand new lead entry for every valid row regardless of existing matching names, numbers, or addresses. Imports all ${validationSummary.valid} rows.`,
                badge: `All ${validationSummary.valid} Rows`,
              },
            ].map((option) => (
              <label
                key={option.mode}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                  duplicateMode === option.mode
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="duplicateMode"
                  value={option.mode}
                  checked={duplicateMode === option.mode}
                  onChange={() => setDuplicateMode(option.mode as any)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{option.title}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>Data Preservation Guarantee:</strong> Cancelling an import or choosing Skip Duplicates leaves your database untouched. Updating leads preserves all custom notes, current pipeline stages, and follow-up schedules.
            </p>
          </div>
        </div>
      )}

      {/* STEP 7: Import Progress & Final Summary */}
      {currentStep === 7 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-6">
          {isProcessing ? (
            <div className="py-12 space-y-4">
              <RefreshCw size={36} className="animate-spin text-blue-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Processing and Saving Leads...</h3>
              <p className="text-xs text-slate-500">Writing records to local IndexedDB storage.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Import Complete!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your leads have been parsed, duplicate-checked, scored, and saved to IndexedDB.
                </p>
              </div>

              {importResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500">Total Rows</span>
                    <p className="text-xl font-bold text-slate-900 mt-0.5">
                      {importResult.total}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">New Leads</span>
                    <p className="text-xl font-bold text-emerald-600 mt-0.5">
                      {importResult.imported}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Updated</span>
                    <p className="text-xl font-bold text-blue-600 mt-0.5">
                      {importResult.updated}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Skipped (Dups)</span>
                    <p className="text-xl font-bold text-amber-600 mt-0.5">
                      {importResult.skipped}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Existing sales statuses, notes, and activity histories were fully preserved during this operation.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={resetWizard}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Import Another CSV
                </button>
                <a
                  href="/leads"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  View Leads in Directory
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportExport;
