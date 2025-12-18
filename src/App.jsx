import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  ExternalLink, Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen, Upload, Download, Zap, Database, Brain, Activity,
  Plus, Check, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

// ============================================================================
// CONFIGURATION - Your endpoints remain unchanged
// ============================================================================
const CONFIG = {
  // Your n8n webhook URLs (KEEP THESE - they're working)
  METRICS_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/metrics-compare',
  GUIDANCE_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/guidance-compare',
  CHAT_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/chat',
  
  // Ingestion Pipeline Form URL (update with your actual form URL)
  INGESTION_FORM_URL: 'https://juhi.app.n8n.cloud/form/cc79e7b5-c57c-41eb-85a4-98ed363ea3bd',
  
  // Supabase Storage URL for PDFs
  SUPABASE_STORAGE_URL: 'https://xogwcwqqqtavklturbrt.supabase.co/storage/v1/object/public/earnings-documents/',
  
  // Sectors and their tickers
  SECTORS: {
    'Healthcare': ['MAXHEALTH', 'APOLLOHOSP', 'FORTIS', 'ASTERDM', 'HCG', 'NH', 'JLHL', 'KIMS', 'RAINBOW'],
    'Financial Services': [],
    'Telecom': [],
    'Industrials': [],
    'Auto': [],
    'IT Services': [],
    'QSR': [],
  },
  
  // Company display names
  COMPANY_NAMES: {
    'MAXHEALTH': 'Max Healthcare Institute Ltd',
    'APOLLOHOSP': 'Apollo Hospitals Enterprise Ltd',
    'FORTIS': 'Fortis Healthcare Ltd',
    'ASTERDM': 'Aster DM Healthcare Ltd',
    'HCG': 'Healthcare Global Enterprises Ltd',
    'NH': 'Narayana Hrudayalaya Ltd',
    'JLHL': 'Jupiter Life Line Hospitals Ltd',
    'KIMS': 'Krishna Institute of Medical Sciences Ltd',
    'RAINBOW': 'Rainbow Children\'s Medicare Ltd',
  },
  
  // Metrics to exclude from display (Issue #3)
  EXCLUDED_METRICS: ['Revenue', 'EBITDA', 'Gross Revenue', 'Net Revenue'],
  
  // Display quarters
  DISPLAY_QUARTERS: ['FY26-Q2', 'FY26-Q1', 'FY25-Q4', 'FY25-Q3'],
};

