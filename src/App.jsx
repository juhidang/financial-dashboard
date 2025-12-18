import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen, Upload, Download, Brain, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

// ============================================================================
// CONFIGURATION (UNTOUCHED)
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
  EXCLUDED_METRICS: ['Revenue', 'EBITDA', 'Gross Revenue', 'Net Revenue'],
  DISPLAY_QUARTERS: ['FY26-Q2', 'FY26-Q1', 'FY25-Q4', 'FY25-Q3'],
};

// ============================================================================
// THEME: PROFESSIONAL GUNMETAL
// ============================================================================
const THEME = {
  bg: {
    primary: '#1E2125',      // Gunmetal Dark
    secondary: '#222B35',    // Header/Sidebar
    card: '#2C343C',         // Card Background
    hover: '#353D46',        // Hover state
    input: '#181A1E',        // Input fields
  },
  text: {
    primary: '#FFFFFF',      // Pure White Headers
    secondary: '#AAB2BD',    // Light Grey body
    muted: '#656D78',        // Muted labels
  },
  accent: {
    teal: '#00D2B4',         // Mint/Teal (Primary Action)
    blue: '#44D9E6',         // Sky Blue (Secondary)
    purple: '#9F7AEA',       // Soft Purple (Accents)
    red: '#FC6E6E',          // Soft Red
  },
  border: '#3A404A',         // Subtle Borders
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getConfidenceBadge = (level) => {
  const base = "border px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide";
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

const filterMetrics = (metrics) => {
  if (!metrics) return [];
  return metrics.filter(metric => 
    !CONFIG.EXCLUDED_METRICS.some(excluded => metric.metric_name?.toLowerCase().includes(excluded.toLowerCase()))
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// 1. PDF VIEWER - Slides over the Right Column
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
          <p className="text-xs text-[#AAB2BD] border-l-2 border-[#00D2B4] pl-2 italic line-clamp-3">
            "{quote}"
          </p>
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

// 2. FILE UPLOAD - Adaptive (Hero vs Compact)
const FileUploadSection = ({ onUploadSuccess, variant = 'hero' }) => {
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
        <div className="mt-6 pt-4 border-t border-[#3A404A]">
          <p className="text-[10px] text-[#656D78] uppercase tracking-wide">
            This dashboard is custom-built using proprietary sector playbooks of First Ray Capital. Unauthorized access is prohibited.
          </p>
        </div>
      )}
    </div>
  );
};

// 3. METRICS CARD (Right Column)
const MetricsCard = ({ data, isLoading, quarters, ticker }) => {
  const filtered = data?.metrics ? filterMetrics(data.metrics) : [];

  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#3A404A] flex justify-between items-center bg-[#2C343C]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00D2B4]" />
          <h3 className="font-semibold text-white">Key Metrics</h3>
        </div>
        <span className="text-xs text-[#656D78]">{ticker}</span>
      </div>

      <div className="overflow-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#00D2B4]" /></div>
        ) : !data ? (
          <div className="p-6 text-center text-[#656D78] text-sm">No metrics data loaded.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#222B35] sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-[#AAB2BD] border-b border-[#3A404A]">Metric</th>
                {quarters.map(q => (
                  <th key={q} className="text-right py-3 px-4 font-medium text-[#AAB2BD] border-b border-[#3A404A]">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={i} className="border-b border-[#3A404A] hover:bg-[#353D46] transition-colors group">
                  <td className="py-2.5 px-4 font-medium text-[#E0E0E0] group-hover:text-white">
                    {m.metric_name}
                    <div className="text-[10px] text-[#656D78] font-normal">{m.unit}</div>
                  </td>
                  {quarters.map((q, idx) => {
                     const val = m[q]?.value;
                     const prev = quarters[idx+1] ? m[quarters[idx+1]]?.value : null;
                     const change = calculateChange(val, prev);
                     return (
                       <td key={q} className="text-right py-2.5 px-4">
                         <div className="flex flex-col items-end">
                           {formatValue(val, m.currency, '')}
                           {change && idx === 0 && (
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

// 4. GUIDANCE CARD (Left Column - Top)
const GuidanceCard = ({ data, isLoading, quarters, onOpenPDF }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (t) => setExpanded(prev => ({ ...prev, [t]: !prev[t] }));
  
  // Auto-expand first theme on load
  useEffect(() => {
    if (data?.themes && Object.keys(expanded).length === 0) {
        setExpanded({ [data.themes[0].theme]: true });
    }
  }, [data]);

  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#3A404A] flex justify-between items-center bg-[#2C343C]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#44D9E6]" />
          <h3 className="font-semibold text-white">Forward Guidance</h3>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#44D9E6]" /></div>
        ) : !data ? (
          <div className="p-6 text-center text-[#656D78] text-sm">No guidance data loaded.</div>
        ) : (
          <div className="space-y-2">
            {data.themes.map((group) => (
              <div key={group.theme} className="bg-[#222B35] rounded border border-[#3A404A] overflow-hidden">
                <button onClick={() => toggle(group.theme)} className="w-full flex items-center justify-between p-3 hover:bg-[#353D46]">
                  <span className="font-medium text-sm text-[#E0E0E0]">{group.theme}</span>
                  {expanded[group.theme] ? <ChevronDown className="w-4 h-4 text-[#AAB2BD]" /> : <ChevronRight className="w-4 h-4 text-[#AAB2BD]" />}
                </button>
                {expanded[group.theme] && (
                  <div className="p-3 bg-[#1E2125] border-t border-[#3A404A] grid gap-4">
                    {group.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_3fr] gap-4 border-b border-[#3A404A] last:border-0 pb-3 last:pb-0">
                         <div className="text-xs font-semibold text-[#44D9E6] pt-1">{item.subtheme}</div>
                         <div className="space-y-3">
                           {quarters.map(q => {
                             const points = item[q];
                             if (!points || !points.length) return null;
                             return (
                               <div key={q}>
                                 <span className="text-[10px] font-bold text-[#656D78] uppercase mb-1 block">{q}</span>
                                 {points.map((pt, i) => (
                                   <div key={i} className="mb-2">
                                     <p className="text-xs text-[#AAB2BD] leading-relaxed mb-1">{pt.guidance_text}</p>
                                     <div className="flex items-center gap-2">
                                       {pt.confidence_level && <span className={getConfidenceBadge(pt.confidence_level)}>{pt.confidence_level}</span>}
                                       {(pt.source_file || pt.source_filename) && (
                                         <button 
                                           onClick={() => onOpenPDF({ sourceFile: pt.source_file || pt.source_filename, pageNumber: pt.page_number || pt.guidance_page_number, quote: pt.exact_quote, pdfUrl: `${CONFIG.SUPABASE_STORAGE_URL}${pt.source_file || pt.source_filename}` })}
                                           className="text-[10px] text-[#44D9E6] hover:underline flex items-center gap-1"
                                         >
                                           <FileText className="w-3 h-3"/> Ref
                                         </button>
                                       )}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             );
                           })}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 5. CHAT CARD (Left Column - Bottom)
const ChatCard = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { 
    setMessages([{ role: 'assistant', content: `Analyze ${ticker} earnings & transcripts.` }]);
  }, [ticker]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

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
      // Handle array or object response
      const result = Array.isArray(data) ? data[0] : data;
      const output = result.output || result.response || result.text || '';
      const citations = (result.citations || []).map(c => ({
        sourceFile: c.source_file || c.source || c.sourceFile,
        pageNumber: c.page_number || c.page || c.pageNumber,
        quote: c.quote || c.exact_quote
      }));

      setMessages(p => [...p, { role: 'assistant', content: output, citations }]);
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: 'Error connecting to agent.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2C343C] rounded-lg border border-[#3A404A] flex flex-col h-full shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#3A404A] bg-[#2C343C] flex gap-2 items-center">
        <MessageSquare className="w-4 h-4 text-[#9F7AEA]" />
        <h3 className="font-semibold text-white">Q&A Assistant</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1E2125]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-lg p-3 text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-[#3A404A] text-white border border-[#4E5660]' 
                : 'bg-[#2C343C] text-[#AAB2BD] border border-[#3A404A]'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.citations?.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#3A404A] flex flex-wrap gap-2">
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

      <form onSubmit={handleSend} className="p-3 bg-[#222B35] border-t border-[#3A404A]">
        <div className="flex gap-2">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about margins, guidance, or strategy..."
            className="flex-1 bg-[#181A1E] border border-[#3A404A] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#9F7AEA]"
          />
          <button type="submit" disabled={loading || !input} className="bg-[#9F7AEA] hover:bg-[#805AD5] text-white p-2 rounded transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [sector, setSector] = useState('Healthcare');
  const [ticker, setTicker] = useState('MAXHEALTH');
  const [metrics, setMetrics] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfViewer, setPdfViewer] = useState({ isOpen: false, pdfUrl: null });

  // Reset when sector changes
  useEffect(() => {
    const list = CONFIG.SECTORS[sector] || [];
    if (list.length && !list.includes(ticker)) setTicker(list[0]);
  }, [sector]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch concurrently
      const [mRes, gRes] = await Promise.all([
        fetch(CONFIG.METRICS_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ticker }) }),
        fetch(CONFIG.GUIDANCE_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ticker }) })
      ]);
      if (mRes.ok) setMetrics(await mRes.json());
      if (gRes.ok) setGuidance(await gRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // State: Has Data Loaded?
  const hasData = metrics || guidance;

  return (
    <div className="h-screen flex flex-col bg-[#1E2125] text-[#AAB2BD] font-sans overflow-hidden">
      
      {/* GLOBAL HEADER */}
      <header className="h-[56px] border-b border-[#3A404A] bg-[#222B35] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#00D2B4] to-[#44D9E6] flex items-center justify-center text-[#1E2125]">
            <Brain className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-white tracking-tight">Financial Analysis Agent</h1>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select 
              value={sector} onChange={e => setSector(e.target.value)}
              className="bg-[#181A1E] border border-[#3A404A] text-white text-xs py-1.5 px-2 rounded focus:outline-none"
            >
              {Object.keys(CONFIG.SECTORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              value={ticker} onChange={e => setTicker(e.target.value)}
              className="bg-[#181A1E] border border-[#3A404A] text-[#00D2B4] font-medium text-xs py-1.5 px-2 rounded focus:outline-none"
            >
              {(CONFIG.SECTORS[sector] || []).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button 
            onClick={loadData} disabled={loading}
            className="p-1.5 bg-[#3A404A] rounded hover:bg-[#00D2B4] hover:text-[#1E2125] transition-colors text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* VIEW 1: LANDING PAGE (No Data) */}
        {!hasData && (
          <div className="h-full flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
            <FileUploadSection onUploadSuccess={loadData} variant="hero" />
            
            {loading && (
               <div className="mt-8 flex items-center gap-2 text-[#00D2B4]">
                 <Loader2 className="animate-spin w-5 h-5" />
                 <span>Initializing Sector Playbooks...</span>
               </div>
            )}
          </div>
        )}

        {/* VIEW 2: DASHBOARD (Data Loaded) */}
        {hasData && (
          <div className="h-full w-full p-4 grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* LEFT COLUMN: GUIDANCE & CHAT (Flex-grow) */}
            <div className="flex flex-col gap-4 h-full min-h-0">
              {/* Guidance - Top Half */}
              <div className="flex-1 min-h-0">
                 <GuidanceCard 
                   data={guidance} 
                   isLoading={loading} 
                   quarters={metrics?.quarters || CONFIG.DISPLAY_QUARTERS} 
                   onOpenPDF={(d) => setPdfViewer({ isOpen: true, ...d })} 
                 />
              </div>
              {/* Chat - Bottom Half */}
              <div className="flex-[0.8] min-h-0">
                 <ChatCard ticker={ticker} onOpenPDF={(d) => setPdfViewer({ isOpen: true, ...d })} />
              </div>
            </div>

            {/* RIGHT COLUMN: METRICS (Fixed width approx) */}
            <div className="flex flex-col h-full min-h-0">
              <MetricsCard 
                data={metrics} 
                isLoading={loading} 
                quarters={metrics?.quarters || CONFIG.DISPLAY_QUARTERS} 
                ticker={ticker} 
              />
            </div>
          </div>
        )}

        {/* PDF OVERLAY - Slides in from right, covers RIGHT COLUMN */}
        <PDFViewerPanel 
          {...pdfViewer} 
          onClose={() => setPdfViewer(p => ({ ...p, isOpen: false }))} 
        />
        
      </main>
    </div>
  );
}