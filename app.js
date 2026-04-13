const app = document.getElementById('app');

const state = {
  me: null,
  route: '#/dashboard',
  users: [],
  campaigns: []
};

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : '-';
}
function fmtCurrency(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v || 0));
}
function insight(lead) {
  const days = (Date.now() - new Date(lead.created_date).getTime()) / (1000 * 60 * 60 * 24);
  if (lead.source === 'WhatsApp') return 'High Intent Lead';
  if (lead.status === 'new') return 'Contact Immediately';
  if (days > 2 && !['won', 'lost'].includes(lead.status)) return 'Needs Follow-Up';
  return 'On Track';
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function wrapper(title, body) {
  const links = ['dashboard', 'leads', 'campaigns', 'sales'];
  return `<div class="layout"><aside class="sidebar"><h2 class="logo">LeadFlow AI</h2>
    <div class="user-chip"><strong>${state.me.name}</strong><br/>${state.me.role}</div>
    <nav class="nav">${links
      .map((x) => `<a href="#/${x}" class="${state.route.startsWith(`#/${x}`) ? 'active' : ''}">${x[0].toUpperCase() + x.slice(1)}</a>`)
      .join('')}</nav>
    <button class="btn light" id="logout-btn">Logout</button>
  </aside><main class="content"><div class="toolbar"><h1>${title}</h1></div>${body}</main></div>`;
}

function loginPage() {
  app.innerHTML = `<div class="login-screen"><div class="card login-card"><h1>LeadFlow AI</h1>
  <label>Email</label><input id="email" placeholder="admin@leadflow.ai"/>
  <label>Password</label><input id="password" type="password" placeholder="••••••"/>
  <br/><button class="btn primary" id="login-btn">Login</button>
  <p class="meta">Demo: admin@leadflow.ai/admin123, sam@leadflow.ai/sales123</p>
  <p class="meta" id="err"></p></div></div>`;
  document.getElementById('login-btn').onclick = async () => {
    try {
      const emailValue = document.getElementById('email').value;
      const passwordValue = document.getElementById('password').value;
      state.me = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: emailValue, password: passwordValue }) });
      navigate('#/dashboard');
    } catch (e) {
      document.getElementById('err').textContent = e.message;
    }
  };
}

async function dashboardPage() {
  const m = await api('/api/dashboard');
  const leads = await api('/api/leads');
  app.innerHTML = wrapper(
    'Dashboard',
    `<section class="metric-grid">
      <article class="metric-card"><div class="label">Total Leads</div><div class="value">${m.totalLeads}</div></article>
      <article class="metric-card"><div class="label">Qualified Leads</div><div class="value">${m.qualifiedLeads}</div></article>
      <article class="metric-card"><div class="label">Won Sales</div><div class="value">${m.wonSales}</div></article>
      <article class="metric-card"><div class="label">Conversion Rate</div><div class="value">${m.conversionRate.toFixed(1)}%</div></article>
      <article class="metric-card"><div class="label">Total Revenue</div><div class="value">${fmtCurrency(m.revenue)}</div></article>
    </section><br/>
    <section class="card table-wrap"><h3>Lead Insights</h3><table class="table"><thead><tr><th>Lead</th><th>Status</th><th>Source</th><th>Insight</th></tr></thead><tbody>
    ${leads
      .slice(0, 8)
      .map((l) => `<tr><td>${l.name}</td><td><span class="badge ${l.status}">${l.status}</span></td><td>${l.source}</td><td>${insight(l)}</td></tr>`)
      .join('')}
    </tbody></table></section>`
  );
}

function campaignOptions() {
  return state.campaigns.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}
function salesAgents() {
  return state.users.filter((u) => u.role === 'sales').map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
}

