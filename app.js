const app = document.getElementById('app');

const seed = {
  users: [
    { id: 'u1', name: 'Ava Admin', email: 'admin@leadflow.ai', password: 'admin123', role: 'admin', created_date: '2026-04-10T00:00:00.000Z' },
    { id: 'u2', name: 'Sam Sales', email: 'sam@leadflow.ai', password: 'sales123', role: 'sales', created_date: '2026-04-10T00:00:00.000Z' },
    { id: 'u3', name: 'Rita Sales', email: 'rita@leadflow.ai', password: 'sales123', role: 'sales', created_date: '2026-04-10T00:00:00.000Z' }
  ],
  campaigns: [
    {
      id: 'c1',
      name: 'Q2 Meta Leads',
      platform: 'Meta',
      objective: 'Lead Generation',
      budget: 8000,
      status: 'active',
      created_by: 'u1',
      created_date: '2026-04-11T00:00:00.000Z'
    }
  ],
  leads: [
    {
      id: 'l1',
      name: 'Jordan Lee',
      phone: '555-1212',
      source: 'Meta',
      campaign: 'c1',
      ad_name: 'Ad Set A',
      interest: 'CRM',
      status: 'qualified',
      score: 80,
      assigned_to: 'u2',
      created_date: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'l2',
      name: 'Ali Parker',
      phone: '',
      source: 'WhatsApp',
      campaign: 'c1',
      ad_name: 'WA Promo',
      interest: 'Automation',
      status: 'new',
      score: 70,
      assigned_to: 'u3',
      created_date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    }
  ],
  sales: [],
  activities: []
};

const state = {
  session: JSON.parse(localStorage.getItem('leadflow_session') || 'null'),
  route: '#/dashboard',
  db: JSON.parse(localStorage.getItem('leadflow_db') || 'null') || seed
};

function saveDb() {
  localStorage.setItem('leadflow_db', JSON.stringify(state.db));
}

function saveSession() {
  if (state.session) localStorage.setItem('leadflow_session', JSON.stringify(state.session));
  else localStorage.removeItem('leadflow_session');
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString();
}

function fmtCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function getUser(id) {
  return state.db.users.find((u) => u.id === id);
}

function getCampaign(id) {
  return state.db.campaigns.find((c) => c.id === id);
}

function currentUser() {
  return state.db.users.find((u) => u.id === state.session?.id);
}

function isAdmin() {
  return currentUser()?.role === 'admin';
}

function visibleLeads() {
  if (isAdmin()) return state.db.leads;
  return state.db.leads.filter((lead) => lead.assigned_to === state.session.id);
}

function computeLeadScore(input) {
  let score = 50;
  if ((input.source || '').toLowerCase() === 'meta') score += 10;
  if ((input.phone || '').trim()) score += 10;
  if ((input.interest || '').trim()) score += 10;
  return score;
}

function leadInsights(lead) {
  const days = (Date.now() - new Date(lead.created_date).getTime()) / (1000 * 60 * 60 * 24);
  if (lead.source === 'WhatsApp') return 'High Intent Lead';
  if (lead.status === 'new') return 'Contact Immediately';
  if (days > 2 && !['won', 'lost'].includes(lead.status)) return 'Needs Follow-Up';
  return 'On Track';
}

function autoCreateSale(lead) {
  if (state.db.sales.find((s) => s.lead === lead.id)) return;
  state.db.sales.push({
    id: uid('s'),
    lead: lead.id,
    status: 'won',
    value: 1200,
    product: 'LeadFlow Plan',
    close_date: new Date().toISOString(),
    agent: lead.assigned_to
  });
}

function setLeadStatus(lead, nextStatus) {
  lead.status = nextStatus;
  if (nextStatus === 'won') autoCreateSale(lead);
}

function dashboardMetrics() {
  const leads = visibleLeads();
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === 'qualified').length;
  const wonSales = leads.filter((l) => l.status === 'won').length;
  const conversionRate = totalLeads ? (wonSales / totalLeads) * 100 : 0;
  const leadIds = new Set(leads.map((l) => l.id));
  const revenue = state.db.sales.filter((s) => leadIds.has(s.lead) && s.status === 'won').reduce((sum, s) => sum + Number(s.value || 0), 0);
  return { totalLeads, qualifiedLeads, wonSales, conversionRate, revenue };
}

