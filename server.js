const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('leadflow.db');
const CAMPAIGN_PLATFORMS = new Set(['Meta', 'Google', 'Website']);
const CAMPAIGN_STATUSES = new Set(['active', 'paused']);
const LEAD_SOURCES = new Set(['Meta', 'Website', 'WhatsApp']);
const LEAD_STATUSES = new Set(['new', 'contacted', 'qualified', 'lost', 'won']);
const ACTIVITY_TYPES = new Set(['call', 'message', 'visit']);

app.use(express.json());
app.use(
  session({
    secret: 'leadflow-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','sales')),
      created_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      objective TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_date TEXT NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      source TEXT NOT NULL,
      campaign INTEGER,
      ad_name TEXT,
      interest TEXT,
      status TEXT NOT NULL,
      score INTEGER NOT NULL,
      assigned_to INTEGER NOT NULL,
      created_date TEXT NOT NULL,
      FOREIGN KEY(campaign) REFERENCES campaigns(id),
      FOREIGN KEY(assigned_to) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead INTEGER NOT NULL,
      status TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      product TEXT,
      close_date TEXT,
      agent INTEGER NOT NULL,
      FOREIGN KEY(lead) REFERENCES leads(id),
      FOREIGN KEY(agent) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead INTEGER NOT NULL,
      note TEXT NOT NULL,
      type TEXT NOT NULL,
      created_date TEXT NOT NULL,
      FOREIGN KEY(lead) REFERENCES leads(id)
    );
  `);
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const now = new Date().toISOString();
  const adminHash = bcrypt.hashSync('admin123', 10);
  const salesHash = bcrypt.hashSync('sales123', 10);

  db.prepare('INSERT INTO users (name,email,password_hash,role,created_date) VALUES (?,?,?,?,?)').run('Ava Admin', 'admin@leadflow.ai', adminHash, 'admin', now);
  db.prepare('INSERT INTO users (name,email,password_hash,role,created_date) VALUES (?,?,?,?,?)').run('Sam Sales', 'sam@leadflow.ai', salesHash, 'sales', now);
  db.prepare('INSERT INTO users (name,email,password_hash,role,created_date) VALUES (?,?,?,?,?)').run('Rita Sales', 'rita@leadflow.ai', salesHash, 'sales', now);

  db.prepare('INSERT INTO campaigns (name,platform,objective,budget,status,created_by,created_date) VALUES (?,?,?,?,?,?,?)').run('Q2 Meta Leads', 'Meta', 'Lead Generation', 5000, 'active', 1, now);

  db.prepare('INSERT INTO leads (name,phone,source,campaign,ad_name,interest,status,score,assigned_to,created_date) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    'Jordan Lee',
    '5551212',
    'Meta',
    1,
    'Summer Ad',
    'CRM',
    'qualified',
    80,
    2,
    new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  );

  db.prepare('INSERT INTO leads (name,phone,source,campaign,ad_name,interest,status,score,assigned_to,created_date) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    'Ali Parker',
    '',
    'WhatsApp',
    1,
    'WA Promo',
    'Automation',
    'new',
    70,
    3,
    new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  );
}

runMigrations();
seedData();

function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function computeScore({ source, phone, interest }) {
  let score = 50;
  if ((source || '').toLowerCase() === 'meta') score += 10;
  if ((phone || '').trim()) score += 10;
  if ((interest || '').trim()) score += 10;
  return score;
}

function scopedLeadWhere(user, alias = 'l') {
  return user.role === 'admin' ? { clause: '1=1', params: [] } : { clause: `${alias}.assigned_to = ?`, params: [Number(user.id)] };
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(400).json({ error: 'Invalid credentials' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json(req.session.user);
});

app.post('/api/logout', auth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json(req.session.user || null);
});

app.get('/api/users', auth, (req, res) => {
  const users = db.prepare('SELECT id,name,email,role,created_date FROM users').all();
  res.json(users);
});

app.get('/api/dashboard', auth, (req, res) => {
  const user = req.session.user;
  const scope = scopedLeadWhere(user);
  const totalLeads = db.prepare(`SELECT COUNT(*) c FROM leads l WHERE ${scope.clause}`).get(...scope.params).c;
  const qualifiedLeads = db.prepare(`SELECT COUNT(*) c FROM leads l WHERE ${scope.clause} AND status='qualified'`).get(...scope.params).c;
  const wonSales = db.prepare(`SELECT COUNT(*) c FROM leads l WHERE ${scope.clause} AND status='won'`).get(...scope.params).c;
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(s.value),0) r FROM sales s JOIN leads l ON l.id=s.lead WHERE ${scope.clause} AND s.status='won'`)
    .get(...scope.params).r;
  res.json({ totalLeads, qualifiedLeads, wonSales, conversionRate: totalLeads ? (wonSales / totalLeads) * 100 : 0, revenue });
});

app.get('/api/campaigns', auth, (req, res) => {
  const campaigns = db.prepare('SELECT c.*, u.name AS created_by_name FROM campaigns c LEFT JOIN users u ON u.id = c.created_by ORDER BY c.id DESC').all();
  res.json(campaigns);
});

