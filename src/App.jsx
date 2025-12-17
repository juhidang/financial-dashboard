import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, FileText, TrendingUp, MessageSquare, ChevronDown, ChevronRight, 
  ExternalLink, Loader2, Building2, Calendar, RefreshCw, X, AlertCircle,
  BookOpen
} from 'lucide-react';

// ============================================================================
// CONFIGURATION - Update these values
// ============================================================================
const CONFIG = {
  // Your n8n webhook URLs (use without -test for production)
  METRICS_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook-test/metrics-compare',
  GUIDANCE_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook-test/guidance-compare',
  CHAT_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook-test/chat',
  
  // Supabase Storage URL for PDFs (update with your project URL)
  // Format: https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/earnings-documents/
  SUPABASE_STORAGE_URL: 'https://xogwcwqqqtavklturbrt.supabase.co/storage/v1/object/public/earnings-documents/',
  
  // Available tickers (add more as you ingest data)
  AVAILABLE_TICKERS: ['MAXHEALTH'],
  
  // Quarters to display (newest first)
  DISPLAY_QUARTERS: ['FY26-Q2', 'FY26-Q1', 'FY25-Q4', 'FY25-Q3'],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Confidence level styling
const getConfidenceBadge = (level) => {
  const styles = {
    COMMITTED: 'bg-green-100 text-green-800 border-green-200',
    EXPECTED: 'bg-blue-100 text-blue-800 border-blue-200',
    PLANNED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ON_TRACK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ACHIEVED: 'bg-purple-100 text-purple-800 border-purple-200',
    DEFAULT: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return styles[level?.toUpperCase()] || styles.DEFAULT;
};

// Format metric values with Indian number formatting
const formatValue = (value, currency, unit) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-300">—</span>;
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  const prefix = currency === 'INR' ? '₹' : '';
  const suffix = unit ? ` ${unit}` : '';
  
  // Format large numbers with Indian comma system
  const formattedValue = numValue.toLocaleString('en-IN');
  
  return (
    <span className="font-medium text-slate-800">
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

// ============================================================================
// PDF VIEWER PANEL COMPONENT
// ============================================================================
const PDFViewerPanel = ({ isOpen, onClose, pdfUrl, pageNumber, quote, sourceFile }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-800">{sourceFile || 'Document'}</h3>
              <p className="text-sm text-slate-500">Page {pageNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Quote Highlight */}
        {quote && (
          <div className="p-4 bg-yellow-50 border-b border-yellow-100">
            <p className="text-sm font-medium text-yellow-800 mb-1">📌 Referenced Quote:</p>
            <p className="text-sm text-yellow-900 italic">"{quote}"</p>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#page=${pageNumber}`}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium">PDF Not Available</p>
              <p className="text-sm mt-2">Configure Supabase Storage to view source documents</p>
              <div className="mt-4 p-4 bg-slate-100 rounded-lg max-w-md text-left">
                <p className="text-xs text-slate-600">
                  <strong>Source:</strong> {sourceFile}<br/>
                  <strong>Page:</strong> {pageNumber}<br/>
                  {quote && <><strong>Quote:</strong> "{quote.substring(0, 100)}..."</>}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ============================================================================
// CITATION LINK COMPONENT
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
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors text-slate-600"
      title={`View source: ${sourceFile}, Page ${pageNumber}`}
    >
      <FileText className="w-3 h-3" />
      <span>p.{pageNumber}</span>
      <ExternalLink className="w-3 h-3" />
    </button>
  );
};

// ============================================================================
// SECTION 1: METRICS COMPARISON TABLE
// ============================================================================
const MetricsSection = ({ data, isLoading, error, quarters, onOpenPDF }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-600">Loading metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p className="font-medium">Error loading metrics</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No metrics data available</p>
        <p className="text-sm mt-1">Select a company with ingested data to view metrics</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <th className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 sticky left-0 bg-gradient-to-r from-blue-50 to-indigo-50 z-10 min-w-48">
              Metric
            </th>
            {quarters.map((quarter) => (
              <th key={quarter} className="text-right py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 min-w-32">
                {quarter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.metrics.map((metric, idx) => (
            <tr key={metric.metric_name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              <td className="py-3 px-4 border-b border-slate-100 sticky left-0 bg-inherit z-10">
                <div className="font-medium text-slate-700">{metric.metric_name}</div>
                {(metric.unit || metric.currency) && (
                  <div className="text-xs text-slate-400">
                    {metric.currency && metric.currency !== '' ? `${metric.currency} ` : ''}{metric.unit}
                  </div>
                )}
              </td>
              {quarters.map((quarter) => {
                const quarterData = metric[quarter];
                return (
                  <td key={quarter} className="text-right py-3 px-4 border-b border-slate-100">
                    <div className="flex flex-col items-end gap-1">
                      {formatValue(
                        quarterData?.value,
                        metric.currency,
                        ''
                      )}
                      {quarterData?.page_number && quarterData?.source_file && (
                        <CitationLink
                          sourceFile={quarterData.source_file}
                          pageNumber={quarterData.page_number}
                          quote={quarterData.exact_quote}
                          onOpenPDF={onOpenPDF}
                        />
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
  );
};

// ============================================================================
// SECTION 2: GUIDANCE COMPARISON
// ============================================================================
const GuidanceSection = ({ data, isLoading, error, quarters, onOpenPDF }) => {
  const [expandedThemes, setExpandedThemes] = useState({});

  useEffect(() => {
    if (data?.themes) {
      const initial = {};
      data.themes.forEach((theme, idx) => {
        initial[theme.theme] = idx === 0; // Expand first theme by default
      });
      setExpandedThemes(initial);
    }
  }, [data]);

  const toggleTheme = (theme) => {
    setExpandedThemes(prev => ({ ...prev, [theme]: !prev[theme] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-600">Loading guidance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-12 h-12 mb-2" />
        <p className="font-medium">Error loading guidance</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || !data.themes || data.themes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No guidance data available</p>
        <p className="text-sm mt-1">Forward-looking statements will appear here after ingesting transcripts</p>
      </div>
    );
  }

  const themeColors = {
    EXPANSION: 'border-green-400 bg-green-50',
    FINANCIAL: 'border-blue-400 bg-blue-50',
    OPERATIONAL: 'border-orange-400 bg-orange-50',
    CAPEX: 'border-purple-400 bg-purple-50',
    REGULATORY: 'border-red-400 bg-red-50',
    DIGITAL: 'border-cyan-400 bg-cyan-50',
    OTHER: 'border-gray-400 bg-gray-50'
  };

  const themeIcons = {
    EXPANSION: '🏗️',
    FINANCIAL: '💰',
    OPERATIONAL: '⚙️',
    CAPEX: '📊',
    REGULATORY: '📋',
    DIGITAL: '💻',
    OTHER: '📌'
  };

  return (
    <div className="space-y-4">
      {data.themes.map((themeGroup) => (
        <div 
          key={themeGroup.theme}
          className={`border-l-4 rounded-lg overflow-hidden ${themeColors[themeGroup.theme] || themeColors.OTHER}`}
        >
          <button
            onClick={() => toggleTheme(themeGroup.theme)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{themeIcons[themeGroup.theme] || '📌'}</span>
              <span className="font-semibold text-slate-800">{themeGroup.theme}</span>
              <span className="text-sm text-slate-500">({themeGroup.items?.length || 0} items)</span>
            </div>
            {expandedThemes[themeGroup.theme] ? (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-500" />
            )}
          </button>
          
          {expandedThemes[themeGroup.theme] && (
            <div className="bg-white/80 p-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-slate-600 min-w-48">
                        Topic
                      </th>
                      {quarters.map((quarter) => (
                        <th key={quarter} className="text-left py-2 px-3 text-sm font-semibold text-slate-600 min-w-64">
                          {quarter}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {themeGroup.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 px-3 align-top">
                          <span className="font-medium text-slate-700">{item.subtheme}</span>
                        </td>
                        {quarters.map((quarter) => {
                          const guidanceList = item[quarter];
                          return (
                            <td key={quarter} className="py-3 px-3 align-top">
                              {guidanceList && Array.isArray(guidanceList) && guidanceList.length > 0 ? (
                                <div className="space-y-3">
                                  {guidanceList.map((g, gIdx) => (
                                    <div key={gIdx} className="text-sm bg-white p-2 rounded border border-slate-100">
                                      <p className="text-slate-700 mb-2">{g.guidance_text}</p>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {g.target_date && (
                                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <Calendar className="w-3 h-3" />
                                            {g.target_date}
                                          </span>
                                        )}
                                        {g.confidence_level && (
                                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceBadge(g.confidence_level)}`}>
                                            {g.confidence_level}
                                          </span>
                                        )}
                                        {(g.source_file || g.source_filename) && (g.page_number || g.guidance_page_number) && (
                                          <CitationLink 
                                            sourceFile={g.source_file || g.source_filename}
                                            pageNumber={g.page_number || g.guidance_page_number}
                                            quote={g.exact_quote}
                                            onOpenPDF={onOpenPDF}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-sm">—</span>
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
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// SECTION 3: CHAT INTERFACE
// ============================================================================
const ChatSection = ({ ticker, onOpenPDF }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I can answer questions about ${ticker || 'the company'} based on their earnings documents. Try asking about:\n\n• Revenue trends and financial performance\n• Expansion plans and new facilities\n• Operational metrics like occupancy and ARPOB\n• Management guidance and targets`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
        body: JSON.stringify({ 
          chatInput: userMessage,
          ticker: ticker 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats from n8n
      let assistantMessage = {
        role: 'assistant',
        content: data.output || data.response || data.text || data.message || JSON.stringify(data),
        citations: data.citations || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}\n\nPlease make sure your n8n workflow is active and the webhook is configured correctly.`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 rounded-t-lg chat-messages">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.isError
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                  <span className="text-xs text-slate-500 w-full mb-1">Sources:</span>
                  {message.citations.map((citation, cIdx) => (
                    <CitationLink
                      key={cIdx}
                      sourceFile={citation.source || citation.source_file}
                      pageNumber={citation.page || citation.page_number}
                      quote={citation.quote || citation.text}
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
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Searching documents...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about earnings, guidance, or metrics..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function App() {
  const [selectedTicker, setSelectedTicker] = useState(CONFIG.AVAILABLE_TICKERS[0]);
  const [activeTab, setActiveTab] = useState('metrics');
  const [metricsData, setMetricsData] = useState(null);
  const [guidanceData, setGuidanceData] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [guidanceError, setGuidanceError] = useState(null);
  
  // PDF Viewer state
  const [pdfViewer, setPdfViewer] = useState({
    isOpen: false,
    pdfUrl: null,
    pageNumber: 1,
    quote: null,
    sourceFile: null
  });

  const openPDF = ({ sourceFile, pageNumber, quote, pdfUrl }) => {
    setPdfViewer({
      isOpen: true,
      pdfUrl,
      pageNumber: pageNumber || 1,
      quote,
      sourceFile
    });
  };

  const closePDF = () => {
    setPdfViewer(prev => ({ ...prev, isOpen: false }));
  };

  const fetchData = async (ticker) => {
    // Fetch Metrics
    setIsLoadingMetrics(true);
    setMetricsError(null);
    try {
      const response = await fetch(CONFIG.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMetricsData(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setMetricsError(error.message);
      setMetricsData(null);
    } finally {
      setIsLoadingMetrics(false);
    }

    // Fetch Guidance
    setIsLoadingGuidance(true);
    setGuidanceError(null);
    try {
      const response = await fetch(CONFIG.GUIDANCE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setGuidanceData(data);
    } catch (error) {
      console.error('Error fetching guidance:', error);
      setGuidanceError(error.message);
      setGuidanceData(null);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTicker);
  }, [selectedTicker]);

  const tabs = [
    { id: 'metrics', label: 'Key Metrics', icon: TrendingUp },
    { id: 'guidance', label: 'Forward Guidance', icon: Calendar },
    { id: 'chat', label: 'Ask Questions', icon: MessageSquare },
  ];

  // Use quarters from API response, or fallback to configured quarters
  const displayQuarters = metricsData?.quarters || guidanceData?.quarters || CONFIG.DISPLAY_QUARTERS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* PDF Viewer Panel */}
      <PDFViewerPanel
        isOpen={pdfViewer.isOpen}
        onClose={closePDF}
        pdfUrl={pdfViewer.pdfUrl}
        pageNumber={pdfViewer.pageNumber}
        quote={pdfViewer.quote}
        sourceFile={pdfViewer.sourceFile}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Financial Analysis Agent</h1>
                <p className="text-sm text-slate-500">Indian Healthcare Companies</p>
              </div>
            </div>

            {/* Company Selector */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Company:</label>
                <select
                  value={selectedTicker}
                  onChange={(e) => setSelectedTicker(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                >
                  {CONFIG.AVAILABLE_TICKERS.map((ticker) => (
                    <option key={ticker} value={ticker}>{ticker}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => fetchData(selectedTicker)}
                disabled={isLoadingMetrics || isLoadingGuidance}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${(isLoadingMetrics || isLoadingGuidance) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              {activeTab === 'metrics' && (
                <>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Quarterly Metrics Comparison
                </>
              )}
              {activeTab === 'guidance' && (
                <>
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Forward-Looking Guidance Tracker
                </>
              )}
              {activeTab === 'chat' && (
                <>
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Document Q&A
                </>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === 'metrics' && 'Key healthcare KPIs extracted from investor presentations'}
              {activeTab === 'guidance' && 'Management commitments and targets from earnings calls'}
              {activeTab === 'chat' && 'Ask questions about any aspect of the company\'s filings'}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'metrics' && (
              <MetricsSection 
                data={metricsData} 
                isLoading={isLoadingMetrics} 
                error={metricsError}
                quarters={displayQuarters}
                onOpenPDF={openPDF}
              />
            )}
            {activeTab === 'guidance' && (
              <GuidanceSection 
                data={guidanceData} 
                isLoading={isLoadingGuidance}
                error={guidanceError}
                quarters={displayQuarters}
                onOpenPDF={openPDF}
              />
            )}
            {activeTab === 'chat' && (
              <ChatSection 
                ticker={selectedTicker}
                onOpenPDF={openPDF}
              />
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 text-center text-sm text-slate-500">
          <p>Data extracted from earnings call transcripts and investor presentations</p>
          <p className="mt-1">Click on citation links to view source documents</p>
        </div>
      </main>
    </div>
  );
}
