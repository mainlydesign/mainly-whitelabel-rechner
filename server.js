const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ── Slider analytics (kein personenbezogenes Tracking) ────────────────────────
// Speichert nur aggregierte Zählwerte — keine IPs, keine Sessions.

const STATS_FILE = path.join(__dirname, 'data', 'slider-stats.json');

function loadStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  } catch {
    return { devs: {}, salary: {}, days: {}, totalSessions: 0 };
  }
}

function saveStats(stats) {
  try {
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error('Stats write error:', err.message);
  }
}

const stats = loadStats();

// Salary wird in 10k-Buckets zusammengefasst (z. B. 75432 → "70000-80000")
function salaryBucket(v) {
  const low = Math.floor(v / 10000) * 10000;
  return `${low}-${low + 10000}`;
}

app.post('/api/track', (req, res) => {
  const { devs, salary, days } = req.body || {};

  if (
    typeof devs !== 'number' || devs < 1 || devs > 10 ||
    typeof salary !== 'number' || salary < 50000 || salary > 120000 ||
    typeof days !== 'number' || days < 5 || days > 50
  ) {
    return res.sendStatus(400);
  }

  const d = String(Math.round(devs));
  const s = salaryBucket(salary);
  const p = String(Math.round(days));

  stats.devs[d]   = (stats.devs[d]   || 0) + 1;
  stats.salary[s] = (stats.salary[s] || 0) + 1;
  stats.days[p]   = (stats.days[p]   || 0) + 1;
  stats.totalSessions = (stats.totalSessions || 0) + 1;

  saveStats(stats);
  res.sendStatus(204);
});

app.get('/api/stats', (req, res) => {
  res.json(loadStats());
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