// ============================================================================
// THEME COLORS - Improved contrast (Issue #10)
// ============================================================================
const THEME = {
  bg: {
    primary: '#0A192F',      // Deep Navy - main background
    secondary: '#112240',    // Slightly lighter - cards
    tertiary: '#1E3A5F',     // Even lighter - hover states
    input: '#0D1F3C',        // Input backgrounds
  },
  text: {
    primary: '#E6F1FF',      // Main text - bright
    secondary: '#A8B2D1',    // Muted text - IMPROVED CONTRAST
    tertiary: '#697A9B',     // Dimmer text - IMPROVED CONTRAST
    muted: '#5A6A8A',        // Very muted - IMPROVED CONTRAST
  },
  accent: {
    primary: '#6C63FF',      // Electric Violet - primary actions
    secondary: '#4D7CFF',    // Electric Blue - secondary
    highlight: '#00FFC6',    // Neon Mint - highlights/positive
    cyan: '#00E5FF',         // Cyan - accents
  },
  semantic: {
    positive: '#00FFC6',     // Mint green
    negative: '#FF6B7A',     // Softer coral - IMPROVED VISIBILITY
    warning: '#FFD93D',      // Warm yellow
    info: '#4D7CFF',         // Blue
  },
  border: '#1E3A5F',
  glow: {
    primary: '0 0 20px rgba(108, 99, 255, 0.3)',
    accent: '0 0 20px rgba(0, 255, 198, 0.2)',
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getConfidenceBadge = (level) => {
  const styles = {
    COMMITTED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    EXPECTED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    PLANNED: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    ON_TRACK: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    ACHIEVED: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
    DEFAULT: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' }
  };
  return styles[level?.toUpperCase()] || styles.DEFAULT;
};

const formatValue = (value, currency, unit) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#5A6A8A]">—</span>;
  }
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const prefix = currency === 'INR' ? '₹' : '';
  const suffix = unit ? ` ${unit}` : '';
  const formattedValue = numValue.toLocaleString('en-IN');
  return (
    <span className="font-medium text-[#E6F1FF]">
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

// Calculate QoQ change
const calculateChange = (current, previous) => {
  if (!current || !previous) return null;
  const curr = parseFloat(String(current).replace(/,/g, ''));
  const prev = parseFloat(String(previous).replace(/,/g, ''));
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
};

// Export to CSV
const exportToCSV = (data, filename) => {
  if (!data || !data.metrics || data.metrics.length === 0) return;
  
  const quarters = data.quarters || [];
  const headers = ['Metric', 'Unit', 'Currency', ...quarters];
  
  const rows = data.metrics.map(metric => {
    const row = [
      metric.metric_name,
      metric.unit || '',
      metric.currency || '',
      ...quarters.map(q => metric[q]?.value || '')
    ];
    return row.join(',');
  });
  
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_metrics.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Filter out excluded metrics (Issue #3)
const filterMetrics = (metrics) => {
  if (!metrics) return [];
  return metrics.filter(metric => {
    const metricName = metric.metric_name?.toLowerCase() || '';
    return !CONFIG.EXCLUDED_METRICS.some(excluded => 
      metricName.includes(excluded.toLowerCase())
    );
  });
};

// ============================================================================
// PDF VIEWER PANEL - Improved transitions (Issue #7)
// ============================================================================
const PDFViewerPanel = ({ isOpen, onClose, pdfUrl, pageNumber, quote, sourceFile }) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, pdfUrl]);

  const copyQuote = () => {
    if (quote) {
      navigator.clipboard.writeText(quote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop with smooth transition */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose} 
      />
      
      {/* Panel with slide-in transition */}
      <div 
        className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-[#0A192F] shadow-2xl z-50 flex flex-col border-l border-[#1E3A5F] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F] bg-[#112240]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6C63FF] rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#E6F1FF]">{sourceFile || 'Document'}</h3>
              <p className="text-sm text-[#A8B2D1]">Page {pageNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1E3A5F] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#A8B2D1]" />
          </button>
        </div>

        {quote && (
          <div className="p-4 bg-gradient-to-r from-[#6C63FF]/10 to-[#00FFC6]/10 border-b border-[#1E3A5F]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📌</span>
              <p className="text-sm font-semibold text-[#00FFC6]">Referenced Quote</p>
            </div>
            <p className="text-sm text-[#E6F1FF] bg-[#0A192F]/50 p-3 rounded-lg border border-[#1E3A5F] italic leading-relaxed">
              "{quote}"
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-[#A8B2D1]">
                💡 Press <kbd className="px-1.5 py-0.5 bg-[#1E3A5F] rounded font-mono text-[#00FFC6]">Ctrl+F</kbd> to search
              </span>
              <button onClick={copyQuote} className="text-[#6C63FF] hover:text-[#00FFC6] transition-colors">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-[#0D1F3C] relative">
          {/* Loading overlay */}
          {isLoading && pdfUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D1F3C] z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
                <p className="text-[#A8B2D1] text-sm">Loading document...</p>
              </div>
            </div>
          )}
          
          {pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#page=${pageNumber}`} 
              className="w-full h-full border-0" 
              title="PDF Viewer"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#A8B2D1] p-8">
              <BookOpen className="w-16 h-16 mb-4 text-[#1E3A5F]" />
              <p className="text-lg font-medium text-[#E6F1FF]">PDF Not Available</p>
              <p className="text-sm mt-2">Configure Supabase Storage to view source documents</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ============================================================================
// CITATION LINK - Fixed for Q&A section (Issue #8)
// ============================================================================
const CitationLink = ({ sourceFile, pageNumber, quote, onOpenPDF }) => {
  const handleClick = () => {
    const pdfUrl = sourceFile ? `${CONFIG.SUPABASE_STORAGE_URL}${sourceFile}` : null;
    console.log('Opening PDF:', { sourceFile, pageNumber, quote, pdfUrl }); // Debug log
    onOpenPDF({
      sourceFile,
      pageNumber: pageNumber || 1,
      quote,
      pdfUrl
    });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded transition-colors text-[#A8B2D1] hover:text-[#00FFC6] border border-[#1E3A5F] hover:border-[#6C63FF]/50"
    >
      <FileText className="w-3 h-3" />
      <span>p.{pageNumber || '?'}</span>
    </button>
  );
};

// ============================================================================
// FILE UPLOAD COMPONENT - Made more compact (Issue #4)
// ============================================================================
const FileUploadSection = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('Upload_Here', file);

      const response = await fetch(CONFIG.INGESTION_FORM_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus({ type: 'success', message: `${file.name} uploaded!` });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: `Failed: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Upload className="w-4 h-4 text-[#6C63FF]" />
        <h3 className="text-sm font-semibold text-[#E6F1FF]">Ingest Document</h3>
      </div>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-[#00FFC6] bg-[#00FFC6]/10' 
            : 'border-[#1E3A5F] hover:border-[#6C63FF] hover:bg-[#6C63FF]/5'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6C63FF]" />
            <p className="text-xs text-[#A8B2D1]">Processing...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className={`w-5 h-5 ${isDragging ? 'text-[#00FFC6]' : 'text-[#697A9B]'}`} />
            <p className="text-xs text-[#A8B2D1]">
              Drop PDF or <span className="text-[#6C63FF]">browse</span>
            </p>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${
          uploadStatus.type === 'success' 
            ? 'bg-[#00FFC6]/10 text-[#00FFC6]' 
            : 'bg-[#FF6B7A]/10 text-[#FF6B7A]'
        }`}>
          {uploadStatus.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          <span className="truncate">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// METRICS CARD - With consistent header styling (Issue #2)
// ============================================================================
const MetricsCard = ({ data, isLoading, error, quarters, onOpenPDF, onExport, ticker }) => {
  // Filter metrics (Issue #3)
  const filteredMetrics = data?.metrics ? filterMetrics(data.metrics) : [];
  
  if (isLoading) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6 h-full">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <span className="ml-2 text-[#A8B2D1]">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#FF6B7A]/30 p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full text-[#FF6B7A]">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-medium">Error loading metrics</p>
          <p className="text-sm text-[#A8B2D1] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || filteredMetrics.length === 0) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full text-[#A8B2D1]">
          <TrendingUp className="w-10 h-10 mb-2 text-[#1E3A5F]" />
          <p className="font-medium">No metrics data</p>
          <p className="text-sm mt-1">Ingest documents to see metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#1E3A5F] shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6C63FF]" />
          <h3 className="font-semibold text-[#E6F1FF]">Key Metrics</h3>
        </div>
        <button
          onClick={() => onExport(data, ticker)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded-lg transition-colors text-[#A8B2D1] hover:text-[#00FFC6]"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            {/* Issue #2: Consistent header styling with visual distinction */}
            <tr className="bg-gradient-to-r from-[#1E3A5F] to-[#162D50]">
              <th className="text-left py-3 px-4 text-sm font-bold text-[#E6F1FF] sticky left-0 bg-gradient-to-r from-[#1E3A5F] to-[#1E3A5F] z-20 border-b border-[#2D4A6F]">
                Metric
              </th>
              {quarters.map((quarter) => (
                <th key={quarter} className="text-right py-3 px-4 text-sm font-bold text-[#E6F1FF] min-w-28 border-b border-[#2D4A6F]">
                  {quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.map((metric, idx) => (
              <tr key={metric.metric_name} className="border-t border-[#1E3A5F]/50 hover:bg-[#1E3A5F]/20 transition-colors">
                <td className="py-2.5 px-4 sticky left-0 bg-[#112240] z-10">
                  <div className="font-medium text-[#E6F1FF] text-sm">{metric.metric_name}</div>
                  {(metric.unit || metric.currency) && (
                    <div className="text-xs text-[#697A9B]">
                      {metric.currency && metric.currency !== '' ? `${metric.currency} ` : ''}{metric.unit}
                    </div>
                  )}
                </td>
                {quarters.map((quarter, qIdx) => {
                  const quarterData = metric[quarter];
                  const prevQuarter = quarters[qIdx + 1];
                  const prevData = prevQuarter ? metric[prevQuarter] : null;
                  const change = calculateChange(quarterData?.value, prevData?.value);
                  
                  return (
                    <td key={quarter} className="text-right py-2.5 px-4">
                      <div className="flex flex-col items-end gap-0.5">
                        {formatValue(quarterData?.value, metric.currency, '')}
                        {change !== null && qIdx === 0 && (
                          <span className={`text-xs flex items-center gap-0.5 ${
                            parseFloat(change) > 0 ? 'text-[#00FFC6]' : parseFloat(change) < 0 ? 'text-[#FF6B7A]' : 'text-[#A8B2D1]'
                          }`}>
                            {parseFloat(change) > 0 ? <ArrowUpRight className="w-3 h-3" /> : 
                             parseFloat(change) < 0 ? <ArrowDownRight className="w-3 h-3" /> : 
                             <Minus className="w-3 h-3" />}
                            {Math.abs(parseFloat(change))}%
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// GUIDANCE CARD - With quarters header (Issue #9)
// ============================================================================
const GuidanceCard = ({ data, isLoading, error, quarters, onOpenPDF }) => {
  const [expandedThemes, setExpandedThemes] = useState({});

  useEffect(() => {
    if (data?.themes) {
      const initial = {};
      data.themes.forEach((theme, idx) => {
        initial[theme.theme] = idx === 0;
      });
      setExpandedThemes(initial);
    }
  }, [data]);

  const toggleTheme = (theme) => {
    setExpandedThemes(prev => ({ ...prev, [theme]: !prev[theme] }));
  };

  const themeColors = {
    EXPANSION: { icon: '🏗️', color: '#00FFC6' },
    FINANCIAL: { icon: '💰', color: '#6C63FF' },
    OPERATIONAL: { icon: '⚙️', color: '#FF9F43' },
    CAPEX: { icon: '📊', color: '#A55EEA' },
    REGULATORY: { icon: '📋', color: '#FF6B7A' },
    DIGITAL: { icon: '💻', color: '#00E5FF' },
    OTHER: { icon: '📌', color: '#A8B2D1' }
  };

  if (isLoading) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6 h-full">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <span className="ml-2 text-[#A8B2D1]">Loading guidance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#FF6B7A]/30 p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full text-[#FF6B7A]">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-medium">Error loading guidance</p>
          <p className="text-sm text-[#A8B2D1] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.themes || data.themes.length === 0) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6 h-full">
        <div className="flex flex-col items-center justify-center h-full text-[#A8B2D1]">
          <Calendar className="w-10 h-10 mb-2 text-[#1E3A5F]" />
          <p className="font-medium">No guidance data</p>
          <p className="text-sm mt-1">Ingest transcripts to see guidance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden h-full flex flex-col">
      {/* Header with title */}
      <div className="flex items-center gap-2 p-3 border-b border-[#1E3A5F] shrink-0">
        <Calendar className="w-5 h-5 text-[#6C63FF]" />
        <h3 className="font-semibold text-[#E6F1FF]">Forward Guidance</h3>
      </div>

      {/* Issue #9: Quarters header row */}
      <div className="grid grid-cols-[1fr_repeat(4,minmax(100px,1fr))] bg-gradient-to-r from-[#1E3A5F] to-[#162D50] border-b border-[#2D4A6F] shrink-0">
        <div className="py-2 px-3 text-sm font-bold text-[#E6F1FF]">Theme</div>
        {quarters.map((quarter) => (
          <div key={quarter} className="py-2 px-2 text-sm font-bold text-[#E6F1FF] text-center">
            {quarter}
          </div>
        ))}
      </div>

      <div className="overflow-y-auto flex-1">
        {data.themes.map((themeGroup) => {
          const theme = themeColors[themeGroup.theme] || themeColors.OTHER;
          return (
            <div key={themeGroup.theme} className="border-b border-[#1E3A5F]/50 last:border-0">
              <button
                onClick={() => toggleTheme(themeGroup.theme)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-[#1E3A5F]/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{theme.icon}</span>
                  <span className="font-medium text-[#E6F1FF] text-sm">{themeGroup.theme}</span>
                  <span className="text-xs text-[#697A9B] bg-[#0A192F] px-2 py-0.5 rounded-full">
                    {themeGroup.items?.length || 0}
                  </span>
                </div>
                {expandedThemes[themeGroup.theme] ? (
                  <ChevronDown className="w-4 h-4 text-[#A8B2D1]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#A8B2D1]" />
                )}
              </button>
              
              {expandedThemes[themeGroup.theme] && (
                <div className="px-2.5 pb-2.5">
                  {themeGroup.items?.map((item, idx) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      <div className="text-xs font-medium text-[#A8B2D1] mb-1.5 flex items-center gap-1 pl-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.color }} />
                        {item.subtheme}
                      </div>
                      {/* Issue #9: Grid layout matching header columns, removed individual quarter labels */}
                      <div className="grid grid-cols-[1fr_repeat(4,minmax(100px,1fr))] gap-1">
                        <div></div> {/* Empty cell to align with theme column */}
                        {quarters.map((quarter) => {
                          const guidanceList = item[quarter];
                          return (
                            <div key={quarter} className="bg-[#0A192F] rounded-lg p-2 min-h-[50px]">
                              {guidanceList && Array.isArray(guidanceList) && guidanceList.length > 0 ? (
                                guidanceList.map((g, gIdx) => (
                                  <div key={gIdx} className="text-xs text-[#E6F1FF] mb-2 last:mb-0">
                                    <p className="line-clamp-3 mb-1">{g.guidance_text}</p>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {g.confidence_level && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                          getConfidenceBadge(g.confidence_level).bg
                                        } ${getConfidenceBadge(g.confidence_level).text} ${
                                          getConfidenceBadge(g.confidence_level).border
                                        }`}>
                                          {g.confidence_level}
                                        </span>
                                      )}
                                      {(g.source_file || g.source_filename) && (
                                        <CitationLink 
                                          sourceFile={g.source_file || g.source_filename}
                                          pageNumber={g.page_number || g.guidance_page_number}
                                          quote={g.exact_quote}
                                          onOpenPDF={onOpenPDF}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[#5A6A8A] text-xs">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// CHAT CARD - Fixed scrolling and citations (Issues #6, #8)
// ============================================================================
const ChatCard = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ask me anything about ${ticker}'s earnings, guidance, or operational metrics.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Issue #6: Scroll only within the messages container, not the whole page
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Ask me anything about ${ticker}'s earnings, guidance, or operational metrics.`
    }]);
  }, [ticker]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Issue #6: Prevent event bubbling
    
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(CONFIG.CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: userMessage, ticker })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      // Issue #8: Handle both array and direct object response formats
      let output, citations;
      
      if (Array.isArray(data)) {
        // Response is an array - take first item
        const firstItem = data[0] || {};
        output = firstItem.output || firstItem.response || firstItem.text || '';
        citations = firstItem.citations || [];
      } else {
        // Response is a direct object
        output = data.output || data.response || data.text || JSON.stringify(data);
        citations = data.citations || [];
      }
      
      // Issue #8: Map citation fields correctly
      const mappedCitations = citations.map(c => ({
        sourceFile: c.source_file || c.source || c.sourceFile,
        pageNumber: c.page_number || c.page || c.pageNumber,
        quote: c.quote || c.exact_quote
      }));
      
      console.log('Chat response:', { output, citations: mappedCitations }); // Debug log
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: output,
        citations: mappedCitations
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Issue #6: Prevent Enter key from scrolling page
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[#1E3A5F] shrink-0">
        <MessageSquare className="w-5 h-5 text-[#6C63FF]" />
        <h3 className="font-semibold text-[#E6F1FF]">Ask Questions</h3>
      </div>

      {/* Issue #6: Added ref to messages container for controlled scrolling */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
              message.role === 'user'
                ? 'bg-[#6C63FF] text-white'
                : message.isError
                ? 'bg-[#FF6B7A]/20 border border-[#FF6B7A]/30 text-[#FF6B7A]'
                : 'bg-[#0A192F] border border-[#1E3A5F] text-[#E6F1FF]'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {/* Issue #8: Fixed citation rendering with correct field names */}
              {message.citations?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1E3A5F] flex flex-wrap gap-1">
                  {message.citations.map((c, i) => (
                    <CitationLink 
                      key={i} 
                      sourceFile={c.sourceFile} 
                      pageNumber={c.pageNumber} 
                      quote={c.quote} 
                      onOpenPDF={onOpenPDF} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#0A192F] border border-[#1E3A5F] rounded-lg p-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Issue #6: Form with prevented default behavior */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-[#1E3A5F] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about earnings, guidance..."
            className="flex-1 px-3 py-2 bg-[#0A192F] border border-[#1E3A5F] rounded-lg text-sm text-[#E6F1FF] placeholder-[#697A9B] focus:outline-none focus:border-[#6C63FF]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-[#6C63FF] hover:bg-[#5A52D5] disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD - Expanded width (Issue #1) & Company headline (Issue #5)
// ============================================================================
export default function App() {
  const [selectedSector, setSelectedSector] = useState('Healthcare');
  const [selectedTicker, setSelectedTicker] = useState('MAXHEALTH');
  const [metricsData, setMetricsData] = useState(null);
  const [guidanceData, setGuidanceData] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [guidanceError, setGuidanceError] = useState(null);
  
  const [pdfViewer, setPdfViewer] = useState({
    isOpen: false, pdfUrl: null, pageNumber: 1, quote: null, sourceFile: null
  });

  const openPDF = (data) => setPdfViewer({ isOpen: true, ...data });
  const closePDF = () => setPdfViewer(prev => ({ ...prev, isOpen: false }));

  const availableTickers = CONFIG.SECTORS[selectedSector] || [];

  const fetchData = async (ticker) => {
    setIsLoadingMetrics(true);
    setIsLoadingGuidance(true);
    setMetricsError(null);
    setGuidanceError(null);

    try {
      const response = await fetch(CONFIG.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setMetricsData(await response.json());
    } catch (error) {
      setMetricsError(error.message);
      setMetricsData(null);
    } finally {
      setIsLoadingMetrics(false);
    }

    try {
      const response = await fetch(CONFIG.GUIDANCE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setGuidanceData(await response.json());
    } catch (error) {
      setGuidanceError(error.message);
      setGuidanceData(null);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  useEffect(() => {
    if (selectedTicker) {
      fetchData(selectedTicker);
    }
  }, [selectedTicker]);

  useEffect(() => {
    const tickers = CONFIG.SECTORS[selectedSector] || [];
    if (tickers.length > 0 && !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers[0]);
    }
  }, [selectedSector]);

  const displayQuarters = metricsData?.quarters || guidanceData?.quarters || CONFIG.DISPLAY_QUARTERS;
  
  // Issue #5: Get company display name
  const companyName = CONFIG.COMPANY_NAMES[selectedTicker] || selectedTicker;

  return (
    // Issue #1: Full height layout to prevent external scrolling
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: THEME.bg.primary }}>
      <PDFViewerPanel {...pdfViewer} onClose={closePDF} />

      {/* Header - Compact */}
      <header className="border-b border-[#1E3A5F] shrink-0" style={{ backgroundColor: THEME.bg.secondary }}>
        {/* Issue #1: Reduced padding, expanded width */}
        <div className="w-full px-3 py-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ 
                background: `linear-gradient(135deg, ${THEME.accent.primary}, ${THEME.accent.secondary})`,
                boxShadow: THEME.glow.primary
              }}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: THEME.text.primary }}>
                  Financial Analysis Agent
                </h1>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sector Select */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: THEME.text.tertiary }}>
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-2 py-1 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: THEME.bg.input,
                    borderColor: THEME.border,
                    color: THEME.text.primary,
                  }}
                >
                  {Object.keys(CONFIG.SECTORS).map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              {/* Ticker Select */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: THEME.text.tertiary }}>
                  Company
                </label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  disabled={availableTickers.length === 0}
                  className="px-2 py-1 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 disabled:opacity-50"
                  style={{ 
                    backgroundColor: THEME.bg.input,
                    borderColor: THEME.border,
                    color: THEME.accent.highlight,
                  }}
                >
                  {availableTickers.length > 0 ? (
                    availableTickers.map(ticker => (
                      <option key={ticker} value={ticker}>{ticker}</option>
                    ))
                  ) : (
                    <option value="">No companies</option>
                  )}
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchData(selectedTicker)}
                disabled={isLoadingMetrics || isLoadingGuidance}
                className="p-1.5 rounded-lg transition-colors hover:bg-[#1E3A5F] disabled:opacity-50 self-end"
                style={{ color: THEME.text.secondary }}
              >
                <RefreshCw className={`w-4 h-4 ${(isLoadingMetrics || isLoadingGuidance) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Issue #5: Company Name Headline */}
      <div className="px-3 py-2 border-b border-[#1E3A5F]/50 shrink-0" style={{ backgroundColor: THEME.bg.primary }}>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#6C63FF]" />
          <h2 className="text-lg font-bold text-[#E6F1FF]">{companyName}</h2>
          <span className="text-sm text-[#A8B2D1] bg-[#1E3A5F] px-2 py-0.5 rounded-full">{selectedTicker}</span>
        </div>
      </div>

      {/* Main Content - Issue #1: Expanded width with minimal margins, Issue #3: Half-half height */}
      <main className="flex-1 overflow-hidden px-3 py-3">
        {/* Issue #1: Changed to w-full and reduced gap */}
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          
          {/* Left Column - Metrics + Guidance - Issue #3: Equal height split */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Issue #3: Each section takes ~50% of available height */}
            <div className="flex-1 min-h-0">
              <MetricsCard
                data={metricsData}
                isLoading={isLoadingMetrics}
                error={metricsError}
                quarters={displayQuarters}
                onOpenPDF={openPDF}
                onExport={exportToCSV}
                ticker={selectedTicker}
              />
            </div>
            
            <div className="flex-1 min-h-0">
              <GuidanceCard
                data={guidanceData}
                isLoading={isLoadingGuidance}
                error={guidanceError}
                quarters={displayQuarters}
                onOpenPDF={openPDF}
              />
            </div>
          </div>

          {/* Right Column - Upload (compact) + Chat (expanded) - Issue #4 */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Issue #4: Compact upload section - shrink-0 keeps it small */}
            <div className="shrink-0">
              <FileUploadSection onUploadSuccess={() => setTimeout(() => fetchData(selectedTicker), 5000)} />
            </div>
            {/* Chat takes remaining space */}
            <div className="flex-1 min-h-0">
              <ChatCard ticker={selectedTicker} onOpenPDF={openPDF} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Compact */}
      <div className="py-1.5 text-center text-xs shrink-0 border-t border-[#1E3A5F]/30" style={{ color: THEME.text.muted }}>
        <p>Powered by AI • Data extracted from earnings calls & investor presentations</p>
      </div>
    </div>
  );
}
