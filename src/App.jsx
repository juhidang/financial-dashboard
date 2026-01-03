import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  ExternalLink, Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen, Upload, Download, Zap, Database, Brain, Activity,
  Plus, Check, ArrowUpRight, ArrowDownRight, Minus, ArrowRight,
  ThumbsUp, ThumbsDown, Pencil
} from 'lucide-react';

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  METRICS_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/metrics-compare',
  GUIDANCE_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/guidance-compare',
  CHAT_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/chat',
  INGESTION_FORM_URL: 'https://juhi.app.n8n.cloud/form/cc79e7b5-c57c-41eb-85a4-98ed363ea3bd',
  SUPABASE_STORAGE_URL: 'https://xogwcwqqqtavklturbrt.supabase.co/storage/v1/object/public/earnings-documents/',
  
  SECTORS: {
    'Healthcare': ['MAXHEALTH', 'APOLLOHOSP', 'FORTIS', 'ASTERDM', 'HCG', 'NH', 'JLHL', 'KIMS', 'RAINBOW'],
    'Financial Services': [],
    'Telecom': [],
    'Industrials': [],
    'Auto': [],
    'IT Services': [],
    'QSR': [],
  },
  
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
  
  DISPLAY_QUARTERS: ['FY25-Q3', 'FY25-Q4', 'FY26-Q1', 'FY26-Q2'], // Oldest to newest
};

// ============================================================================
// THEME COLORS - Professional Gunmetal
// ============================================================================
const THEME = {
  bg: {
    primary: '#1e2125',      // Dark Gunmetal - main background
    secondary: '#2a3038',    // Lighter Grey - cards
    tertiary: '#343b45',     // Hover states
    input: '#222b35',        // Input backgrounds
  },
  text: {
    primary: '#ffffff',      // Clean white - headers
    secondary: '#aab2bd',    // Light Grey - secondary text
    tertiary: '#8891a0',     // Dimmer text
    muted: '#6b7280',        // Very muted
  },
  accent: {
    primary: '#00d2b4',      // Teal/Mint - primary
    secondary: '#44d9e6',    // Sky Blue - secondary
    highlight: '#00ffc6',    // Highlights
  },
  semantic: {
    positive: '#00d2b4',
    negative: '#ef4444',
    warning: '#f59e0b',
    info: '#44d9e6',
  },
  border: '#3a424d',
  shadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
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

const formatValue = (value, currency, unit, showCurrency = true) => {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: THEME.text.muted }}>—</span>;
  }
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const prefix = (currency === 'INR' && showCurrency) ? '₹' : '';
  const suffix = unit ? ` ${unit}` : '';
  const formattedValue = numValue.toLocaleString('en-IN');
  return (
    <span className="font-medium" style={{ color: THEME.text.primary }}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

const calculateChange = (current, previous) => {
  if (!current || !previous) return null;
  const curr = parseFloat(String(current).replace(/,/g, ''));
  const prev = parseFloat(String(previous).replace(/,/g, ''));
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
};

// Export Metrics to CSV
const exportMetricsToCSV = (data, ticker) => {
  if (!data || !data.metrics || data.metrics.length === 0) return;
  
  const quarters = data.quarters || CONFIG.DISPLAY_QUARTERS;
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
  a.download = `${ticker}_metrics.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Export Guidance to CSV (flattened)
const exportGuidanceToCSV = (data, ticker) => {
  if (!data || !data.themes || data.themes.length === 0) return;
  
  const quarters = data.quarters || CONFIG.DISPLAY_QUARTERS;
  const headers = ['Theme', 'Subtheme', ...quarters.map(q => `${q}_Guidance`), ...quarters.map(q => `${q}_Confidence`)];
  
  const rows = [];
  data.themes.forEach(themeGroup => {
    themeGroup.items?.forEach(item => {
      const row = [
        themeGroup.theme,
        item.subtheme,
      ];
      
      // Add guidance text for each quarter
      quarters.forEach(q => {
        const guidanceList = item[q];
        const guidanceText = guidanceList && Array.isArray(guidanceList) && guidanceList.length > 0
          ? guidanceList.map(g => g.guidance_text).join(' | ')
          : '';
        row.push(`"${guidanceText}"`);
      });
      
      // Add confidence levels for each quarter
      quarters.forEach(q => {
        const guidanceList = item[q];
        const confidence = guidanceList && Array.isArray(guidanceList) && guidanceList.length > 0
          ? guidanceList.map(g => g.confidence_level || '').join(' | ')
          : '';
        row.push(confidence);
      });
      
      rows.push(row.join(','));
    });
  });
  
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ticker}_guidance.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================================
// PDF VIEWER PANEL
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
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose} 
      />
      
      <div 
        className={`fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 z-50 flex flex-col border-l transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ 
          backgroundColor: THEME.bg.primary,
          borderColor: THEME.border,
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ 
          backgroundColor: THEME.bg.secondary,
          borderColor: THEME.border 
        }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: THEME.accent.primary }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: THEME.text.primary }}>
                {sourceFile || 'Document'}
              </h3>
              <p className="text-sm" style={{ color: THEME.text.secondary }}>Page {pageNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg transition-colors hover:bg-opacity-20"
            style={{ color: THEME.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {quote && (
          <div className="p-4 border-b" style={{ 
            background: `linear-gradient(to right, ${THEME.accent.primary}20, ${THEME.accent.secondary}20)`,
            borderColor: THEME.border 
          }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📌</span>
              <p className="text-sm font-semibold" style={{ color: THEME.accent.primary }}>
                Referenced Quote
              </p>
            </div>
            <p className="text-sm p-3 rounded-lg border italic leading-relaxed" style={{ 
              color: THEME.text.primary,
              backgroundColor: `${THEME.bg.primary}80`,
              borderColor: THEME.border 
            }}>
              "{quote}"
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span style={{ color: THEME.text.secondary }}>
                💡 Press <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ 
                  backgroundColor: THEME.bg.tertiary,
                  color: THEME.accent.primary 
                }}>Ctrl+F</kbd> to search
              </span>
              <button 
                onClick={copyQuote} 
                className="transition-colors"
                style={{ color: copied ? THEME.accent.primary : THEME.text.secondary }}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: THEME.bg.input }}>
          {isLoading && pdfUrl && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: THEME.bg.input }}>
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME.accent.primary }} />
                <p className="text-sm" style={{ color: THEME.text.secondary }}>Loading document...</p>
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
            <div className="flex flex-col items-center justify-center h-full p-8" style={{ color: THEME.text.secondary }}>
              <BookOpen className="w-16 h-16 mb-4" style={{ color: THEME.border }} />
              <p className="text-lg font-medium" style={{ color: THEME.text.primary }}>PDF Not Available</p>
              <p className="text-sm mt-2">Configure Supabase Storage to view source documents</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ============================================================================