async function leadsPage() {
  const leads = await api('/api/leads');
  app.innerHTML = wrapper(
    'Leads',
    `${
      state.me.role === 'admin'
        ? `<section class="card"><h3>Create Lead</h3><form id="lead-form" class="form-grid">
            <div><label>Name</label><input name="name" required/></div>
            <div><label>Phone</label><input name="phone"/></div>
            <div><label>Source</label><select name="source"><option>Meta</option><option>Website</option><option>WhatsApp</option></select></div>
            <div><label>Campaign</label><select name="campaign">${campaignOptions()}</select></div>
            <div><label>Ad Name</label><input name="ad_name"/></div>
            <div><label>Interest</label><input name="interest"/></div>
            <div><label>Assign to</label><select name="assigned_to">${salesAgents()}</select></div>
            <div style="align-self:end"><button class="btn primary" type="submit">Create</button></div>
          </form></section><br/>`
        : ''
    }
    <section class="card"><h3>Filters</h3><div class="filters">
      <div><label>Status</label><select id="f-status"><option value="">All</option><option>new</option><option>contacted</option><option>qualified</option><option>lost</option><option>won</option></select></div>
      <div><label>Source</label><select id="f-source"><option value="">All</option><option>Meta</option><option>Website</option><option>WhatsApp</option></select></div>
      <div><label>Campaign</label><select id="f-campaign"><option value="">All</option>${campaignOptions()}</select></div>
      <div style="align-self:end"><button class="btn light" id="f-apply">Apply</button></div>
    </div><br/><div id="lead-table">${leadTable(leads)}</div></section>`
  );

  const form = document.getElementById('lead-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      await api('/api/leads', { method: 'POST', body: JSON.stringify(payload) });
      navigate('#/leads');
    };
  }

  document.getElementById('f-apply').onclick = async () => {
    const q = new URLSearchParams({ status: document.getElementById('f-status').value, source: document.getElementById('f-source').value, campaign: document.getElementById('f-campaign').value }).toString();
    const filtered = await api(`/api/leads?${q}`);
    document.getElementById('lead-table').innerHTML = leadTable(filtered);
  };
}

function leadTable(leads) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Status</th><th>Source</th><th>Campaign</th><th>Score</th><th>Agent</th><th>Action</th></tr></thead><tbody>
    ${leads
      .map(
        (l) =>
          `<tr><td>${l.name}</td><td><span class="badge ${l.status}">${l.status}</span></td><td>${l.source}</td><td>${l.campaign_name || '-'}</td><td>${l.score}</td><td>${l.assigned_name || '-'}</td><td><a class="btn light" href="#/leads/${l.id}">View Lead</a></td></tr>`
      )
      .join('')}
  </tbody></table></div>`;
}

async function leadDetailPage(id) {
  const { lead, activities } = await api(`/api/leads/${id}`);
  app.innerHTML = wrapper(
    'Lead Detail',
    `<div class="grid-2"><section class="card"><h3>${lead.name}</h3><p class="meta">Campaign: ${lead.campaign_name || '-'} | Ad: ${lead.ad_name || '-'}</p>
      <div class="form-grid">
        <div><label>Status</label><select id="status">${['new', 'contacted', 'qualified', 'lost', 'won'].map((s) => `<option ${lead.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label>Assigned Agent</label><input disabled value="${lead.assigned_name || '-'}"/></div>
        <div><label>Phone</label><input id="phone" value="${lead.phone || ''}"/></div>
        <div><label>Interest</label><input id="interest" value="${lead.interest || ''}"/></div>
      </div><br/><div class="actions">
        <button data-s="contacted" class="btn light">Mark as Contacted</button>
        <button data-s="qualified" class="btn light">Mark as Qualified</button>
        <button data-s="won" class="btn light">Mark as Won</button>
        <button data-s="lost" class="btn light">Mark as Lost</button>
        <button id="save" class="btn primary">Save Update</button>
      </div><p class="meta">Insight: ${insight(lead)}</p></section>
      <section class="card"><h3>Activities</h3><ul class="notes">${activities.map((a) => `<li><strong>${a.type}</strong><br/>${a.note}<br/><span class="meta">${fmtDate(a.created_date)}</span></li>`).join('') || '<li>No activity</li>'}</ul>
      <form id="act-form"><label>Type</label><select name="type"><option>call</option><option>message</option><option>visit</option></select>
      <label>Note</label><textarea name="note" required></textarea><button class="btn primary" type="submit">Add Activity</button></form></section></div>`
  );

  document.querySelectorAll('[data-s]').forEach((b) => {
    b.onclick = async () => {
      await api(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.s }) });
      navigate(`#/leads/${id}`);
    };
  });
  document.getElementById('save').onclick = async () => {
    const statusValue = document.getElementById('status').value;
    const phoneValue = document.getElementById('phone').value;
    const interestValue = document.getElementById('interest').value;
    await api(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: statusValue, phone: phoneValue, interest: interestValue }) });
    navigate(`#/leads/${id}`);
  };
  document.getElementById('act-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await api('/api/activities', { method: 'POST', body: JSON.stringify({ lead_id: Number(id), ...payload }) });
    navigate(`#/leads/${id}`);
  };
}