function layout(title, body) {
  const links = [
    ['#/dashboard', 'Dashboard'],
    ['#/leads', 'Leads'],
    ['#/campaigns', 'Campaigns'],
    ['#/sales', 'Sales']
  ];
  return `<div class="layout">
    <aside class="sidebar">
      <h2 class="logo">LeadFlow AI</h2>
      <div class="user-chip"><strong>${state.session.name}</strong><br/><span>${currentUser().role}</span></div>
      <nav class="nav">${links.map(([href, name]) => `<a class="${state.route.startsWith(href) ? 'active' : ''}" href="${href}">${name}</a>`).join('')}</nav>
      <button id="logout-btn" class="btn light">Logout</button>
    </aside>
    <main class="content"><div class="toolbar"><h1>${title}</h1></div>${body}</main>
  </div>`;
}

function loginPage() {
  app.innerHTML = `<div class="login-screen"><div class="card login-card">
      <h1>LeadFlow AI</h1>
      <p class="meta">Login to continue</p>
      <label>Email</label><input id="login-email" placeholder="admin@leadflow.ai" />
      <label>Password</label><input id="login-password" type="password" placeholder="••••••" />
      <br/><button id="login-btn" class="btn primary">Login</button>
      <p class="meta">Demo: admin@leadflow.ai / admin123 | sam@leadflow.ai / sales123</p>
      <p class="meta" id="login-error"></p>
  </div></div>`;

  document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const user = state.db.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      document.getElementById('login-error').textContent = 'Invalid email or password';
      return;
    }
    state.session = { id: user.id, name: user.name, email: user.email };
    saveSession();
    navigate('#/dashboard');
  });
}

function dashboardPage() {
  const m = dashboardMetrics();
  const rows = visibleLeads().slice(0, 5).map((lead) => `<tr>
    <td>${lead.name}</td><td>${lead.status}</td><td>${lead.source}</td><td>${leadInsights(lead)}</td>
  </tr>`).join('');
  app.innerHTML = layout('Dashboard', `<section class="metric-grid">
    <article class="metric-card"><div class="label">Total Leads</div><div class="value">${m.totalLeads}</div></article>
    <article class="metric-card"><div class="label">Qualified Leads</div><div class="value">${m.qualifiedLeads}</div></article>
    <article class="metric-card"><div class="label">Won Sales</div><div class="value">${m.wonSales}</div></article>
    <article class="metric-card"><div class="label">Conversion Rate</div><div class="value">${m.conversionRate.toFixed(1)}%</div></article>
    <article class="metric-card"><div class="label">Total Revenue</div><div class="value">${fmtCurrency(m.revenue)}</div></article>
  </section><br/>
  <section class="card table-wrap"><h3>Insights</h3><table class="table"><thead><tr><th>Lead</th><th>Status</th><th>Source</th><th>Insight</th></tr></thead><tbody>${rows}</tbody></table></section>`);
}

function leadFormHtml() {
  const campaignOptions = state.db.campaigns.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  const agentOptions = state.db.users.filter((u) => u.role === 'sales').map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
  return `<section class="card"><h3>Create Lead</h3><form id="lead-form" class="form-grid">
      <div><label>Name</label><input name="name" required></div>
      <div><label>Phone</label><input name="phone"></div>
      <div><label>Source</label><select name="source"><option>Meta</option><option>Website</option><option>WhatsApp</option></select></div>
      <div><label>Campaign</label><select name="campaign">${campaignOptions}</select></div>
      <div><label>Ad Name</label><input name="ad_name"></div>
      <div><label>Interest</label><input name="interest"></div>
      <div><label>Assign To</label><select name="assigned_to">${agentOptions}</select></div>
      <div style="align-self:end"><button class="btn primary" type="submit">Create Lead</button></div>
    </form></section>`;
}

