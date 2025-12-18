import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  ExternalLink, Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen, Upload, Download, Brain, ArrowUpRight, ArrowDownRight, Minus, Check
} from 'lucide-react';

// ============================================================================
// CONFIGURATION - Update with your actual URLs
// ============================================================================
const CONFIG = {
  // Your n8n webhook URLs
  METRICS_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/metrics-compare',
  GUIDANCE_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/guidance-compare',
  CHAT_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/chat',
  
  // Ingestion Pipeline Form URL
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
  
  // Metrics to HIDE from display (removed as per user request)
  HIDDEN_METRICS: ['Revenue', 'EBITDA'],
  
  // Display quarters
  DISPLAY_QUARTERS: ['FY26-Q2', 'FY26-Q1', 'FY25-Q4', 'FY25-Q3'],
};

// ============================================================================
// THEME COLORS
// ============================================================================
const THEME = {
  bg: {
    primary: '#0A192F',
    secondary: '#112240',
    tertiary: '#1E3A5F',
    input: '#0D1F3C',
  },
  text: {
    primary: '#E6F1FF',
    secondary: '#8892B0',
    tertiary: '#495670',
  },
  accent: {
    primary: '#6C63FF',
    secondary: '#4D7CFF',
    highlight: '#00FFC6',
    cyan: '#00E5FF',
  },
  semantic: {
    positive: '#00FFC6',
    negative: '#FF4757',
    warning: '#FFD93D',
  },
  border: '#1E3A5F',
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

const formatValue = (value, currency) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#495670]">—</span>;
  }
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const prefix = currency === 'INR' ? '₹' : '';
  const formattedValue = numValue.toLocaleString('en-IN');
  return <span className="font-semibold text-[#E6F1FF]">{prefix}{formattedValue}</span>;
};

const calculateChange = (current, previous) => {
  if (!current || !previous) return null;
  const curr = parseFloat(String(current).replace(/,/g, ''));
  const prev = parseFloat(String(previous).replace(/,/g, ''));
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
};

