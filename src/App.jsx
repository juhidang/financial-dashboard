import React, { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen, Upload, Download, Brain, ArrowUpRight, ArrowDownRight, Minus,
  LayoutDashboard
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
    'Financial Services': [], 'Telecom': [], 'Industrials': [], 'Auto': [], 'IT Services': [], 'QSR': [],
  },
  // Ensure strict order: Q3, Q4, Q1, Q2 (Oldest to Newest or vice versa - typically Newest Left is best for finance, but user asked for specific order)
  // User request: Last col FY26-Q2 ... First col FY25-Q3.
  // So Left-to-Right: FY25-Q3, FY25-Q4, FY26-Q1, FY26-Q2
  DISPLAY_QUARTERS: ['FY25-Q3', 'FY25-Q4', 'FY26-Q1', 'FY26-Q2'], 
};

// ============================================================================
// UTILITIES & EXPORTS
// ============================================================================
const getConfidenceBadge = (level) => {
  const base = "border px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide inline-block mr-1";
  switch (level?.toUpperCase()) {
    case 'COMMITTED': return `${base} border-emerald-800 bg-emerald-900/30 text-emerald-400`;
    case 'EXPECTED':  return `${base} border-blue-800 bg-blue-900/30 text-blue-400`;
    case 'PLANNED':   return `${base} border-amber-800 bg-amber-900/30 text-amber-400`;
    default:          return `${base} border-slate-700 bg-slate-800 text-slate-400`;
  }
};

const formatValue = (value, currency, unit) => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-600">—</span>;
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const prefix = currency === 'INR' ? '₹' : '';
  const suffix = unit ? ` ${unit}` : '';
  return <span className="font-medium text-white">{prefix}{numValue.toLocaleString('en-IN')}{suffix}</span>;
};

const calculateChange = (current, previous) => {
  if (!current || !previous) return null;
  const curr = parseFloat(String(current).replace(/,/g, ''));
  const prev = parseFloat(String(previous).replace(/,/g, ''));
  if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
};

// EXPORT FUNCTIONS
const exportMetricsToCSV = (data, quarters) => {
  if (!data || !data.metrics) return;
  const headers = ['Metric', 'Unit', ...quarters];
  const rows = data.metrics.map(m => {
    return [
      `"${m.metric_name}"`,
      m.unit || '',
      ...quarters.map(q => m[q]?.value || '')
    ].join(',');
  });
  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, 'key_metrics.csv');
};

const exportGuidanceToCSV = (data, quarters) => {
  if (!data || !data.themes) return;
  const headers = ['Theme', 'Subtheme', 'Quarter', 'Guidance', 'Confidence'];
  const rows = [];
  data.themes.forEach(theme => {
    theme.items.forEach(item => {
      quarters.forEach(q => {
        if (item[q] && item[q].length > 0) {
          item[q].forEach(point => {
            rows.push([
              `"${theme.theme}"`,
              `"${item.subtheme}"`,
              q,
              `"${point.guidance_text.replace(/"/g, '""')}"`, // Escape quotes
              point.confidence_level || ''
            ].join(','));
          });
        }
      });
    });
  });
  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, 'forward_guidance.csv');
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================================
// COMPONENTS
// ============================================================================

// 1. RESIZE HANDLE
const ResizeHandle = ({ className = "" }) => (
  <PanelResizeHandle className={`w-1.5 bg-[#222B35] hover:bg-[#00D2B4] transition-colors flex items-center justify-center group z-20 ${className}`}>
     <div className="h-8 w-0.5 bg-[#3A404A] group-hover:bg-[#1E2125] rounded" />
  </PanelResizeHandle>
);

const HorizontalResizeHandle = () => (
  <PanelResizeHandle className="h-1.5 w-full bg-[#222B35] hover:bg-[#00D2B4] transition-colors flex items-center justify-center group z-20 cursor-row-resize">
    <div className="w-8 h-0.5 bg-[#3A404A] group-hover:bg-[#1E2125] rounded" />
  </PanelResizeHandle>
);