function renderLeadsTable(leads) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Status</th><th>Source</th><th>Campaign</th><th>Score</th><th>Agent</th><th>Insight</th><th>Action</th></tr></thead><tbody>
  ${leads.map((lead) => `<tr>
    <td>${lead.name}</td>
    <td><span class="badge ${lead.status}">${lead.status}</span></td>
    <td>${lead.source}</td>
    <td>${getCampaign(lead.campaign)?.name || '-'}</td>
    <td>${lead.score}</td>
    <td>${getUser(lead.assigned_to)?.name || '-'}</td>
    <td>${leadInsights(lead)}</td>
    <td><a href="#/leads/${lead.id}" class="btn light">View Lead</a></td>
  </tr>`).join('')}
  </tbody></table></div>`;
}

function leadsPage() {
  app.innerHTML = layout('Leads', `${isAdmin() ? `${leadFormHtml()}<br/>` : ''}
    <section class="card">
      <h3>Lead Filters</h3>
      <div class="filters">
        <div><label>Status</label><select id="f-status"><option value="">All</option><option>new</option><option>contacted</option><option>qualified</option><option>lost</option><option>won</option></select></div>
        <div><label>Source</label><select id="f-source"><option value="">All</option><option>Meta</option><option>Website</option><option>WhatsApp</option></select></div>
        <div><label>Campaign</label><select id="f-campaign"><option value="">All</option>${state.db.campaigns.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div style="align-self:end"><button id="f-apply" class="btn light">Apply</button></div>
      </div>
      <br/><div id="leads-table"></div>
    </section>`);

  const table = document.getElementById('leads-table');
  const all = visibleLeads();
  table.innerHTML = renderLeadsTable(all);

  const leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const lead = {
        id: uid('l'),
        name: data.name,
        phone: data.phone,
        source: data.source,
        campaign: data.campaign,
        ad_name: data.ad_name,
        interest: data.interest,
        status: 'new',
        score: computeLeadScore(data),
        assigned_to: data.assigned_to,
        created_date: new Date().toISOString()
      };
      state.db.leads.push(lead);
      saveDb();
      render();
    });
  }

  document.getElementById('f-apply').addEventListener('click', () => {
    const status = document.getElementById('f-status').value;
    const source = document.getElementById('f-source').value;
    const campaign = document.getElementById('f-campaign').value;
    const filtered = all.filter((l) => (!status || l.status === status) && (!source || l.source === source) && (!campaign || l.campaign === campaign));
    table.innerHTML = renderLeadsTable(filtered);
  });
}

function leadDetailPage(id) {
  const lead = state.db.leads.find((l) => l.id === id);
  if (!lead || (!isAdmin() && lead.assigned_to !== state.session.id)) {
    app.innerHTML = layout('Lead Detail', '<section class="card">Lead not found or access denied.</section>');
    return;
  }
  const acts = state.db.activities.filter((a) => a.lead === id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  app.innerHTML = layout('Lead Detail', `<div class="grid-2"><section class="card">
      <h3>${lead.name}</h3>
      <p class="meta">Campaign: ${getCampaign(lead.campaign)?.name || '-'} | Ad: ${lead.ad_name || '-'}</p>
      <div class="form-grid">
        <div><label>Status</label><select id="lead-status">${['new', 'contacted', 'qualified', 'lost', 'won'].map((s) => `<option ${lead.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label>Assigned agent</label><input disabled value="${getUser(lead.assigned_to)?.name || '-'}"></div>
        <div><label>Phone</label><input id="lead-phone" value="${lead.phone || ''}"></div>
        <div><label>Interest</label><input id="lead-interest" value="${lead.interest || ''}"></div>
      </div>
      <br/><div class="actions">
        <button class="btn light" data-status="contacted">Mark as Contacted</button>
        <button class="btn light" data-status="qualified">Mark as Qualified</button>
        <button class="btn light" data-status="won">Mark as Won</button>
        <button class="btn light" data-status="lost">Mark as Lost</button>
        <button class="btn primary" id="save-lead">Save Update</button>
      </div>
      <p class="meta">Insight: ${leadInsights(lead)}</p>
    </section>
    <section class="card">
      <h3>Activity Tracking</h3>
      <ul class="notes">${acts.map((a) => `<li><strong>${a.type}</strong><br/>${a.note}<br/><span class="meta">${fmtDate(a.created_date)}</span></li>`).join('') || '<li>No activity yet.</li>'}</ul>
      <form id="activity-form">
        <label>Type</label><select name="type"><option>call</option><option>message</option><option>visit</option></select>
        <label>Note</label><textarea name="note" required></textarea>
        <button class="btn primary" type="submit">Add Activity</button>
      </form>
    </section></div>`);

  document.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLeadStatus(lead, btn.dataset.status);
      saveDb();
      render();
    });
  });

  document.getElementById('save-lead').addEventListener('click', () => {
    lead.phone = document.getElementById('lead-phone').value;
    lead.interest = document.getElementById('lead-interest').value;
    lead.score = computeLeadScore(lead);
    setLeadStatus(lead, document.getElementById('lead-status').value);
    saveDb();
    render();
  });

  document.getElementById('activity-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    state.db.activities.push({ id: uid('a'), lead: id, note: data.note, type: data.type, created_date: new Date().toISOString() });
    saveDb();
    render();
  });
}

