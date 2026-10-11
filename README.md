# LeadFlow CRM — Local Business Lead Management System

A production-minded, offline-first web CRM engineered to prioritize, track, and convert local businesses scraped from Google Maps using GeoLeadScraper.

Built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4**, and local **IndexedDB** persistence with zero external API dependencies or paid subscription requirements.

---

## 🌟 Key Features

1. **Intelligent Lead Scoring Engine**
   - Automated 0–100 scoring based on web agency opportunity:
     - `+40` if no website is listed
     - `+25` if website quality is manually assessed as Poor or Outdated
     - `+20` if review count is $\ge 100$
     - `+15` if Google Maps rating is $\ge 4.5$
   - Automatic classification into **High Priority** ($\ge 60$ pts), **Medium Priority** ($30$–$59$ pts), and **Low Priority** ($< 30$ pts).
   - Fully customizable rule weights and priority thresholds in **Settings**.

2. **Advanced Multi-Signal Duplicate Detection**
   - High-precision normalization of phone numbers (E.164-style), domains/URLs, and business names combined with addresses.
   - 3-tier matching:
     - Exact match on normalized phone number
     - Exact match on normalized website hostname/domain
     - Exact match on normalized business name + address
   - Fuzzy name similarity (Levenshtein) treated strictly as informational warnings (never auto-merged).
   - 3 import modes: **Skip Duplicates** (safe zero-increase), **Update Existing Records** (preserves manual notes/history), or **Import Separately**.

3. **7-Step Guided CSV Import & Export Wizard**
   - Native auto-detection of GeoLeadScraper columns (`title` $\to$ Business Name, `place_url` $\to$ Maps URL, etc.).
   - Full data preview with live validation and breakdown metrics.
   - Any unmapped CSV fields are safely archived into the structured `sourceFields` object.
   - Comprehensive CSV and JSON database backup/restore.

4. **Multi-Stage Sales Pipeline & Activity Log**
   - Interactive Kanban board covering all 10 sales cycle stages:
     - *New $\to$ To Research $\to$ Ready to Contact $\to$ Contacted $\to$ Replied $\to$ Meeting Booked $\to$ Proposal Sent $\to$ Won $\to$ Lost $\to$ Not Interested*.
   - Drag-and-drop on desktop with quick status jump pills and touch dropdowns on mobile.
   - Follow-up tracker with overdue, due today, and upcoming filters.
   - Complete audit activity history with custom notes on every lead.

5. **Responsive Design (320px to 4K Ultra-Wide)**
   - Custom mobile navigation drawer with backdrop blur, touch-outside dismissal, and body scroll lock.
   - Adaptive dual-view Leads screen: clean, high-density card grid on mobile viewports ($< 768\text{px}$) and wide sortable table on desktop ($\ge 768\text{px}$), with manual toggle.
   - Fluid Recharts charts and flexible metric cards down to 320px without horizontal overflow.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- npm or pnpm

### Installation & Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/leadflow-crm.git
cd leadflow-crm

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will launch at `http://localhost:5173/`.

### Production Build

```bash
# TypeScript verification + Vite production bundling
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deployment to Vercel

LeadFlow CRM is fully configured for deployment on Vercel as a Single Page Application (SPA).

### Method 1: Deploy with Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy directly from your terminal
vercel
```

Follow the prompts:
- **Set up and deploy?** [Y]
- **Which scope?** [Select your account]
- **Link to existing project?** [N]
- **What's your project's name?** `leadflow-crm`
- **In which directory is your code located?** `./`
- **Want to modify settings?** [N] (Vite preset is auto-detected)

### Method 2: Deploy via GitHub & Vercel Dashboard

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete mobile-responsive LeadFlow CRM with Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/your-username/leadflow-crm.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **Add New...** $\to$ **Project**.
4. Import your `leadflow-crm` repository from GitHub.
5. Vercel automatically detects the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. Click **Deploy**.

> [!NOTE]
> The included `vercel.json` provides SPA fallback rewrites (`/* -> /index.html`) so navigating directly to `/leads`, `/pipeline`, or `/settings` works without 404 errors.

---

## 📁 Project Structure

```
leadflow-crm/
├── public/                 # Static assets (favicons, manifest)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── AddLeadModal.tsx       # Quick add lead dialog
│   │   └── LeadDetailModal.tsx    # Responsive comprehensive lead inspector
│   ├── contexts/
│   │   └── LeadsContext.tsx       # React Context + IndexedDB bridge
│   ├── lib/
│   │   ├── db.ts                  # Raw IndexedDB adapter ('leadflow-crm-db')
│   │   ├── duplicates.ts          # Normalization & duplicate matching algorithms
│   │   ├── score.ts               # Lead scoring logic & GeoLeadScraper parsers
│   │   └── sampleData.ts          # Default mock dataset
│   ├── pages/
│   │   ├── Dashboard.tsx          # Real-time metrics & Recharts analytics
│   │   ├── Leads.tsx              # Leads table & responsive card directory
│   │   ├── Pipeline.tsx           # Kanban board with mobile jump pills
│   │   ├── FollowUps.tsx          # Scheduled follow-up tasks & reminders
│   │   ├── ImportExport.tsx       # 7-step GeoLeadScraper CSV wizard
│   │   └── Settings.tsx           # Algorithm weights, JSON backups & DB tools
│   ├── types/
│   │   └── lead.ts                # TypeScript domain models
│   ├── App.tsx                    # Shell layout, drawer navigation, search
│   ├── index.css                  # Tailwind CSS v4 & touch-friendly styling
│   └── main.tsx                   # React 19 entry point
├── vercel.json             # Vercel SPA routing & asset caching headers
├── vite.config.ts          # Vite build config with Tailwind CSS v4 plugin
└── package.json            # Scripts & dependencies
```

---

## 🛡️ License
MIT License. Created for local business outreach and lead generation.