const exportToCSV = (data, filename) => {
  if (!data || !data.metrics) return;
  const quarters = data.quarters || [];
  const headers = ['Metric', 'Unit', ...quarters];
  const rows = data.metrics.map(m => [
    m.metric_name, m.unit || '', ...quarters.map(q => m[q]?.value || '')
  ].join(','));
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
// PDF VIEWER PANEL - Smoother transition
// ============================================================================
const PDFViewerPanel = ({ isOpen, onClose, pdfUrl, pageNumber, quote, sourceFile }) => {
  const [copied, setCopied] = useState(false);

  const copyQuote = () => {
    if (quote) {
      navigator.clipboard.writeText(quote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop - smoother */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Panel - smoother slide */}
      <div className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-[#0A192F] shadow-2xl z-50 flex flex-col border-l border-[#1E3A5F] transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F] bg-[#112240]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6C63FF] rounded-lg">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#E6F1FF] text-sm">{sourceFile || 'Document'}</h3>
              <p className="text-xs text-[#8892B0]">Page {pageNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1E3A5F] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#8892B0]" />
          </button>
        </div>

        {/* Quote */}
        {quote && (
          <div className="p-3 bg-[#6C63FF]/10 border-b border-[#1E3A5F]">
            <p className="text-xs text-[#00FFC6] font-medium mb-1">📌 Referenced Quote</p>
            <p className="text-xs text-[#E6F1FF] italic leading-relaxed">"{quote}"</p>
            <button onClick={copyQuote} className="mt-2 text-xs text-[#6C63FF] hover:text-[#00FFC6]">
              {copied ? '✓ Copied!' : '📋 Copy quote'}
            </button>
          </div>
        )}

        {/* PDF */}
        <div className="flex-1 overflow-hidden bg-[#0D1F3C]">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#page=${pageNumber}`} className="w-full h-full border-0" title="PDF" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8892B0] p-6">
              <BookOpen className="w-12 h-12 mb-3 text-[#1E3A5F]" />
              <p className="font-medium text-[#E6F1FF]">PDF Not Available</p>
              <p className="text-xs mt-1 text-center">Source: {sourceFile}, Page {pageNumber}</p>
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
  const handleClick = (e) => {
    e.stopPropagation();
    onOpenPDF({
      sourceFile,
      pageNumber: pageNumber || 1,
      quote,
      pdfUrl: sourceFile ? `${CONFIG.SUPABASE_STORAGE_URL}${sourceFile}` : null
    });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded transition-colors text-[#8892B0] hover:text-[#00FFC6]"
    >
      <FileText className="w-2.5 h-2.5" />
      p.{pageNumber || '?'}
    </button>
  );
};

// ============================================================================
// COMPACT FILE UPLOAD
// ============================================================================
const FileUploadCompact = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('Upload_Here', file);
      const response = await fetch(CONFIG.INGESTION_FORM_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setStatus({ type: 'success', msg: 'Uploaded! Processing...' });
        if (onUploadSuccess) setTimeout(() => onUploadSuccess(), 5000);
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      setStatus({ type: 'error', msg: 'Upload failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] p-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
            isUploading 
              ? 'bg-[#1E3A5F] text-[#8892B0]' 
              : 'bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 text-[#6C63FF]'
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{isUploading ? 'Processing...' : 'Upload PDF'}</span>
        </label>
        
        {status && (
          <span className={`text-xs flex items-center gap-1 ${
            status.type === 'success' ? 'text-[#00FFC6]' : 'text-[#FF4757]'
          }`}>
            {status.type === 'success' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {status.msg}
          </span>
        )}
        
        {!status && !isUploading && (
          <span className="text-xs text-[#495670]">Transcript or Presentation</span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// METRICS SECTION
// ============================================================================
const MetricsSection = ({ data, isLoading, error, quarters, onExport, ticker }) => {
  if (isLoading) {
    return (
      <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] p-4 h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6C63FF]" />
        <span className="ml-2 text-[#8892B0] text-sm">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#112240] rounded-lg border border-[#FF4757]/30 p-4 h-full flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-[#FF4757] mb-2" />
        <p className="text-[#FF4757] text-sm">Error: {error}</p>
      </div>
    );
  }

  // Filter out hidden metrics
  const filteredMetrics = data?.metrics?.filter(
    m => !CONFIG.HIDDEN_METRICS.includes(m.metric_name)
  ) || [];

  if (filteredMetrics.length === 0) {
    return (
      <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] p-4 h-full flex flex-col items-center justify-center">
        <TrendingUp className="w-8 h-8 text-[#1E3A5F] mb-2" />
        <p className="text-[#8892B0] text-sm">No metrics data</p>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E3A5F] bg-[#0A192F]/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#6C63FF]" />
          <h3 className="font-semibold text-[#E6F1FF] text-sm">Key Metrics</h3>
        </div>
        <button
          onClick={() => onExport(data, ticker)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-[#1E3A5F] hover:bg-[#6C63FF]/30 rounded transition-colors text-[#8892B0] hover:text-[#00FFC6]"
        >
          <Download className="w-3 h-3" />
          CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0">
            <tr className="bg-[#1E3A5F]">
              <th className="text-left py-2 px-3 font-semibold text-[#E6F1FF]">Metric</th>
              {quarters.map((q) => (
                <th key={q} className="text-right py-2 px-3 font-semibold text-[#E6F1FF]">{q}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.map((metric, idx) => (
              <tr key={metric.metric_name} className={`border-t border-[#1E3A5F]/30 hover:bg-[#1E3A5F]/20`}>
                <td className="py-2 px-3">
                  <div className="text-[#E6F1FF]">{metric.metric_name}</div>
                  <div className="text-[10px] text-[#495670]">{metric.unit}</div>
                </td>
                {quarters.map((q, qIdx) => {
                  const val = metric[q];
                  const prevQ = quarters[qIdx + 1];
                  const prevVal = prevQ ? metric[prevQ] : null;
                  const change = calculateChange(val?.value, prevVal?.value);
                  
                  return (
                    <td key={q} className="text-right py-2 px-3">
                      {formatValue(val?.value, metric.currency)}
                      {change !== null && qIdx === 0 && (
                        <div className={`text-[10px] flex items-center justify-end gap-0.5 ${
                          parseFloat(change) > 0 ? 'text-[#00FFC6]' : parseFloat(change) < 0 ? 'text-[#FF4757]' : 'text-[#8892B0]'
                        }`}>
                          {parseFloat(change) > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : 
                           parseFloat(change) < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : 
                           <Minus className="w-2.5 h-2.5" />}
                          {Math.abs(parseFloat(change))}%
                        </div>
                      )}
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
// GUIDANCE SECTION - Fixed with quarter headers
// ============================================================================
const GuidanceSection = ({ data, isLoading, error, quarters, onOpenPDF }) => {
  const [expandedThemes, setExpandedThemes] = useState({});

  useEffect(() => {
    if (data?.themes) {
      const initial = {};
      data.themes.forEach((theme, idx) => {
        initial[theme.theme] = idx < 2; // Expand first 2 themes
      });
      setExpandedThemes(initial);
    }
  }, [data]);

  const toggleTheme = (theme) => {
    setExpandedThemes(prev => ({ ...prev, [theme]: !prev[theme] }));
  };

  const themeConfig = {
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
      <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] p-4 h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6C63FF]" />
        <span className="ml-2 text-[#8892B0] text-sm">Loading guidance...</span>
      </div>
    );
  }

  if (error || !data?.themes?.length) {
    return (
      <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] p-4 h-full flex flex-col items-center justify-center">
        <Calendar className="w-8 h-8 text-[#1E3A5F] mb-2" />
        <p className="text-[#8892B0] text-sm">{error || 'No guidance data'}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] overflow-hidden h-full flex flex-col">
      {/* Header with quarter columns */}
      <div className="border-b border-[#1E3A5F] bg-[#0A192F]/50">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1E3A5F]/50">
          <Calendar className="w-4 h-4 text-[#6C63FF]" />
          <h3 className="font-semibold text-[#E6F1FF] text-sm">Forward Guidance</h3>
        </div>
        {/* Quarter headers */}
        <div className="grid grid-cols-5 text-xs">
          <div className="px-3 py-1.5 text-[#8892B0] font-medium">Theme / Topic</div>
          {quarters.map(q => (
            <div key={q} className="px-2 py-1.5 text-[#E6F1FF] font-semibold text-center bg-[#1E3A5F]/50">{q}</div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {data.themes.map((themeGroup) => {
          const tc = themeConfig[themeGroup.theme] || themeConfig.OTHER;
          return (
            <div key={themeGroup.theme} className="border-b border-[#1E3A5F]/30 last:border-0">
              {/* Theme header */}
              <button
                onClick={() => toggleTheme(themeGroup.theme)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1E3A5F]/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{tc.icon}</span>
                  <span className="font-medium text-[#E6F1FF] text-xs">{themeGroup.theme}</span>
                  <span className="text-[10px] text-[#495670]">({themeGroup.items?.length || 0})</span>
                </div>
                {expandedThemes[themeGroup.theme] ? 
                  <ChevronDown className="w-3 h-3 text-[#8892B0]" /> : 
                  <ChevronRight className="w-3 h-3 text-[#8892B0]" />
                }
              </button>
              
              {/* Items */}
              {expandedThemes[themeGroup.theme] && themeGroup.items?.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 border-t border-[#1E3A5F]/20 text-xs">
                  {/* Subtheme */}
                  <div className="px-3 py-2 text-[#8892B0] bg-[#0A192F]/30">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: tc.color }} />
                      {item.subtheme}
                    </div>
                  </div>
                  
                  {/* Quarter cells */}
                  {quarters.map(q => {
                    const gList = item[q];
                    return (
                      <div key={q} className="px-2 py-2 border-l border-[#1E3A5F]/20">
                        {gList && Array.isArray(gList) && gList.length > 0 ? (
                          gList.map((g, gIdx) => (
                            <div key={gIdx} className="mb-2 last:mb-0">
                              <p className="text-[#E6F1FF] text-[11px] leading-relaxed mb-1">{g.guidance_text}</p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {g.confidence_level && (
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                                    getConfidenceBadge(g.confidence_level).bg
                                  } ${getConfidenceBadge(g.confidence_level).text}`}>
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
                          <span className="text-[#1E3A5F]">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// CHAT SECTION - Fixed scroll behavior
// ============================================================================
const ChatSection = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Ask me about ${ticker}'s earnings, guidance, or metrics.`
    }]);
  }, [ticker]);

  // Scroll only within the chat container
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      let data = await response.json();
      
      // Handle array response format: [{ output, citations }]
      if (Array.isArray(data) && data.length > 0) {
        data = data[0];
      }
      
      // Extract response text
      const responseText = data.output || data.response || data.text || JSON.stringify(data);
      
      // Extract citations
      const citations = data.citations || [];

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        citations: citations
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
    <div className="bg-[#112240] rounded-lg border border-[#1E3A5F] overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1E3A5F] bg-[#0A192F]/50">
        <MessageSquare className="w-4 h-4 text-[#6C63FF]" />
        <h3 className="font-semibold text-[#E6F1FF] text-sm">Ask Questions</h3>
      </div>

      {/* Messages - scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight: 'calc(100% - 100px)' }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg p-2 text-xs ${
              msg.role === 'user'
                ? 'bg-[#6C63FF] text-white'
                : msg.isError
                ? 'bg-[#FF4757]/20 text-[#FF4757]'
                : 'bg-[#0A192F] border border-[#1E3A5F] text-[#E6F1FF]'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1E3A5F] flex flex-wrap gap-1">
                  {msg.citations.map((c, i) => (
                    <CitationLink 
                      key={i} 
                      sourceFile={c.source || c.source_file || c.source_filename} 
                      pageNumber={c.page || c.page_number} 
                      quote={c.quote || c.text || c.exact_quote} 
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
            <div className="bg-[#0A192F] border border-[#1E3A5F] rounded-lg p-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#6C63FF]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[#1E3A5F]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about earnings, guidance..."
            className="flex-1 px-3 py-2 bg-[#0A192F] border border-[#1E3A5F] rounded-lg text-xs text-[#E6F1FF] placeholder-[#495670] focus:outline-none focus:border-[#6C63FF]"
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
    if (!ticker) return;
    
    setIsLoadingMetrics(true);
    setIsLoadingGuidance(true);
    setMetricsError(null);
    setGuidanceError(null);

    try {
      const res = await fetch(CONFIG.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMetricsData(await res.json());
    } catch (e) {
      setMetricsError(e.message);
    } finally {
      setIsLoadingMetrics(false);
    }

    try {
      const res = await fetch(CONFIG.GUIDANCE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGuidanceData(await res.json());
    } catch (e) {
      setGuidanceError(e.message);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTicker);
  }, [selectedTicker]);

  useEffect(() => {
    const tickers = CONFIG.SECTORS[selectedSector] || [];
    if (tickers.length > 0 && !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers[0]);
    }
  }, [selectedSector]);

  const quarters = metricsData?.quarters || guidanceData?.quarters || CONFIG.DISPLAY_QUARTERS;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: THEME.bg.primary }}>
      {/* PDF Viewer */}
      <PDFViewerPanel {...pdfViewer} onClose={closePDF} />

      {/* Header - Compact */}
      <header className="border-b border-[#1E3A5F] flex-shrink-0" style={{ backgroundColor: THEME.bg.secondary }}>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6C63FF] to-[#00FFC6]">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#E6F1FF]">Financial Analysis Agent</h1>
                <p className="text-[10px] text-[#8892B0]">Autonomous Earnings Intelligence</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Sector */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[#495670] uppercase tracking-wider">Sector</label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="px-2 py-1 rounded text-xs font-medium bg-[#0D1F3C] border border-[#1E3A5F] text-[#E6F1FF] focus:outline-none focus:border-[#6C63FF]"
                >
                  {Object.keys(CONFIG.SECTORS).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Ticker */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[#495670] uppercase tracking-wider">Company</label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  disabled={availableTickers.length === 0}
                  className="px-2 py-1 rounded text-xs font-medium bg-[#0D1F3C] border border-[#1E3A5F] text-[#00FFC6] focus:outline-none focus:border-[#6C63FF] disabled:opacity-50"
                >
                  {availableTickers.length > 0 ? (
                    availableTickers.map(t => <option key={t} value={t}>{t}</option>)
                  ) : (
                    <option value="">No companies</option>
                  )}
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchData(selectedTicker)}
                disabled={isLoadingMetrics || isLoadingGuidance}
                className="p-1.5 rounded hover:bg-[#1E3A5F] transition-colors text-[#8892B0] disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${(isLoadingMetrics || isLoadingGuidance) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Company Name Banner + Upload */}
      <div className="px-4 py-2 border-b border-[#1E3A5F]/50 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: THEME.bg.primary }}>
        <h2 className="text-xl font-bold text-[#E6F1FF]">
          {selectedTicker}
          <span className="text-sm font-normal text-[#8892B0] ml-2">Quarterly Analysis</span>
        </h2>
        <FileUploadCompact onUploadSuccess={() => fetchData(selectedTicker)} />
      </div>

      {/* Main Content - Full width, split layout */}
      <main className="flex-1 overflow-hidden px-4 py-3">
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left: Metrics + Guidance (stacked 50/50) */}
          <div className="col-span-8 flex flex-col gap-3 h-full">
            <div className="flex-1 min-h-0">
              <MetricsSection
                data={metricsData}
                isLoading={isLoadingMetrics}
                error={metricsError}
                quarters={quarters}
                onExport={exportToCSV}
                ticker={selectedTicker}
              />
            </div>
            <div className="flex-1 min-h-0">
              <GuidanceSection
                data={guidanceData}
                isLoading={isLoadingGuidance}
                error={guidanceError}
                quarters={quarters}
                onOpenPDF={openPDF}
              />
            </div>
          </div>

          {/* Right: Chat */}
          <div className="col-span-4 h-full">
            <ChatSection ticker={selectedTicker} onOpenPDF={openPDF} />
          </div>
        </div>
      </main>
    </div>
  );
}