function campaignsPage() {
  app.innerHTML = layout('Campaigns', `${isAdmin() ? `<section class="card">
      <h3>Create Campaign</h3>
      <form id="campaign-form" class="form-grid">
        <div><label>Name</label><input name="name" required></div>
        <div><label>Platform</label><select name="platform"><option>Meta</option><option>Google</option><option>Website</option></select></div>
        <div><label>Objective</label><input name="objective" required></div>
        <div><label>Budget</label><input type="number" name="budget" min="0"></div>
        <div><label>Status</label><select name="status"><option>active</option><option>paused</option></select></div>
        <div style="align-self:end"><button class="btn primary" type="submit">Create</button></div>
      </form>
    </section><br/>` : ''}
    <section class="card table-wrap"><h3>Campaign List</h3><table class="table"><thead><tr><th>Name</th><th>Platform</th><th>Objective</th><th>Budget</th><th>Status</th><th>Created By</th></tr></thead><tbody>
      ${state.db.campaigns.map((c) => `<tr><td>${c.name}</td><td>${c.platform}</td><td>${c.objective}</td><td>${fmtCurrency(c.budget)}</td><td>${c.status}</td><td>${getUser(c.created_by)?.name || '-'}</td></tr>`).join('')}
    </tbody></table></section>`);

  const form = document.getElementById('campaign-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      state.db.campaigns.push({
        id: uid('c'),
        name: data.name,
        platform: data.platform,
        objective: data.objective,
        budget: Number(data.budget || 0),
        status: data.status,
        created_by: state.session.id,
        created_date: new Date().toISOString()
      });
      saveDb();
      render();
    });
  }
}

function salesPage() {
  const leads = visibleLeads();
  const allowedLeadIds = new Set(leads.map((l) => l.id));
  const baseSales = state.db.sales.filter((s) => allowedLeadIds.has(s.lead));
  const agentOptions = state.db.users.filter((u) => u.role === 'sales').map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
  app.innerHTML = layout('Sales', `<section class="card">
      <div class="filters">
        <div><label>Agent</label><select id="s-agent"><option value="">All</option>${agentOptions}</select></div>
        <div><label>From Date</label><input id="s-from" type="date"></div>
        <div><label>To Date</label><input id="s-to" type="date"></div>
        <div style="align-self:end"><button id="s-apply" class="btn light">Apply</button></div>
      </div>
    </section><br/>
    <section class="card"><h3>Total Revenue: <span id="rev"></span></h3><div id="sales-table" class="table-wrap"></div></section>`);

  const tableNode = document.getElementById('sales-table');
  const revNode = document.getElementById('rev');

  function renderSales(list) {
    revNode.textContent = fmtCurrency(list.filter((s) => s.status === 'won').reduce((sum, s) => sum + Number(s.value || 0), 0));
    tableNode.innerHTML = `<table class="table"><thead><tr><th>Lead</th><th>Status</th><th>Value</th><th>Product</th><th>Close Date</th><th>Agent</th></tr></thead><tbody>
      ${list.map((s) => `<tr><td>${state.db.leads.find((l) => l.id === s.lead)?.name || '-'}</td><td>${s.status}</td><td>${fmtCurrency(s.value)}</td><td>${s.product}</td><td>${fmtDate(s.close_date)}</td><td>${getUser(s.agent)?.name || '-'}</td></tr>`).join('')}
    </tbody></table>`;
  }

  renderSales(baseSales);

  document.getElementById('s-apply').addEventListener('click', () => {
    const agent = document.getElementById('s-agent').value;
    const from = document.getElementById('s-from').value;
    const to = document.getElementById('s-to').value;
    const filtered = baseSales.filter((s) => {
      const d = s.close_date ? new Date(s.close_date).getTime() : 0;
      const okAgent = !agent || s.agent === agent;
      const okFrom = !from || d >= new Date(`${from}T00:00:00`).getTime();
      const okTo = !to || d <= new Date(`${to}T23:59:59`).getTime();
      return okAgent && okFrom && okTo;
    });
    renderSales(filtered);
  });
}

function bindShared() {
  const logout = document.getElementById('logout-btn');
  if (logout) logout.addEventListener('click', () => {
    state.session = null;
    saveSession();
    render();
  });
}

function navigate(route) {
  state.route = route;
  window.location.hash = route;
  render();
}

function render() {
  state.route = window.location.hash || '#/dashboard';
  if (!state.session) {
    loginPage();
    return;
  }

  if (!currentUser()) {
    state.session = null;
    saveSession();
    loginPage();
    return;
  }

  if (state.route === '#/dashboard') dashboardPage();
  else if (state.route === '#/leads') leadsPage();
  else if (state.route.startsWith('#/leads/')) leadDetailPage(state.route.replace('#/leads/', ''));
  else if (state.route === '#/campaigns') campaignsPage();
  else if (state.route === '#/sales') salesPage();
  else dashboardPage();

  bindShared();
}

window.addEventListener('hashchange', render);
render();
