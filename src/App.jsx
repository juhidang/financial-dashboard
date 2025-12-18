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
  
  // Display quarters
  DISPLAY_QUARTERS: ['FY26-Q2', 'FY26-Q1', 'FY25-Q4', 'FY25-Q3'],
};

// ============================================================================
// THEME COLORS - "The Intelligent Future" Dark Mode
// ============================================================================
const THEME = {
  bg: {
    primary: '#0A192F',      // Deep Navy - main background
    secondary: '#112240',    // Slightly lighter - cards
    tertiary: '#1E3A5F',     // Even lighter - hover states
    input: '#0D1F3C',        // Input backgrounds
  },
  text: {
    primary: '#E6F1FF',      // Main text
    secondary: '#8892B0',    // Muted text
    tertiary: '#495670',     // Very muted
  },
  accent: {
    primary: '#6C63FF',      // Electric Violet - primary actions
    secondary: '#4D7CFF',    // Electric Blue - secondary
    highlight: '#00FFC6',    // Neon Mint - highlights/positive
    cyan: '#00E5FF',         // Cyan - accents
  },
  semantic: {
    positive: '#00FFC6',     // Mint green
    negative: '#FF4757',     // Coral/Magenta
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
    return <span className="text-slate-600">—</span>;
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

// ============================================================================
// PDF VIEWER PANEL
// ============================================================================
const PDFViewerPanel = ({ isOpen, onClose, pdfUrl, pageNumber, quote, sourceFile }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const copyQuote = () => {
    if (quote) {
      navigator.clipboard.writeText(quote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const searchHint = quote ? quote.split(' ').slice(0, 5).join(' ') : '';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-[#0A192F] shadow-2xl z-50 flex flex-col border-l border-[#1E3A5F]">
        <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F] bg-[#112240]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6C63FF] rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#E6F1FF]">{sourceFile || 'Document'}</h3>
              <p className="text-sm text-[#8892B0]">Page {pageNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1E3A5F] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#8892B0]" />
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
              <span className="text-[#8892B0]">
                💡 Press <kbd className="px-1.5 py-0.5 bg-[#1E3A5F] rounded font-mono text-[#00FFC6]">Ctrl+F</kbd> to search
              </span>
              <button onClick={copyQuote} className="text-[#6C63FF] hover:text-[#00FFC6] transition-colors">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-[#0D1F3C]">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#page=${pageNumber}`} className="w-full h-full border-0" title="PDF Viewer" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8892B0] p-8">
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
// CITATION LINK
// ============================================================================
const CitationLink = ({ sourceFile, pageNumber, quote, onOpenPDF }) => {
  const handleClick = () => {
    onOpenPDF({
      sourceFile,
      pageNumber,
      quote,
      pdfUrl: sourceFile ? `${CONFIG.SUPABASE_STORAGE_URL}${sourceFile}` : null
    });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded transition-colors text-[#8892B0] hover:text-[#00FFC6] border border-[#1E3A5F] hover:border-[#6C63FF]/50"
    >
      <FileText className="w-3 h-3" />
      <span>p.{pageNumber}</span>
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

      // This will trigger your n8n ingestion pipeline
      const response = await fetch(CONFIG.INGESTION_FORM_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus({ type: 'success', message: `${file.name} uploaded successfully! Processing...` });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: `Upload failed: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="w-4 h-4 text-[#6C63FF]" />
        <h3 className="text-sm font-semibold text-[#E6F1FF]">Ingest New Document</h3>
      </div>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
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
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
            <p className="text-sm text-[#8892B0]">Processing document...</p>
          </div>
        ) : (
          <>
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#00FFC6]' : 'text-[#1E3A5F]'}`} />
            <p className="text-sm text-[#8892B0]">
              Drop PDF here or <span className="text-[#6C63FF]">browse</span>
            </p>
            <p className="text-xs text-[#495670] mt-1">Earnings Transcript or Investor Presentation</p>
          </>
        )}
      </div>

      {uploadStatus && (
        <div className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
          uploadStatus.type === 'success' 
            ? 'bg-[#00FFC6]/10 text-[#00FFC6]' 
            : 'bg-[#FF4757]/10 text-[#FF4757]'
        }`}>
          {uploadStatus.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// METRICS CARD
// ============================================================================
const MetricsCard = ({ data, isLoading, error, quarters, onOpenPDF, onExport, ticker }) => {
  if (isLoading) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <span className="ml-2 text-[#8892B0]">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#FF4757]/30 p-6">
        <div className="flex flex-col items-center justify-center h-48 text-[#FF4757]">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-medium">Error loading metrics</p>
          <p className="text-sm text-[#8892B0] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6">
        <div className="flex flex-col items-center justify-center h-48 text-[#8892B0]">
          <TrendingUp className="w-10 h-10 mb-2 text-[#1E3A5F]" />
          <p className="font-medium">No metrics data</p>
          <p className="text-sm mt-1">Ingest documents to see metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#6C63FF]" />
          <h3 className="font-semibold text-[#E6F1FF]">Key Metrics</h3>
        </div>
        <button
          onClick={() => onExport(data, ticker)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded-lg transition-colors text-[#8892B0] hover:text-[#00FFC6]"
        >
          <Download className="w-3 h-3" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#0A192F]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-[#8892B0] sticky left-0 bg-[#0A192F] z-10">
                Metric
              </th>
              {quarters.map((quarter, idx) => (
                <th key={quarter} className="text-right py-3 px-4 text-sm font-semibold text-[#8892B0] min-w-28">
                  <span className={idx === 0 ? 'text-[#00FFC6]' : ''}>{quarter}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((metric, idx) => (
              <tr key={metric.metric_name} className="border-t border-[#1E3A5F]/50 hover:bg-[#1E3A5F]/20 transition-colors">
                <td className="py-3 px-4 sticky left-0 bg-[#112240] z-10">
                  <div className="font-medium text-[#E6F1FF] text-sm">{metric.metric_name}</div>
                  {(metric.unit || metric.currency) && (
                    <div className="text-xs text-[#495670]">
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
                    <td key={quarter} className="text-right py-3 px-4">
                      <div className="flex flex-col items-end gap-1">
                        {formatValue(quarterData?.value, metric.currency, '')}
                        {change !== null && qIdx === 0 && (
                          <span className={`text-xs flex items-center gap-0.5 ${
                            parseFloat(change) > 0 ? 'text-[#00FFC6]' : parseFloat(change) < 0 ? 'text-[#FF4757]' : 'text-[#8892B0]'
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
// GUIDANCE CARD
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
    REGULATORY: { icon: '📋', color: '#FF4757' },
    DIGITAL: { icon: '💻', color: '#00E5FF' },
    OTHER: { icon: '📌', color: '#8892B0' }
  };

  if (isLoading) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C63FF]" />
          <span className="ml-2 text-[#8892B0]">Loading guidance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#FF4757]/30 p-6">
        <div className="flex flex-col items-center justify-center h-48 text-[#FF4757]">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-medium">Error loading guidance</p>
          <p className="text-sm text-[#8892B0] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.themes || data.themes.length === 0) {
    return (
      <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] p-6">
        <div className="flex flex-col items-center justify-center h-48 text-[#8892B0]">
          <Calendar className="w-10 h-10 mb-2 text-[#1E3A5F]" />
          <p className="font-medium">No guidance data</p>
          <p className="text-sm mt-1">Ingest transcripts to see guidance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-[#1E3A5F]">
        <Calendar className="w-5 h-5 text-[#6C63FF]" />
        <h3 className="font-semibold text-[#E6F1FF]">Forward Guidance</h3>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {data.themes.map((themeGroup) => {
          const theme = themeColors[themeGroup.theme] || themeColors.OTHER;
          return (
            <div key={themeGroup.theme} className="border-b border-[#1E3A5F]/50 last:border-0">
              <button
                onClick={() => toggleTheme(themeGroup.theme)}
                className="w-full flex items-center justify-between p-3 hover:bg-[#1E3A5F]/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{theme.icon}</span>
                  <span className="font-medium text-[#E6F1FF] text-sm">{themeGroup.theme}</span>
                  <span className="text-xs text-[#495670] bg-[#0A192F] px-2 py-0.5 rounded-full">
                    {themeGroup.items?.length || 0}
                  </span>
                </div>
                {expandedThemes[themeGroup.theme] ? (
                  <ChevronDown className="w-4 h-4 text-[#8892B0]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#8892B0]" />
                )}
              </button>
              
              {expandedThemes[themeGroup.theme] && (
                <div className="px-3 pb-3">
                  {themeGroup.items?.map((item, idx) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      <div className="text-xs font-medium text-[#8892B0] mb-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.color }} />
                        {item.subtheme}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {quarters.map((quarter) => {
                          const guidanceList = item[quarter];
                          return (
                            <div key={quarter} className="bg-[#0A192F] rounded-lg p-2 min-h-[60px]">
                              <div className="text-[10px] text-[#495670] mb-1">{quarter}</div>
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
                                <span className="text-[#1E3A5F] text-xs">—</span>
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
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Ask me anything about ${ticker}'s earnings, guidance, or operational metrics.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Ask me anything about ${ticker}'s earnings, guidance, or operational metrics.`
    }]);
  }, [ticker]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.output || data.response || data.text || JSON.stringify(data),
        citations: data.citations || []
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

  return (
    <div className="bg-[#112240] rounded-xl border border-[#1E3A5F] overflow-hidden flex flex-col h-[400px]">
      <div className="flex items-center gap-2 p-4 border-b border-[#1E3A5F]">
        <MessageSquare className="w-5 h-5 text-[#6C63FF]" />
        <h3 className="font-semibold text-[#E6F1FF]">Ask Questions</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, idx) => (
          <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              message.role === 'user'
                ? 'bg-[#6C63FF] text-white'
                : message.isError
                ? 'bg-[#FF4757]/20 border border-[#FF4757]/30 text-[#FF4757]'
                : 'bg-[#0A192F] border border-[#1E3A5F] text-[#E6F1FF]'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.citations?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1E3A5F] flex flex-wrap gap-1">
                  {message.citations.map((c, i) => (
                    <CitationLink key={i} sourceFile={c.source} pageNumber={c.page} quote={c.quote} onOpenPDF={onOpenPDF} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#0A192F] border border-[#1E3A5F] rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1E3A5F]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about earnings, guidance..."
            className="flex-1 px-3 py-2 bg-[#0A192F] border border-[#1E3A5F] rounded-lg text-sm text-[#E6F1FF] placeholder-[#495670] focus:outline-none focus:border-[#6C63FF]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5A52D5] disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg.primary }}>
      <PDFViewerPanel {...pdfViewer} onClose={closePDF} />

      {/* Header */}
      <header className="border-b border-[#1E3A5F] sticky top-0 z-20" style={{ backgroundColor: THEME.bg.secondary }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ 
                background: `linear-gradient(135deg, ${THEME.accent.primary}, ${THEME.accent.secondary})`,
                boxShadow: THEME.glow.primary
              }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: THEME.text.primary }}>
                  Financial Analysis Agent
                </h1>
                <p className="text-xs" style={{ color: THEME.text.secondary }}>
                  Autonomous Earnings Intelligence
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sector Select */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.text.tertiary }}>
                  Sector
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2"
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
                <label className="text-[10px] uppercase tracking-wider mb-1" style={{ color: THEME.text.tertiary }}>
                  Company
                </label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  disabled={availableTickers.length === 0}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 disabled:opacity-50"
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
                className="p-2 rounded-lg transition-colors hover:bg-[#1E3A5F] disabled:opacity-50 mt-4"
                style={{ color: THEME.text.secondary }}
              >
                <RefreshCw className={`w-5 h-5 ${(isLoadingMetrics || isLoadingGuidance) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Single Page Dashboard */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Metrics + Upload */}
          <div className="lg:col-span-2 space-y-6">
            <MetricsCard
              data={metricsData}
              isLoading={isLoadingMetrics}
              error={metricsError}
              quarters={displayQuarters}
              onOpenPDF={openPDF}
              onExport={exportToCSV}
              ticker={selectedTicker}
            />
            
            <GuidanceCard
              data={guidanceData}
              isLoading={isLoadingGuidance}
              error={guidanceError}
              quarters={displayQuarters}
              onOpenPDF={openPDF}
            />
          </div>

          {/* Right Column - Chat + Upload */}
          <div className="space-y-6">
            <FileUploadSection onUploadSuccess={() => setTimeout(() => fetchData(selectedTicker), 5000)} />
            <ChatCard ticker={selectedTicker} onOpenPDF={openPDF} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs" style={{ color: THEME.text.tertiary }}>
          <p>Powered by AI • Data extracted from earnings calls & investor presentations</p>
        </div>
      </main>
    </div>
  );
}