// CITATION LINK
// ============================================================================
const CitationLink = ({ sourceFile, pageNumber, quote, onOpenPDF }) => {
  const handleClick = () => {
    const pdfUrl = sourceFile ? `${CONFIG.SUPABASE_STORAGE_URL}${sourceFile}` : null;
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
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors border"
      style={{
        backgroundColor: THEME.bg.tertiary,
        color: THEME.text.secondary,
        borderColor: THEME.border
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = THEME.accent.primary + '30';
        e.currentTarget.style.color = THEME.accent.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = THEME.bg.tertiary;
        e.currentTarget.style.color = THEME.text.secondary;
      }}
    >
      <FileText className="w-3 h-3" />
      <span>p.{pageNumber || '?'}</span>
    </button>
  );
};

// ============================================================================
// FILE UPLOAD COMPONENT
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
    <div className="rounded-xl border p-6" style={{ 
      backgroundColor: THEME.bg.secondary,
      borderColor: THEME.border 
    }}>
      <div className="flex items-center gap-3 mb-4">
        <Upload className="w-6 h-6" style={{ color: THEME.accent.primary }} />
        <h3 className="text-lg font-semibold" style={{ color: THEME.text.primary }}>
          Upload Documents
        </h3>
      </div>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: isDragging ? THEME.accent.primary : THEME.border,
          backgroundColor: isDragging ? `${THEME.accent.primary}10` : 'transparent'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: THEME.accent.primary }} />
            <p className="text-sm" style={{ color: THEME.text.secondary }}>Processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-12 h-12`} style={{ 
              color: isDragging ? THEME.accent.primary : THEME.text.tertiary 
            }} />
            <p style={{ color: THEME.text.secondary }}>
              Drop PDF here or <span style={{ color: THEME.accent.primary }}>browse</span>
            </p>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div 
          className="mt-4 p-3 rounded flex items-center gap-2 text-sm"
          style={{
            backgroundColor: uploadStatus.type === 'success' 
              ? `${THEME.accent.primary}20` 
              : `${THEME.semantic.negative}20`,
            color: uploadStatus.type === 'success' 
              ? THEME.accent.primary 
              : THEME.semantic.negative
          }}
        >
          {uploadStatus.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// RESIZABLE COMPONENT
// ============================================================================
const ResizablePanel = ({ children, direction = 'horizontal', defaultSize = 50, minSize = 20, maxSize = 80 }) => {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current.parentElement;
      const rect = container.getBoundingClientRect();
      
      let newSize;
      if (direction === 'horizontal') {
        newSize = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSize = ((e.clientY - rect.top) / rect.height) * 100;
      }
      
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSize, maxSize]);

  return (
    <div 
      ref={containerRef}
      style={{
        [direction === 'horizontal' ? 'width' : 'height']: `${size}%`,
        position: 'relative'
      }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        className="absolute z-10 transition-colors"
        style={{
          [direction === 'horizontal' ? 'right' : 'bottom']: '-4px',
          [direction === 'horizontal' ? 'top' : 'left']: 0,
          [direction === 'horizontal' ? 'width' : 'height']: '8px',
          [direction === 'horizontal' ? 'height' : 'width']: '100%',
          cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
          backgroundColor: isDragging ? THEME.accent.primary : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = `${THEME.accent.primary}40`;
        }}
        onMouseLeave={(e) => {
          if (!isDragging) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      />
    </div>
  );
};

// ============================================================================
// METRICS CARD
// ============================================================================
const MetricsCard = ({ data, isLoading, error, quarters, onOpenPDF, onExport, ticker }) => {
  const [editedValues, setEditedValues] = useState({}); // Track edited values: { metricName: { quarter: value } }
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited: { metricName, quarter }
  const [editInputValue, setEditInputValue] = useState('');
  const [annotations, setAnnotations] = useState('');
  
  // NO FILTERING - Show all metrics
  const metrics = data?.metrics || [];
  
  const handleEditClick = (metricName, quarter, currentValue) => {
    setEditingCell({ metricName, quarter });
    setEditInputValue(currentValue !== null && currentValue !== undefined ? String(currentValue).replace(/,/g, '') : '');
  };

  const handleEditSave = (metricName, quarter) => {
    const value = editInputValue.trim() === '' ? null : parseFloat(editInputValue);
    setEditedValues(prev => ({
      ...prev,
      [metricName]: {
        ...prev[metricName],
        [quarter]: value
      }
    }));
    setEditingCell(null);
    setEditInputValue('');
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditInputValue('');
  };

  const handleKeyDown = (e, metricName, quarter) => {
    if (e.key === 'Enter') {
      handleEditSave(metricName, quarter);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const getDisplayValue = (metricName, quarter, originalValue) => {
    if (editedValues[metricName]?.[quarter] !== undefined) {
      return editedValues[metricName][quarter];
    }
    return originalValue;
  };

  const isValueEdited = (metricName, quarter) => {
    return editedValues[metricName]?.[quarter] !== undefined;
  };

  const formatValueForMetrics = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span style={{ color: THEME.text.muted }}>—</span>;
    }
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    const formattedValue = numValue.toLocaleString('en-IN');
    return formattedValue;
  };
  
  if (isLoading) {
    return (
      <div className="rounded-xl border p-6 h-full flex items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.border 
      }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME.accent.primary }} />
        <span className="ml-2" style={{ color: THEME.text.secondary }}>Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-6 h-full flex flex-col items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.semantic.negative 
      }}>
        <AlertCircle className="w-10 h-10 mb-2" style={{ color: THEME.semantic.negative }} />
        <p className="font-medium" style={{ color: THEME.semantic.negative }}>Error loading metrics</p>
        <p className="text-sm mt-1" style={{ color: THEME.text.secondary }}>{error}</p>
      </div>
    );
  }

  if (!data || metrics.length === 0) {
    return (
      <div className="rounded-xl border p-6 h-full flex flex-col items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.border 
      }}>
        <TrendingUp className="w-10 h-10 mb-2" style={{ color: THEME.border }} />
        <p className="font-medium" style={{ color: THEME.text.secondary }}>No metrics data</p>
        <p className="text-sm mt-1" style={{ color: THEME.text.tertiary }}>Ingest documents to see metrics</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden h-full flex flex-col" style={{ 
      backgroundColor: THEME.bg.secondary,
      borderColor: THEME.border 
    }}>
      <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: THEME.accent.primary }} />
          <h3 className="font-semibold" style={{ color: THEME.text.primary }}>Key Metrics</h3>
        </div>
        <button
          onClick={() => onExport(data, ticker)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
          style={{
            backgroundColor: THEME.bg.tertiary,
            color: THEME.text.secondary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${THEME.accent.primary}30`;
            e.currentTarget.style.color = THEME.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = THEME.bg.tertiary;
            e.currentTarget.style.color = THEME.text.secondary;
          }}
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: THEME.bg.tertiary }}>
              <th 
                className="text-left py-3 px-4 text-sm font-bold sticky left-0 z-20 border-b"
                style={{ 
                  color: THEME.text.primary,
                  backgroundColor: THEME.bg.tertiary,
                  borderColor: THEME.border 
                }}
              >
                Metric
              </th>
              {quarters.map((quarter) => (
                <th 
                  key={quarter} 
                  className="text-right py-3 px-4 text-sm font-bold min-w-28 border-b"
                  style={{ 
                    color: THEME.text.primary,
                    borderColor: THEME.border 
                  }}
                >
                  {quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr 
                key={metric.metric_name} 
                className="border-t transition-colors group"
                style={{ borderColor: `${THEME.border}80` }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${THEME.bg.tertiary}40`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td 
                  className="py-2.5 px-4 sticky left-0 z-10"
                  style={{ backgroundColor: THEME.bg.secondary }}
                >
                  <div className="font-medium text-sm" style={{ color: THEME.text.primary }}>
                    {metric.metric_name}
                  </div>
                  {(metric.unit || metric.currency) && (
                    <div className="text-xs" style={{ color: THEME.text.tertiary }}>
                      {metric.currency && metric.currency !== '' ? `${metric.currency} ` : ''}{metric.unit}
                    </div>
                  )}
                </td>
                {quarters.map((quarter, qIdx) => {
                  const quarterData = metric[quarter];
                  const originalValue = quarterData?.value;
                  const displayValue = getDisplayValue(metric.metric_name, quarter, originalValue);
                  const prevQuarter = quarters[qIdx - 1];
                  const prevOriginalValue = prevQuarter ? metric[prevQuarter]?.value : null;
                  const prevDisplayValue = prevQuarter ? getDisplayValue(metric.metric_name, prevQuarter, prevOriginalValue) : null;
                  const change = calculateChange(displayValue, prevDisplayValue);
                  const isEditing = editingCell?.metricName === metric.metric_name && editingCell?.quarter === quarter;
                  const isEdited = isValueEdited(metric.metric_name, quarter);
                  
                  return (
                    <td key={quarter} className="text-right py-2.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editInputValue}
                              onChange={(e) => setEditInputValue(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, metric.metric_name, quarter)}
                              onBlur={() => handleEditSave(metric.metric_name, quarter)}
                              className="w-20 px-2 py-1 rounded text-sm text-right focus:outline-none"
                              style={{
                                backgroundColor: THEME.bg.input,
                                borderColor: THEME.accent.primary,
                                color: THEME.text.primary,
                                border: `1px solid ${THEME.accent.primary}`
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(metric.metric_name, quarter)}
                              className="p-1 rounded transition-colors"
                              style={{ color: THEME.accent.primary }}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1 rounded transition-colors"
                              style={{ color: THEME.text.secondary }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="font-medium"
                                style={{ 
                                  color: isEdited ? THEME.accent.secondary : THEME.text.primary 
                                }}
                              >
                                {formatValueForMetrics(displayValue)}
                              </span>
                              <button
                                onClick={() => handleEditClick(metric.metric_name, quarter, displayValue)}
                                className="p-0.5 rounded transition-all opacity-0 group-hover:opacity-100"
                                style={{ color: THEME.text.tertiary }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = THEME.accent.primary;
                                  e.currentTarget.style.backgroundColor = `${THEME.accent.primary}20`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = THEME.text.tertiary;
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                title="Edit value"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                            {change !== null && qIdx > 0 && (
                              <span 
                                className="text-xs flex items-center gap-0.5"
                                style={{ 
                                  color: parseFloat(change) > 0 
                                    ? THEME.accent.primary 
                                    : parseFloat(change) < 0 
                                    ? THEME.semantic.negative 
                                    : THEME.text.secondary 
                                }}
                              >
                                {parseFloat(change) > 0 ? <ArrowUpRight className="w-3 h-3" /> : 
                                 parseFloat(change) < 0 ? <ArrowDownRight className="w-3 h-3" /> : 
                                 <Minus className="w-3 h-3" />}
                                {Math.abs(parseFloat(change))}%
                              </span>
                            )}
                          </div>
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

      {/* Annotation Section */}
      <div className="border-t shrink-0 p-3" style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" style={{ color: THEME.accent.primary }} />
          <h4 className="text-sm font-semibold" style={{ color: THEME.text.primary }}>Annotations</h4>
        </div>
        <textarea
          value={annotations}
          onChange={(e) => setAnnotations(e.target.value)}
          placeholder="Add comments or notes about these metrics..."
          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
          style={{
            backgroundColor: THEME.bg.input,
            borderColor: THEME.border,
            color: THEME.text.primary,
            border: `1px solid ${THEME.border}`,
            minHeight: '80px'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = THEME.accent.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = THEME.border}
        />
      </div>
    </div>
  );
};

// ============================================================================
// GUIDANCE CARD - Strictly 4 columns
// ============================================================================
const GuidanceCard = ({ data, isLoading, error, quarters, onOpenPDF, onExport, ticker }) => {
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
    EXPANSION: { icon: '🏗️', color: THEME.accent.primary },
    FINANCIAL: { icon: '💰', color: THEME.accent.secondary },
    OPERATIONAL: { icon: '⚙️', color: '#f59e0b' },
    CAPEX: { icon: '📊', color: '#a855f7' },
    REGULATORY: { icon: '📋', color: THEME.semantic.negative },
    DIGITAL: { icon: '💻', color: THEME.accent.secondary },
    OTHER: { icon: '📌', color: THEME.text.secondary }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border p-6 h-full flex items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.border 
      }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME.accent.primary }} />
        <span className="ml-2" style={{ color: THEME.text.secondary }}>Loading guidance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-6 h-full flex flex-col items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.semantic.negative 
      }}>
        <AlertCircle className="w-10 h-10 mb-2" style={{ color: THEME.semantic.negative }} />
        <p className="font-medium" style={{ color: THEME.semantic.negative }}>Error loading guidance</p>
        <p className="text-sm mt-1" style={{ color: THEME.text.secondary }}>{error}</p>
      </div>
    );
  }

  if (!data || !data.themes || data.themes.length === 0) {
    return (
      <div className="rounded-xl border p-6 h-full flex flex-col items-center justify-center" style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.border 
      }}>
        <Calendar className="w-10 h-10 mb-2" style={{ color: THEME.border }} />
        <p className="font-medium" style={{ color: THEME.text.secondary }}>No guidance data</p>
        <p className="text-sm mt-1" style={{ color: THEME.text.tertiary }}>Ingest transcripts to see guidance</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden h-full flex flex-col" style={{ 
      backgroundColor: THEME.bg.secondary,
      borderColor: THEME.border 
    }}>
      <div className="flex items-center justify-between p-3 border-b shrink-0" style={{ borderColor: THEME.border }}>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" style={{ color: THEME.accent.primary }} />
          <h3 className="font-semibold" style={{ color: THEME.text.primary }}>Forward Guidance</h3>
        </div>
        <button
          onClick={() => onExport(data, ticker)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
          style={{
            backgroundColor: THEME.bg.tertiary,
            color: THEME.text.secondary
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${THEME.accent.primary}30`;
            e.currentTarget.style.color = THEME.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = THEME.bg.tertiary;
            e.currentTarget.style.color = THEME.text.secondary;
          }}
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Quarters header - 4 columns strictly */}
      <div 
        className="grid border-b shrink-0"
        style={{ 
          gridTemplateColumns: '180px repeat(4, 1fr)',
          backgroundColor: THEME.bg.tertiary,
          borderColor: THEME.border 
        }}
      >
        <div className="py-2 px-3 text-sm font-bold" style={{ color: THEME.text.primary }}>
          Theme
        </div>
        {quarters.map((quarter) => (
          <div 
            key={quarter} 
            className="py-2 px-2 text-sm font-bold text-center"
            style={{ color: THEME.text.primary }}
          >
            {quarter}
          </div>
        ))}
      </div>

      <div className="overflow-y-auto flex-1">
        {data.themes.map((themeGroup) => {
          const theme = themeColors[themeGroup.theme] || themeColors.OTHER;
          return (
            <div 
              key={themeGroup.theme} 
              className="border-b last:border-0"
              style={{ borderColor: `${THEME.border}80` }}
            >
              <button
                onClick={() => toggleTheme(themeGroup.theme)}
                className="w-full flex items-center justify-between p-2.5 transition-colors"
                style={{ color: THEME.text.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${THEME.bg.tertiary}50`}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{theme.icon}</span>
                  <span className="font-medium text-sm">{themeGroup.theme}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: THEME.bg.primary,
                      color: THEME.text.tertiary 
                    }}
                  >
                    {themeGroup.items?.length || 0}
                  </span>
                </div>
                {expandedThemes[themeGroup.theme] ? (
                  <ChevronDown className="w-4 h-4" style={{ color: THEME.text.secondary }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: THEME.text.secondary }} />
                )}
              </button>
              
              {expandedThemes[themeGroup.theme] && (
                <div className="px-2.5 pb-2.5">
                  {themeGroup.items?.map((item, idx) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      <div 
                        className="text-xs font-medium mb-1.5 flex items-center gap-1 pl-1"
                        style={{ color: THEME.text.secondary }}
                      >
                        <div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: theme.color }} 
                        />
                        {item.subtheme}
                      </div>
                      {/* Strictly 4-column grid */}
                      <div 
                        className="grid gap-1"
                        style={{ gridTemplateColumns: '180px repeat(4, 1fr)' }}
                      >
                        <div></div>
                        {quarters.map((quarter) => {
                          const guidanceList = item[quarter];
                          return (
                            <div 
                              key={quarter} 
                              className="rounded-lg p-2 min-h-[50px]"
                              style={{ backgroundColor: THEME.bg.primary }}
                            >
                              {guidanceList && Array.isArray(guidanceList) && guidanceList.length > 0 ? (
                                guidanceList.map((g, gIdx) => (
                                  <div 
                                    key={gIdx} 
                                    className="text-xs mb-2 last:mb-0"
                                    style={{ color: THEME.text.primary }}
                                  >
                                    <p className="line-clamp-3 mb-1">{g.guidance_text}</p>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {g.confidence_level && (
                                        <span 
                                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                            getConfidenceBadge(g.confidence_level).bg
                                          } ${getConfidenceBadge(g.confidence_level).text} ${
                                            getConfidenceBadge(g.confidence_level).border
                                          }`}
                                        >
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
                                <span className="text-xs" style={{ color: THEME.text.muted }}>—</span>
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
// CHAT CARD
// ============================================================================
const ChatCard = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({}); // Track feedback for each message by index
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setFeedback({}); // Reset feedback when ticker changes
  }, [ticker]);

  const handleFeedback = (messageIdx, isPositive) => {
    setFeedback(prev => ({
      ...prev,
      [messageIdx]: isPositive ? 'positive' : 'negative'
    }));
    // TODO: Send feedback to backend API
    console.log(`Feedback for message ${messageIdx}: ${isPositive ? 'positive' : 'negative'}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
      
      let output, citations;
      
      if (Array.isArray(data)) {
        const firstItem = data[0] || {};
        output = firstItem.output || firstItem.response || firstItem.text || '';
        citations = firstItem.citations || [];
      } else {
        output = data.output || data.response || data.text || JSON.stringify(data);
        citations = data.citations || [];
      }
      
      const mappedCitations = citations.map(c => ({
        sourceFile: c.source_file || c.source || c.sourceFile,
        pageNumber: c.page_number || c.page || c.pageNumber,
        quote: c.quote || c.exact_quote
      }));
      
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div 
      className="rounded-xl border overflow-hidden flex flex-col h-full"
      style={{ 
        backgroundColor: THEME.bg.secondary,
        borderColor: THEME.border 
      }}
    >
      <div 
        className="flex items-center gap-2 p-3 border-b shrink-0"
        style={{ borderColor: THEME.border }}
      >
        <MessageSquare className="w-5 h-5" style={{ color: THEME.accent.primary }} />
        <h3 className="font-semibold" style={{ color: THEME.text.primary }}>Ask Questions</h3>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className="max-w-[85%] rounded-lg p-2.5 text-sm"
              style={{
                backgroundColor: message.role === 'user'
                  ? THEME.accent.primary
                  : message.isError
                  ? `${THEME.semantic.negative}20`
                  : THEME.bg.primary,
                color: message.role === 'user' ? 'white' : message.isError ? THEME.semantic.negative : THEME.text.primary,
                border: message.role === 'assistant' ? `1px solid ${THEME.border}` : 'none'
              }}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {(message.citations?.length > 0 || message.role === 'assistant') && (
                <div 
                  className="mt-2 pt-2 flex items-center justify-between gap-2"
                  style={{ borderTop: `1px solid ${THEME.border}` }}
                >
                  <div className="flex flex-wrap gap-1">
                    {message.citations?.map((c, i) => (
                      <CitationLink 
                        key={i} 
                        sourceFile={c.sourceFile} 
                        pageNumber={c.pageNumber} 
                        quote={c.quote} 
                        onOpenPDF={onOpenPDF} 
                      />
                    ))}
                  </div>
                  {message.role === 'assistant' && !message.isError && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleFeedback(idx, true)}
                        className="p-1.5 rounded transition-colors"
                        style={{
                          color: feedback[idx] === 'positive' 
                            ? THEME.accent.primary 
                            : THEME.text.secondary,
                          backgroundColor: feedback[idx] === 'positive' 
                            ? `${THEME.accent.primary}20` 
                            : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (feedback[idx] !== 'positive') {
                            e.currentTarget.style.color = THEME.accent.primary;
                            e.currentTarget.style.backgroundColor = `${THEME.accent.primary}20`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (feedback[idx] !== 'positive') {
                            e.currentTarget.style.color = THEME.text.secondary;
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        title="Thumbs up"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleFeedback(idx, false)}
                        className="p-1.5 rounded transition-colors"
                        style={{
                          color: feedback[idx] === 'negative' 
                            ? THEME.semantic.negative 
                            : THEME.text.secondary,
                          backgroundColor: feedback[idx] === 'negative' 
                            ? `${THEME.semantic.negative}20` 
                            : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (feedback[idx] !== 'negative') {
                            e.currentTarget.style.color = THEME.semantic.negative;
                            e.currentTarget.style.backgroundColor = `${THEME.semantic.negative}20`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (feedback[idx] !== 'negative') {
                            e.currentTarget.style.color = THEME.text.secondary;
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        title="Thumbs down"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div 
              className="rounded-lg p-2.5 border"
              style={{ 
                backgroundColor: THEME.bg.primary,
                borderColor: THEME.border 
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: THEME.accent.primary }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="p-2.5 border-t shrink-0"
        style={{ borderColor: THEME.border }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about earnings, guidance..."
            className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: THEME.bg.primary,
              borderColor: THEME.border,
              color: THEME.text.primary,
              border: `1px solid ${THEME.border}`
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = THEME.accent.primary}
            onBlur={(e) => e.currentTarget.style.borderColor = THEME.border}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: THEME.accent.primary }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = THEME.accent.secondary)}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = THEME.accent.primary}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// LANDING VIEW
// ============================================================================
const LandingView = ({ onSkip }) => {
  return (
    <div 
      className="h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: THEME.bg.primary }}
    >
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div 
            className="inline-flex p-4 rounded-2xl mb-4"
            style={{ 
              background: `linear-gradient(135deg, ${THEME.accent.primary}, ${THEME.accent.secondary})`,
              boxShadow: `0 8px 32px ${THEME.accent.primary}40`
            }}
          >
            <Brain className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: THEME.text.primary }}>
            MOSAIC
          </h1>
          <p className="text-lg mb-2" style={{ color: THEME.text.secondary }}>
            Upload Quarterly Earnings Transcripts to begin analysis
          </p>
        </div>

        {/* Upload Section */}
        <FileUploadSection />

        {/* Skip Button */}
        <div className="text-center mt-6">
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium"
            style={{
              backgroundColor: THEME.bg.secondary,
              color: THEME.text.secondary,
              border: `1px solid ${THEME.border}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME.bg.tertiary;
              e.currentTarget.style.color = THEME.accent.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = THEME.bg.secondary;
              e.currentTarget.style.color = THEME.text.secondary;
            }}
          >
            Skip to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: THEME.text.muted }}>
            This dashboard is custom-built using proprietary sector playbooks of First Ray Capital.<br/>
            Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [viewMode, setViewMode] = useState('landing'); // 'landing' or 'dashboard'
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
    if (selectedTicker && viewMode === 'dashboard') {
      fetchData(selectedTicker);
    }
  }, [selectedTicker, viewMode]);

  useEffect(() => {
    const tickers = CONFIG.SECTORS[selectedSector] || [];
    if (tickers.length > 0 && !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers[0]);
    }
  }, [selectedSector]);

  const displayQuarters = metricsData?.quarters || guidanceData?.quarters || CONFIG.DISPLAY_QUARTERS;
  const companyName = CONFIG.COMPANY_NAMES[selectedTicker] || selectedTicker;

  // Show landing view
  if (viewMode === 'landing') {
    return <LandingView onSkip={() => setViewMode('dashboard')} />;
  }

  // Show dashboard view
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: THEME.bg.primary }}>
      <PDFViewerPanel {...pdfViewer} onClose={closePDF} />

      {/* Header */}
      <header 
        className="border-b shrink-0"
        style={{ 
          backgroundColor: THEME.bg.secondary,
          borderColor: THEME.border 
        }}
      >
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${THEME.accent.primary}, ${THEME.accent.secondary})`,
                  boxShadow: `0 4px 12px ${THEME.accent.primary}40`
                }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: THEME.text.primary }}>
                  MOSAIC
                </h1>
                <p className="text-xs" style={{ color: THEME.text.tertiary }}>
                  Powered by First Ray Capital
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label 
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: THEME.text.tertiary }}
                >
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none"
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

              <div className="flex flex-col">
                <label 
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: THEME.text.tertiary }}
                >
                  Company
                </label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  disabled={availableTickers.length === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none disabled:opacity-50"
                  style={{ 
                    backgroundColor: THEME.bg.input,
                    borderColor: THEME.border,
                    color: THEME.accent.primary,
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

              <button
                onClick={() => fetchData(selectedTicker)}
                disabled={isLoadingMetrics || isLoadingGuidance}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 self-end"
                style={{ color: THEME.text.secondary }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = THEME.bg.tertiary)}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <RefreshCw className={`w-5 h-5 ${(isLoadingMetrics || isLoadingGuidance) ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setViewMode('landing')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium self-end"
                style={{
                  backgroundColor: THEME.bg.tertiary,
                  color: THEME.text.secondary,
                  border: `1px solid ${THEME.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = THEME.accent.primary;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = THEME.bg.tertiary;
                  e.currentTarget.style.color = THEME.text.secondary;
                }}
              >
                <Upload className="w-4 h-4" />
                File Uploads
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Company headline */}
      <div 
        className="px-4 py-2 border-b shrink-0"
        style={{ 
          backgroundColor: THEME.bg.primary,
          borderColor: `${THEME.border}80` 
        }}
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: THEME.accent.primary }} />
          <h2 className="text-lg font-bold" style={{ color: THEME.text.primary }}>{companyName}</h2>
          <span 
            className="text-sm px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: THEME.bg.tertiary,
              color: THEME.text.secondary 
            }}
          >
            {selectedTicker}
          </span>
        </div>
      </div>

      {/* Main Content - Resizable */}
      <main className="flex-1 overflow-hidden p-3">
        <div className="h-full flex gap-3">
          {/* Left Column - Resizable horizontally */}
          <ResizablePanel direction="horizontal" defaultSize={65} minSize={40} maxSize={75}>
            <div className="h-full flex flex-col gap-3">
              {/* Guidance - Resizable vertically */}
              <ResizablePanel direction="vertical" defaultSize={50} minSize={30} maxSize={70}>
                <GuidanceCard
                  data={guidanceData}
                  isLoading={isLoadingGuidance}
                  error={guidanceError}
                  quarters={displayQuarters}
                  onOpenPDF={openPDF}
                  onExport={exportGuidanceToCSV}
                  ticker={selectedTicker}
                />
              </ResizablePanel>
              
              {/* Chat */}
              <div className="flex-1 min-h-0">
                <ChatCard ticker={selectedTicker} onOpenPDF={openPDF} />
              </div>
            </div>
          </ResizablePanel>

          {/* Right Column - Metrics */}
          <div className="flex-1 min-h-0">
            <MetricsCard
              data={metricsData}
              isLoading={isLoadingMetrics}
              error={metricsError}
              quarters={displayQuarters}
              onOpenPDF={openPDF}
              onExport={exportMetricsToCSV}
              ticker={selectedTicker}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <div 
        className="py-2 text-center text-xs shrink-0 border-t"
        style={{ 
          color: THEME.text.muted,
          borderColor: `${THEME.border}50` 
        }}
      >
        <p>Powered by AI • Data extracted from earnings calls & investor presentations</p>
      </div>
    </div>
  );
}
