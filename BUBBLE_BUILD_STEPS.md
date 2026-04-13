# LeadFlow AI — Bubble Step-by-Step Build (Complete)

This is a click-by-click implementation guide to build the full **LeadFlow AI** SaaS app in Bubble.

---

## 0) Create app
1. Go to Bubble dashboard → **New app**.
2. App name: **LeadFlow AI**.
3. Choose blank template.

---

## 1) Define Option Sets (Data → Option sets)
Create these option sets and values:

1. **user_role**
   - admin
   - sales
2. **campaign_platform**
   - Meta
   - Google
   - Website
3. **campaign_status**
   - active
   - paused
4. **lead_source**
   - Meta
   - Website
   - WhatsApp
5. **lead_status**
   - new
   - contacted
   - qualified
   - lost
   - won
6. **sale_status**
   - won
   - lost
7. **activity_type**
   - call
   - message
   - visit

---

## 2) Create Data Types (Data → Data types)

### User
- name (text)
- role (user_role)
- created_date (date)

> Bubble already has email/password on User.

### Campaign
- name (text)
- platform (campaign_platform)
- objective (text)
- budget (number)
- status (campaign_status)
- created_by (User)
- created_date (date)

### Lead
- name (text)
- phone (text)
- source (lead_source)
- campaign (Campaign)
- ad_name (text)
- interest (text)
- status (lead_status)
- score (number)
- assigned_to (User)
- created_date (date)

### Sale
- lead (Lead)
- status (sale_status)
- value (number)
- product (text)
- close_date (date)
- agent (User)

### Activity
- lead (Lead)
- note (text)
- type (activity_type)
- created_date (date)

---

## 3) Privacy Rules (Data → Privacy)

## User
- Rule: `Current User's role is admin` → view all fields.
- Rule: everyone else logged in → view name + role only.

## Lead
- Rule A (Admin full): `Current User's role is admin` → find in searches, view all fields, modify.
- Rule B (Sales scoped): `This Lead's assigned_to is Current User` → find in searches, view/edit.

## Campaign
- Rule A: admin can view/edit.
- Rule B: logged-in users can view.

## Sale
- Rule A: admin full.
- Rule B: `This Sale's agent is Current User` for sales users.

## Activity
- Rule A: admin full.
- Rule B: `This Activity's lead's assigned_to is Current User` view/create.

---

## 4) Pages to create
Create pages:
- `login`
- `dashboard`
- `leads`
- `lead_detail` (type of content: Lead)
- `campaigns`
- `sales`

Create reusable element `sidebar_nav` with links above.

---

## 5) Login page
Elements:
- Input Email
- Input Password
- Button Login

Workflow (button click):
1. Action: **Account → Log the user in** (email/password inputs).
2. Action: **Navigation → Go to page dashboard**.

Page load workflow:
- When Current User is logged in → go to dashboard.

---

## 6) Dashboard page
Top cards:
- Total Leads
- Qualified Leads
- Won Sales
- Conversion Rate
- Total Revenue

Use role-scoped searches:
- If admin: all records
- If sales: only assigned leads / own sales

Expressions:
- Total Leads = `Search for Leads:count`
- Qualified Leads = `Search for Leads (status = qualified):count`
- Won Sales = `Search for Leads (status = won):count`
- Conversion Rate = `Won Sales / Total Leads * 100`
- Total Revenue = `Search for Sales (status = won):sum of value`

Insights repeating group data source: Leads (role scoped)
Text condition priority:
1. If `source is WhatsApp` → `High Intent Lead`
2. Else if `status is new` → `Contact Immediately`
3. Else if `Current date/time -(minus) lead created_date > 2 days` and status not won/lost → `Needs Follow-Up`
4. Else `On Track`

---

## 7) Leads page
Elements:
- Filters: status dropdown, source dropdown, campaign dropdown
- Button Apply Filters
- Repeating group Leads table with columns:
  - Name, Source, Campaign, Status, Score, Assigned Agent, View button
- Admin-only section: create lead form

Create Lead workflow:
1. Create a new Lead with:
   - status = new
   - score = 50
   - created_date = Current date/time
   - assigned_to selected sales agent
2. Only when source = Meta → Make changes to Lead score = score + 10
3. Only when phone is not empty → score + 10
4. Only when interest is not empty → score + 10

View button workflow:
- Go to `lead_detail`, send Current cell's Lead.

---

## 8) Lead Detail page
Display:
- Lead fields (name, phone, source, campaign, ad_name, interest)
- Status dropdown
- Assigned agent
- Activities repeating group (Activity where lead = Current page Lead)

Buttons and workflows:
1. Mark as Contacted → Make changes: status = contacted
2. Mark as Qualified → status = qualified
3. Mark as Lost → status = lost
4. Mark as Won:
   - Make changes: status = won
   - Only when no Sale exists for this lead: Create Sale with
     - lead = Current page Lead
     - status = won
     - close_date = Current date/time
     - agent = Lead's assigned_to

Save status dropdown workflow:
- Make changes lead status = dropdown value
- If dropdown value = won and no Sale exists → create Sale

Add Activity form:
- Inputs: type, note
- Workflow: Create Activity (lead=current lead, note/type input, created_date=Current date/time)

---

## 9) Campaigns page
Elements:
- Admin-only create campaign form
- Repeating group listing campaigns

Create workflow:
- Create Campaign with all fields + created_by Current User + created_date current date/time.

Linking:
- On Leads page create form, Campaign dropdown source = Search for Campaigns.

---

## 10) Sales page
Elements:
- Filters: agent dropdown, from date, to date
- Repeating group sales table
- Revenue text above table

Data source conditions:
- Admin: all sales
- Sales: where agent = Current User

Apply filters in search constraints:
- Agent (optional)
- Close date >= from date (optional)
- Close date <= to date (optional)

Revenue:
- `RepeatingGroup Sales's List of Sales:filtered(status=won):sum of value`

---

## 11) Role-based navigation + restrictions
On every protected page (`dashboard`, `leads`, `lead_detail`, `campaigns`, `sales`):
- Page load workflow: when Current User is logged out → go to login.
- Hide admin-only create forms unless role = admin.
- Sales users see only assigned leads due privacy + search constraints.

---

## 12) Responsive SaaS UI requirements
- Use a parent group with 2 columns: sidebar + content.
- Set min width + collapse behavior for mobile.
- Metric cards in row (dashboard).
- Repeating groups for tables with headers.
- Use status color tags with conditional formatting.

---

## 13) Seed test data
Create:
- 1 admin user
- 2 sales users
- 2 campaigns
- 8+ leads (mixed statuses/sources)
- 3+ sales
- 10+ activities

---

## 14) Acceptance test checklist
1. Login works with email/password.
2. Admin can create campaigns and leads.
3. Sales cannot see unassigned leads.
4. Lead defaults: status=new, score starts at 50.
5. Score increments apply correctly.
6. Mark lead won auto-creates sale once only.
7. Dashboard metrics match DB values.
8. Sales filters (agent/date) work.
9. Insights display correct labels.
10. Mobile layout remains usable.

---

## Final app name
Set app header/logo text to **LeadFlow AI**.
