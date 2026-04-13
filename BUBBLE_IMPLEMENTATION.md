# LeadFlow AI — Bubble Build Specification

This document maps the full LeadFlow AI SaaS app into Bubble objects, pages, privacy rules, and workflows.

## 1) App Setup
- App name: **LeadFlow AI**
- Bubble pages:
  - `login`
  - `dashboard`
  - `leads`
  - `lead_detail`
  - `campaigns`
  - `sales`
- Option Sets:
  - `UserRole`: `admin`, `sales`
  - `CampaignPlatform`: `Meta`, `Google`, `Website`
  - `CampaignStatus`: `active`, `paused`
  - `LeadSource`: `Meta`, `Website`, `WhatsApp`
  - `LeadStatus`: `new`, `contacted`, `qualified`, `lost`, `won`
  - `SaleStatus`: `won`, `lost`
  - `ActivityType`: `call`, `message`, `visit`

## 2) Data Types
### User
- name (text)
- email (email)
- role (UserRole)
- created_date (date)

### Campaign
- name (text)
- platform (CampaignPlatform)
- objective (text)
- budget (number)
- status (CampaignStatus)
- created_by (User)
- created_date (date)

### Lead
- name (text)
- phone (text)
- source (LeadSource)
- campaign (Campaign)
- ad_name (text)
- interest (text)
- status (LeadStatus)
- score (number)
- assigned_to (User)
- created_date (date)

### Sale
- lead (Lead)
- status (SaleStatus)
- value (number)
- product (text)
- close_date (date)
- agent (User)

### Activity
- lead (Lead)
- note (text)
- type (ActivityType)
- created_date (date)

## 3) Privacy Rules
### User
- Admin: view all fields/all users.
- Sales: can view basic profile data for users.

### Lead
- Admin: full CRUD.
- Sales: view/edit only when `This Lead's assigned_to = Current User`.

### Campaign
- Admin: create/edit.
- Sales: view only.

### Sale
- Admin: full access.
- Sales: view only when `This Sale's agent = Current User`.

### Activity
- Admin: full access.
- Sales: view/create when `This Activity's lead's assigned_to = Current User`.

## 4) Page Workflows
## Login (`login`)
- Inputs: email + password.
- Workflow: `Log the user in`.
- On success: navigate to `dashboard`.

## Dashboard (`dashboard`)
Cards:
- Total Leads = `Search for Leads:count` (filtered by role scope).
- Qualified Leads = Leads where `status = qualified`.
- Won Sales = Leads where `status = won`.
- Conversion Rate = Won / Total.
- Total Revenue = `Search for Sales:sum(value)` where status = won.

Insight tag per lead row:
- If `Current date/time - Lead's created_date > 2 days` and status not won/lost => `Needs Follow-Up`
- If status = `new` => `Contact Immediately`
- If source = `WhatsApp` => `High Intent Lead`

## Leads (`leads`)
- Repeating group data source:
  - Admin: all Leads.
  - Sales: Leads where `assigned_to = Current User`.
- Filters:
  - status dropdown
  - source dropdown
  - campaign dropdown
- Button: `View Lead` → send lead to `lead_detail` page.

### Create Lead workflow
When `Create Lead` clicked:
1. `Create a new Lead`
2. Set default `status = new`
3. Set base `score = 50`
4. If source is Meta → make changes +10
5. If phone is not empty → make changes +10
6. If interest is not empty → make changes +10

## Lead Detail (`lead_detail`)
Display:
- Lead info
- Campaign + ad name
- status dropdown
- assigned agent
- activity history (repeating group)

Buttons:
- Mark as Contacted → set status `contacted`
- Mark as Qualified → set status `qualified`
- Mark as Won → set status `won`
- Mark as Lost → set status `lost`

### Status change workflow
On status change:
1. Save lead status.
2. Only when status = won:
   - Create Sale with:
     - lead = current lead
     - status = won
     - close_date = current date/time
     - agent = lead's assigned_to

### Add Activity workflow
- Create Activity with:
  - lead = current page lead
  - note, type
  - created_date = current date/time

## Campaigns (`campaigns`)
- Admin: campaign create form (name/platform/objective/budget/status).
- All roles: campaign list.
- Lead forms use Campaign dropdown to link leads to campaign.

## Sales (`sales`)
- Repeating group source:
  - Admin: all Sales.
  - Sales: Sales where `agent = Current User`.
- Filters:
  - agent dropdown
  - close_date from/to
- Show total filtered revenue with `:sum`.

## 5) UI Layout
- Reusable element: sidebar (Dashboard, Leads, Campaigns, Sales, Logout)
- Top row metric cards on dashboard
- Responsive groups (collapse left menu on mobile)
- Repeating group tables for Leads, Campaigns, Sales

## 6) QA Checklist
- Login redirect works
- Sales users can only see assigned leads
- Lead defaults/scoring automation works
- Won lead auto-creates sale exactly once
- Dashboard metrics match data
- Smart insight tags render correctly
