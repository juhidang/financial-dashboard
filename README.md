# Financial Analysis Agent Dashboard

An autonomous financial analysis dashboard for Indian healthcare companies, built with React + Vite + Tailwind CSS.

## Features

- **Section 1: Key Metrics** - Quarterly comparison of healthcare KPIs (Revenue, EBITDA, Beds, Occupancy, ARPOB)
- **Section 2: Forward Guidance** - Management commitments grouped by theme (Expansion, Financial, Regulatory, etc.)
- **Section 3: Chat Q&A** - RAG-powered document Q&A with citations
- **PDF Viewer** - Slide-out panel showing source documents with highlighted quotes

## Quick Deploy to Vercel

### Option 1: Deploy via GitHub (Recommended)

1. Push this code to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Import your GitHub repo
4. Vercel auto-detects Vite and configures everything
5. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd financial-dashboard-app
vercel
```

## Configuration

Before deploying, update these values in `src/App.jsx`:

```javascript
const CONFIG = {
  // Your n8n webhook URLs
  METRICS_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/metrics-compare',
  GUIDANCE_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/guidance-compare',
  CHAT_ENDPOINT: 'https://juhi.app.n8n.cloud/webhook/chat',
  
  // Supabase Storage URL for PDFs
  SUPABASE_STORAGE_URL: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/earnings-documents/',
  
  // Available companies
  AVAILABLE_TICKERS: ['MAXHEALTH'],
};
```

### Important Notes

1. **n8n Webhook URLs**: 
   - For testing: Use `-test` URLs (e.g., `/webhook-test/metrics-compare`)
   - For production: Activate workflows and remove `-test` (e.g., `/webhook/metrics-compare`)

2. **CORS Configuration**: Your n8n webhooks need to allow cross-origin requests. Add this to each webhook node's response headers:
   ```
   Access-Control-Allow-Origin: *
   ```
   Or specify your Vercel domain for better security.

3. **PDF Storage**: Set up Supabase Storage bucket called `earnings-documents` and upload PDFs there.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide Icons

## Architecture

```
Frontend (Vercel)
    ↓
n8n Webhooks
    ↓
Supabase (PostgreSQL + Vector DB + Storage)
```

## Troubleshooting

### "Failed to fetch" errors
- Check if n8n workflows are active (not just in test mode)
- Verify CORS headers are set on webhook nodes
- Check browser console for specific error messages

### PDF viewer shows "Not Available"
- Ensure PDFs are uploaded to Supabase Storage
- Check the SUPABASE_STORAGE_URL is correct
- Verify the bucket is set to public
