# LeadFlow AI

LeadFlow AI is a full SaaS-style lead-to-sale tracking web application with authentication, role-based access, campaign management, lead workflows, sales tracking, and dashboard analytics.

> Merge resolution note: this project uses the Express + SQLite API architecture (not the legacy localStorage-only variant).

## Features
- Email/password authentication
- Role-based access:
  - Admin: full access
  - Sales Agent: only assigned leads and own sales
- Dashboard metrics: total leads, qualified leads, won sales, conversion rate, revenue
- Leads: create, filter, view detail, update status, assign agents
- Activities: add and track interaction history
- Campaigns: create and list campaigns
- Sales: list, filter by agent/date, revenue summary
- Smart insights:
  - Needs Follow-Up (>2 days old)
  - Contact Immediately (status=new)
  - High Intent Lead (source=WhatsApp)

## Tech Stack
- Node.js + Express
- SQLite (`better-sqlite3`)
- Vanilla HTML/CSS/JS frontend

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`

## Demo Credentials
- Admin: `admin@leadflow.ai` / `admin123`
- Sales: `sam@leadflow.ai` / `sales123`