app.post('/api/campaigns', auth, (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can create campaigns' });
  const { name, platform, objective, budget = 0, status = 'active' } = req.body;
  if (!name || !objective || !CAMPAIGN_PLATFORMS.has(platform) || !CAMPAIGN_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Invalid campaign payload' });
  }
  db.prepare('INSERT INTO campaigns (name,platform,objective,budget,status,created_by,created_date) VALUES (?,?,?,?,?,?,?)').run(
    name,
    platform,
    objective,
    Number(budget || 0),
    status,
    req.session.user.id,
    new Date().toISOString()
  );
  res.json({ ok: true });
});

app.get('/api/leads', auth, (req, res) => {
  const user = req.session.user;
  const { status = '', source = '', campaign = '' } = req.query;
  const scope = scopedLeadWhere(user);
  const where = [scope.clause];
  const params = [...scope.params];
  if (status) {
    where.push('l.status = ?');
    params.push(status);
  }
  if (source) {
    where.push('l.source = ?');
    params.push(source);
  }
  if (campaign) {
    where.push('l.campaign = ?');
    params.push(Number(campaign));
  }

  const leads = db
    .prepare(
      `SELECT l.*, c.name as campaign_name, u.name as assigned_name
       FROM leads l
       LEFT JOIN campaigns c ON c.id=l.campaign
       LEFT JOIN users u ON u.id=l.assigned_to
       WHERE ${where.join(' AND ')}
       ORDER BY l.id DESC`
    )
    .all(...params);
  res.json(leads);
});

app.post('/api/leads', auth, (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can create leads' });
  const { name, phone = '', source, campaign = null, ad_name = '', interest = '', assigned_to } = req.body;
  if (!name || !LEAD_SOURCES.has(source) || !assigned_to) return res.status(400).json({ error: 'Invalid lead payload' });
  const score = computeScore({ source, phone, interest });
  db.prepare(
    'INSERT INTO leads (name,phone,source,campaign,ad_name,interest,status,score,assigned_to,created_date) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(name, phone, source, campaign || null, ad_name, interest, 'new', score, Number(assigned_to), new Date().toISOString());
  res.json({ ok: true });
});

app.get('/api/leads/:id', auth, (req, res) => {
  const lead = db
    .prepare(
      `SELECT l.*, c.name as campaign_name, u.name as assigned_name
       FROM leads l
       LEFT JOIN campaigns c ON c.id=l.campaign
       LEFT JOIN users u ON u.id=l.assigned_to
       WHERE l.id=?`
    )
    .get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.session.user.role !== 'admin' && lead.assigned_to !== req.session.user.id) return res.status(403).json({ error: 'Forbidden' });
  const activities = db.prepare('SELECT * FROM activities WHERE lead = ? ORDER BY id DESC').all(req.params.id);
  res.json({ lead, activities });
});

app.patch('/api/leads/:id', auth, (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.session.user.role !== 'admin' && lead.assigned_to !== req.session.user.id) return res.status(403).json({ error: 'Forbidden' });

  const next = {
    phone: req.body.phone ?? lead.phone,
    interest: req.body.interest ?? lead.interest,
    status: req.body.status ?? lead.status
  };
  if (!LEAD_STATUSES.has(next.status)) return res.status(400).json({ error: 'Invalid lead status' });
  const score = computeScore({ source: lead.source, phone: next.phone, interest: next.interest });

  db.prepare('UPDATE leads SET phone=?, interest=?, status=?, score=? WHERE id=?').run(next.phone, next.interest, next.status, score, lead.id);

  if (next.status === 'won') {
    const sale = db.prepare('SELECT id FROM sales WHERE lead=?').get(lead.id);
    if (!sale) {
      db.prepare('INSERT INTO sales (lead,status,value,product,close_date,agent) VALUES (?,?,?,?,?,?)').run(
        lead.id,
        'won',
        1200,
        'LeadFlow Plan',
        new Date().toISOString(),
        lead.assigned_to
      );
    }
  }

  res.json({ ok: true });
});

app.post('/api/activities', auth, (req, res) => {
  const { lead_id, note, type } = req.body;
  if (!note || !ACTIVITY_TYPES.has(type)) return res.status(400).json({ error: 'Invalid activity payload' });
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(lead_id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (req.session.user.role !== 'admin' && lead.assigned_to !== req.session.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('INSERT INTO activities (lead,note,type,created_date) VALUES (?,?,?,?)').run(lead_id, note, type, new Date().toISOString());
  res.json({ ok: true });
});

app.get('/api/sales', auth, (req, res) => {
  const user = req.session.user;
  const { agent = '', from = '', to = '' } = req.query;
  const where = [user.role === 'admin' ? '1=1' : 's.agent = ?'];
  const params = user.role === 'admin' ? [] : [Number(user.id)];
  if (agent) {
    where.push('s.agent = ?');
    params.push(Number(agent));
  }
  if (from) {
    where.push('date(s.close_date) >= date(?)');
    params.push(from);
  }
  if (to) {
    where.push('date(s.close_date) <= date(?)');
    params.push(to);
  }
  const sales = db
    .prepare(
      `SELECT s.*, l.name AS lead_name, u.name AS agent_name
       FROM sales s
       LEFT JOIN leads l ON l.id=s.lead
       LEFT JOIN users u ON u.id=s.agent
       WHERE ${where.join(' AND ')}
       ORDER BY s.id DESC`
    )
    .all(...params);
  const revenue = sales.filter((s) => s.status === 'won').reduce((sum, s) => sum + Number(s.value || 0), 0);
  res.json({ sales, revenue });
});

app.use(express.static(path.join(__dirname)));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LeadFlow AI running at http://localhost:${PORT}`);
});