async function campaignsPage() {
  const campaigns = await api('/api/campaigns');
  app.innerHTML = wrapper(
    'Campaigns',
    `${
      state.me.role === 'admin'
        ? `<section class="card"><h3>Create Campaign</h3><form id="camp-form" class="form-grid">
        <div><label>Name</label><input name="name" required/></div>
        <div><label>Platform</label><select name="platform"><option>Meta</option><option>Google</option><option>Website</option></select></div>
        <div><label>Objective</label><input name="objective" required/></div>
        <div><label>Budget</label><input name="budget" type="number" min="0"/></div>
        <div><label>Status</label><select name="status"><option>active</option><option>paused</option></select></div>
        <div style="align-self:end"><button class="btn primary" type="submit">Create</button></div>
      </form></section><br/>`
        : ''
    }
      <section class="card table-wrap"><table class="table"><thead><tr><th>Name</th><th>Platform</th><th>Objective</th><th>Budget</th><th>Status</th><th>Created By</th></tr></thead><tbody>
      ${campaigns.map((c) => `<tr><td>${c.name}</td><td>${c.platform}</td><td>${c.objective}</td><td>${fmtCurrency(c.budget)}</td><td>${c.status}</td><td>${c.created_by_name || '-'}</td></tr>`).join('')}
      </tbody></table></section>`
  );

  const form = document.getElementById('camp-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      await api('/api/campaigns', { method: 'POST', body: JSON.stringify(payload) });
      navigate('#/campaigns');
    };
  }
}

async function salesPage() {
  let data = await api('/api/sales');
  app.innerHTML = wrapper(
    'Sales',
    `<section class="card"><div class="filters">
      <div><label>Agent</label><select id="agent"><option value="">All</option>${salesAgents()}</select></div>
      <div><label>From</label><input type="date" id="from"/></div>
      <div><label>To</label><input type="date" id="to"/></div>
      <div style="align-self:end"><button id="apply" class="btn light">Apply</button></div>
    </div></section><br/>
    <section class="card"><h3>Revenue: <span id="rev">${fmtCurrency(data.revenue)}</span></h3><div id="sales-table">${salesTable(data.sales)}</div></section>`
  );

  document.getElementById('apply').onclick = async () => {
    const q = new URLSearchParams({ agent: document.getElementById('agent').value, from: document.getElementById('from').value, to: document.getElementById('to').value }).toString();
    data = await api(`/api/sales?${q}`);
    document.getElementById('rev').textContent = fmtCurrency(data.revenue);
    document.getElementById('sales-table').innerHTML = salesTable(data.sales);
  };
}

function salesTable(list) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Lead</th><th>Status</th><th>Value</th><th>Product</th><th>Close Date</th><th>Agent</th></tr></thead><tbody>
    ${list.map((s) => `<tr><td>${s.lead_name || '-'}</td><td>${s.status}</td><td>${fmtCurrency(s.value)}</td><td>${s.product || '-'}</td><td>${fmtDate(s.close_date)}</td><td>${s.agent_name || '-'}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function bindShared() {
  const logout = document.getElementById('logout-btn');
  if (logout)
    logout.onclick = async () => {
      await api('/api/logout', { method: 'POST' });
      state.me = null;
      render();
    };
}

async function preload() {
  state.users = await api('/api/users');
  state.campaigns = await api('/api/campaigns');
}

function navigate(route) {
  state.route = route;
  window.location.hash = route;
  render();
}

async function render() {
  state.route = window.location.hash || '#/dashboard';
  state.me = await api('/api/me').catch(() => null);

  if (!state.me) return loginPage();
  await preload();

  if (state.route === '#/dashboard') await dashboardPage();
  else if (state.route === '#/leads') await leadsPage();
  else if (state.route.startsWith('#/leads/')) await leadDetailPage(state.route.split('/')[2]);
  else if (state.route === '#/campaigns') await campaignsPage();
  else if (state.route === '#/sales') await salesPage();
  else await dashboardPage();

  bindShared();
}

window.addEventListener('hashchange', render);
render();