// 2. PDF VIEWER
const PDFViewerPanel = ({ isOpen, onClose, pdfUrl, pageNumber, quote, sourceFile }) => {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { if (isOpen) setIsLoading(true); }, [isOpen, pdfUrl]);

  return (
    <div 
      className={`fixed right-0 top-[57px] bottom-0 bg-[#2C343C] shadow-2xl z-50 flex flex-col border-l border-[#3A404A] transform transition-transform duration-300 ease-in-out`}
      style={{ width: '35%', transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <div className="flex items-center justify-between p-3 border-b border-[#3A404A] bg-[#222B35]">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="w-4 h-4 text-[#00D2B4]" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white truncate max-w-[200px]">{sourceFile || 'Document'}</span>
            <span className="text-xs text-[#AAB2BD]">Page {pageNumber}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-[#353D46] rounded transition-colors">
          <X className="w-5 h-5 text-[#AAB2BD]" />
        </button>
      </div>
      {quote && (
        <div className="p-3 bg-[#1E2125] border-b border-[#3A404A]">
          <p className="text-xs text-[#AAB2BD] border-l-2 border-[#00D2B4] pl-2 italic line-clamp-3">"{quote}"</p>
        </div>
      )}
      <div className="flex-1 relative bg-[#181A1E]">
        {isLoading && pdfUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181A1E] z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#00D2B4]" />
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
          <div className="flex flex-col items-center justify-center h-full text-[#656D78]">
            <BookOpen className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No PDF Selected</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. FILE UPLOAD
const FileUploadSection = ({ onUploadSuccess, onSkip, variant = 'hero' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setIsUploading(true);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append('Upload_Here', file);
      const response = await fetch(CONFIG.INGESTION_FORM_URL, { method: 'POST', body: formData });
      if (response.ok) {
        setUploadStatus({ type: 'success', message: 'Uploaded' });
        if (onUploadSuccess) onUploadSuccess();
      } else throw new Error('Failed');
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Error' });
    } finally {
      setIsUploading(false);
    }
  };

  const containerClass = variant === 'hero' 
    ? "bg-[#2C343C] p-8 rounded-2xl border border-[#3A404A] shadow-xl w-full max-w-lg text-center"
    : "bg-[#2C343C] p-3 rounded-lg border border-[#3A404A]";

  return (
    <div className={containerClass}>
      {variant === 'hero' && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Upload Quarterly Earnings Transcripts</h2>
          <p className="text-[#AAB2BD] text-sm">Upload a PDF to begin the automated analysis pipeline.</p>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center
          ${variant === 'hero' ? 'p-10' : 'p-4'}
          ${isDragging ? 'border-[#00D2B4] bg-[#00D2B4]/5' : 'border-[#3A404A] hover:border-[#656D78] hover:bg-[#353D46]'}
        `}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => handleUpload(e.target.files[0])} className="hidden" />
        {isUploading ? (
          <Loader2 className={`animate-spin text-[#00D2B4] ${variant === 'hero' ? 'w-10 h-10' : 'w-5 h-5'}`} />
        ) : (
          <>
            <Upload className={`text-[#AAB2BD] ${variant === 'hero' ? 'w-12 h-12 mb-3' : 'w-5 h-5 mb-1'}`} />
            <p className="text-[#AAB2BD] text-sm font-medium">
              {variant === 'hero' ? 'Drag & drop or browse' : 'Upload PDF'}
            </p>
          </>
        )}
      </div>

      {variant === 'hero' && (
        <div className="mt-6 pt-4 border-t border-[#3A404A] flex flex-col gap-4">
          <button 
             onClick={onSkip}
             className="w-full py-2 bg-[#3A404A] hover:bg-[#505967] text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            Skip Upload & View Dashboard
          </button>
          <p className="text-[10px] text-[#656D78] uppercase tracking-wide">
            First Ray Capital • Proprietary Sector Playbooks
          </p>
        </div>
      )}
    </div>
  );
};

// 4. METRICS CARD
const MetricsCard = ({ data, isLoading, quarters, ticker }) => {
  // Use data as-is (UNFILTERED) as per Requirement #3
  const metricsList = data?.metrics || [];

  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden w-full">
      <div className="p-3 border-b border-[#3A404A] flex justify-between items-center bg-[#2C343C] shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00D2B4]" />
          <h3 className="font-semibold text-white">Key Metrics</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportMetricsToCSV(data, quarters)} className="p-1.5 hover:bg-[#3A404A] rounded text-[#AAB2BD] hover:text-[#00D2B4]">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#00D2B4]" /></div>
        ) : !data ? (
          <div className="p-6 text-center text-[#656D78] text-sm">No data loaded.</div>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[#222B35] sticky top-0 z-10">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-[#AAB2BD] border-b border-[#3A404A] w-[25%]">Metric</th>
                {quarters.map(q => (
                  <th key={q} className="text-right py-2 px-3 font-medium text-[#AAB2BD] border-b border-[#3A404A] w-[18%]">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricsList.map((m, i) => (
                <tr key={i} className="border-b border-[#3A404A] hover:bg-[#353D46] transition-colors group">
                  <td className="py-2 px-3 font-medium text-[#E0E0E0] group-hover:text-white truncate" title={m.metric_name}>
                    {m.metric_name}
                    <div className="text-[10px] text-[#656D78] font-normal">{m.unit}</div>
                  </td>
                  {quarters.map((q, idx) => {
                     const val = m[q]?.value;
                     // Logic for change: Compare current column Q with next column Q (previous time period)
                     const prevQ = quarters[idx+1]; // Assuming left-to-right is Newest-to-Oldest? 
                     // Wait, user config is FY25-Q3, FY25-Q4, FY26-Q1, FY26-Q2 (Oldest to Newest).
                     // So comparison should be with index-1 (previous column).
                     const prevColQ = quarters[idx-1]; 
                     
                     // If user config is ordered chronologically (Q3, Q4, Q1, Q2), we compare current to previous index
                     const change = idx > 0 ? calculateChange(val, m[prevColQ]?.value) : null;
                     
                     return (
                       <td key={q} className="text-right py-2 px-3">
                         <div className="flex flex-col items-end">
                           {formatValue(val, m.currency, '')}
                           {change && (
                             <span className={`text-[10px] flex items-center ${parseFloat(change) > 0 ? 'text-[#00D2B4]' : 'text-[#FC6E6E]'}`}>
                               {parseFloat(change) > 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                               {Math.abs(change)}%
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
        )}
      </div>
    </div>
  );
};

// 5. GUIDANCE TABLE (Requirement: Strict 4 Column Table)
const GuidanceTable = ({ data, isLoading, quarters, onOpenPDF }) => {
  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden w-full">
      <div className="p-3 border-b border-[#3A404A] flex justify-between items-center bg-[#2C343C] shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#44D9E6]" />
          <h3 className="font-semibold text-white">Forward Guidance</h3>
        </div>
        <button onClick={() => exportGuidanceToCSV(data, quarters)} className="p-1.5 hover:bg-[#3A404A] rounded text-[#AAB2BD] hover:text-[#00D2B4]">
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-auto flex-1 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#44D9E6]" /></div>
        ) : !data ? (
          <div className="p-6 text-center text-[#656D78] text-sm">No guidance data loaded.</div>
        ) : (
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-[#222B35] sticky top-0 z-10">
              <tr>
                {/* Reduced width first column as requested */}
                <th className="text-left py-2 px-3 font-medium text-[#AAB2BD] border-b border-[#3A404A] w-[12%] min-w-[120px]">Topic</th>
                {quarters.map(q => (
                  <th key={q} className="text-left py-2 px-3 font-medium text-[#AAB2BD] border-b border-[#3A404A] w-[22%] min-w-[200px]">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.themes.map((themeGroup) => (
                <React.Fragment key={themeGroup.theme}>
                  {/* Theme Section Header */}
                  <tr className="bg-[#1E2125]">
                    <td colSpan={5} className="py-1 px-3 text-xs font-bold text-[#00D2B4] border-b border-[#3A404A] uppercase tracking-wider">
                      {themeGroup.theme}
                    </td>
                  </tr>
                  
                  {themeGroup.items.map((item, idx) => (
                    <tr key={`${themeGroup.theme}-${idx}`} className="border-b border-[#3A404A] hover:bg-[#353D46] transition-colors align-top">
                      {/* Column 1: Topic */}
                      <td className="py-2 px-3 text-[#E0E0E0] font-medium border-r border-[#3A404A]/30">
                        {item.subtheme}
                      </td>

                      {/* Columns 2-5: Quarters */}
                      {quarters.map(q => {
                        const points = item[q];
                        return (
                          <td key={q} className="py-2 px-3 border-r border-[#3A404A]/30 last:border-0">
                            {points && points.length > 0 ? (
                              points.map((pt, ptIdx) => (
                                <div key={ptIdx} className="mb-2 last:mb-0">
                                  <p className="text-xs text-[#AAB2BD] leading-relaxed mb-1">{pt.guidance_text}</p>
                                  <div className="flex flex-wrap items-center gap-1">
                                    {pt.confidence_level && (
                                      <span dangerouslySetInnerHTML={{ __html: getConfidenceBadge(pt.confidence_level).replace('class="', 'class="scale-90 origin-left ') }} />
                                    )}
                                    {/* Citation Button - Specific Page Number */}
                                    {(pt.source_file || pt.source_filename) && (
                                      <button 
                                        onClick={() => onOpenPDF({ 
                                          sourceFile: pt.source_file || pt.source_filename, 
                                          pageNumber: pt.page_number || pt.guidance_page_number, 
                                          quote: pt.exact_quote, 
                                          pdfUrl: `${CONFIG.SUPABASE_STORAGE_URL}${pt.source_file || pt.source_filename}` 
                                        })}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#1E2125] border border-[#3A404A] rounded text-[10px] text-[#44D9E6] hover:border-[#44D9E6] transition-colors"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>p.{pt.page_number || pt.guidance_page_number || '?'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-[#3A404A] text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// 6. CHAT CARD
const ChatCard = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { setMessages([{ role: 'assistant', content: `Ask Q&A for ${ticker}.` }]); }, [ticker]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(CONFIG.CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: userMsg, ticker })
      });
      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : data;
      const output = result.output || result.response || result.text || '';
      const citations = (result.citations || []).map(c => ({
        sourceFile: c.source_file || c.source || c.sourceFile,
        pageNumber: c.page_number || c.page || c.pageNumber,
        quote: c.quote || c.exact_quote
      }));

      setMessages(p => [...p, { role: 'assistant', content: output, citations }]);
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection Error.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden w-full">
      <div className="p-3 border-b border-[#3A404A] bg-[#2C343C] flex gap-2 items-center shrink-0">
        <MessageSquare className="w-4 h-4 text-[#9F7AEA]" />
        <h3 className="font-semibold text-white">Q&A Assistant</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#1E2125]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg p-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-[#3A404A] text-white border border-[#4E5660]' : 'bg-[#2C343C] text-[#AAB2BD] border border-[#3A404A]'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.citations?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#3A404A] flex flex-wrap gap-2">
                  {m.citations.map((c, idx) => (
                    <button 
                      key={idx}
                      onClick={() => onOpenPDF({ sourceFile: c.sourceFile, pageNumber: c.pageNumber, quote: c.quote, pdfUrl: `${CONFIG.SUPABASE_STORAGE_URL}${c.sourceFile}` })}
                      className="text-[10px] px-2 py-1 bg-[#1E2125] border border-[#3A404A] rounded text-[#44D9E6] hover:border-[#44D9E6] transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3"/> p.{c.pageNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#9F7AEA]" />}
      </div>

      <form onSubmit={handleSend} className="p-2 bg-[#222B35] border-t border-[#3A404A] shrink-0">
        <div className="flex gap-2">
          <input 
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask about margins, guidance..."
            className="flex-1 bg-[#181A1E] border border-[#3A404A] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#9F7AEA]"
          />
          <button type="submit" disabled={loading || !input} className="bg-[#9F7AEA] hover:bg-[#805AD5] text-white p-1.5 rounded transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'dashboard'
  const [sector, setSector] = useState('Healthcare');
  const [ticker, setTicker] = useState('MAXHEALTH');
  const [metrics, setMetrics] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, pdfUrl: null });

  // Update ticker list based on sector
  useEffect(() => {
    const list = CONFIG.SECTORS[sector] || [];
    if (list.length && !list.includes(ticker)) setTicker(list[0]);
  }, [sector]);

  // Main Data Fetcher
  const loadData = async (targetTicker) => {
    const t = targetTicker || ticker;
    setLoading(true);
    try {
      const [mRes, gRes] = await Promise.all([
        fetch(CONFIG.METRICS_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ticker: t }) }),
        fetch(CONFIG.GUIDANCE_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ticker: t }) })
      ]);
      if (mRes.ok) setMetrics(await mRes.json());
      if (gRes.ok) setGuidance(await gRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Logic to Skip Upload -> Load Dashboard with MAXHEALTH
  const handleSkipToDashboard = () => {
    setView('dashboard');
    setTicker('MAXHEALTH');
    loadData('MAXHEALTH');
  };

  return (
    <div className="h-screen flex flex-col bg-[#1E2125] text-[#AAB2BD] font-sans overflow-hidden">
      
      {/* HEADER: Only show filters if in Dashboard View */}
      <header className="h-[56px] border-b border-[#3A404A] bg-[#222B35] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00D2B4] to-[#44D9E6] flex items-center justify-center text-[#1E2125]">
            <Brain className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-white tracking-tight">Financial Analysis Agent</h1>
        </div>

        {view === 'dashboard' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <select 
                value={sector} onChange={e => setSector(e.target.value)}
                className="bg-[#181A1E] border border-[#3A404A] text-white text-xs py-1.5 px-2 rounded focus:outline-none"
              >
                {Object.keys(CONFIG.SECTORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                value={ticker} onChange={e => { setTicker(e.target.value); loadData(e.target.value); }}
                className="bg-[#181A1E] border border-[#3A404A] text-[#00D2B4] font-medium text-xs py-1.5 px-2 rounded focus:outline-none"
              >
                {(CONFIG.SECTORS[sector] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button 
              onClick={() => loadData(ticker)} disabled={loading}
              className="p-1.5 bg-[#3A404A] rounded hover:bg-[#00D2B4] hover:text-[#1E2125] transition-colors text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </header>

      {/* BODY */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* VIEW: LANDING */}
        {view === 'landing' && (
          <div className="h-full flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
            <FileUploadSection 
              onUploadSuccess={() => { setView('dashboard'); loadData(ticker); }} 
              onSkip={handleSkipToDashboard}
              variant="hero" 
            />
          </div>
        )}

        {/* VIEW: DASHBOARD - Resizable Layout */}
        {view === 'dashboard' && (
          <div className="h-full w-full animate-in slide-in-from-bottom-4 duration-500">
            {/* Horizontal Split: Left (Guidance/Chat) vs Right (Metrics) */}
            <PanelGroup direction="horizontal" autoSaveId="dashboard-layout">
              
              {/* LEFT SIDE (Guidance + Chat) */}
              <Panel defaultSize={65} minSize={30}>
                <div className="h-full flex flex-col p-3">
                   {/* Vertical Split inside Left Side */}
                   <PanelGroup direction="vertical">
                      {/* Top: Guidance */}
                      <Panel defaultSize={60} minSize={20}>
                        <div className="h-full pb-1.5">
                          <GuidanceTable
                            data={guidance} 
                            isLoading={loading} 
                            quarters={CONFIG.DISPLAY_QUARTERS} 
                            onOpenPDF={(d) => setPdfViewer({ isOpen: true, ...d })} 
                          />
                        </div>
                      </Panel>
                      
                      <HorizontalResizeHandle />

                      {/* Bottom: Chat */}
                      <Panel defaultSize={40} minSize={20}>
                        <div className="h-full pt-1.5">
                          <ChatCard ticker={ticker} onOpenPDF={(d) => setPdfViewer({ isOpen: true, ...d })} />
                        </div>
                      </Panel>
                   </PanelGroup>
                </div>
              </Panel>

              <ResizeHandle />

              {/* RIGHT SIDE (Metrics) */}
              <Panel defaultSize={35} minSize={20}>
                <div className="h-full p-3 pl-0">
                  <MetricsCard 
                    data={metrics} 
                    isLoading={loading} 
                    quarters={CONFIG.DISPLAY_QUARTERS} 
                    ticker={ticker} 
                  />
                </div>
              </Panel>

            </PanelGroup>
          </div>
        )}

        {/* PDF OVERLAY - Slides in from right, covers Metrics Panel */}
        <PDFViewerPanel 
          {...pdfViewer} 
          onClose={() => setPdfViewer(p => ({ ...p, isOpen: false }))} 
        />
        
      </main>
    </div>
  );
}