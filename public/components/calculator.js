const FIXED_RATE        = 920;
const LNK_FACTOR        = 1.3;
const DOWNTIME_DAYS     = 40;
const WORKPLACE_MONTHLY = 800;
const RECRUITING_PCT    = 0.20;
const ONBOARDING_MONTHS = 4;
const TRAINING_ANNUAL   = 2500;

const DEFAULTS = { devs: 2, salary: 75000, days: 20 };

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function readStateFromURL() {
  const p = new URLSearchParams(window.location.search);
  const result = {
    devs:   clamp(parseInt(p.get('devs'))   || DEFAULTS.devs,   1,     10),
    salary: clamp(parseInt(p.get('salary')) || DEFAULTS.salary, 50000, 120000),
    days:   clamp(parseInt(p.get('days'))   || DEFAULTS.days,   5,     50),
  };
  if (p.has('workplace'))  result.workplace  = parseInt(p.get('workplace'));
  if (p.has('recruiting')) result.recruiting = parseInt(p.get('recruiting'));
  if (p.has('onboarding')) result.onboarding = parseInt(p.get('onboarding'));
  if (p.has('training'))   result.training   = parseInt(p.get('training'));
  return result;
}

const state = readStateFromURL();

const sliders = [
  { id: 'devs',   min: 1,     max: 10,    step: 1,    fmt: v => Math.round(v).toLocaleString('de-DE'), unit: 'FTE' },
  { id: 'salary', min: 50000, max: 120000, step: 1000, fmt: v => Math.round(v).toLocaleString('de-DE'), unit: '€' },
  { id: 'days',   min: 5,     max: 50,    step: 1,    fmt: v => Math.round(v).toLocaleString('de-DE'), unit: 'Tage' },
];

const costSliders = [
  { id: 'workplace',  min: 0, max: 100000, step: 500,  fmt: v => Math.round(v).toLocaleString('de-DE'), unit: '€' },
  { id: 'recruiting', min: 0, max: 200000, step: 1000, fmt: v => Math.round(v).toLocaleString('de-DE'), unit: '€' },
  { id: 'onboarding', min: 0, max: 300000, step: 1000, fmt: v => Math.round(v).toLocaleString('de-DE'), unit: '€' },
  { id: 'training',   min: 0, max: 30000,  step: 100,  fmt: v => Math.round(v).toLocaleString('de-DE'), unit: '€' },
];

function fmtEUR(n) {
  if (Math.abs(n) >= 1000000) {
    return (n / 1000000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' Mio. €';
  }
  return Math.round(n).toLocaleString('de-DE') + ' €';
}

function calculate() {
  const { devs, salary, days } = state;
  const baseSalary   = salary * devs;
  const fteCosts     = baseSalary * LNK_FACTOR;
  const mainlyCosts  = days * 12 * FIXED_RATE;
  const savings      = fteCosts - mainlyCosts;
  const savingsPct   = (savings / fteCosts) * 100;
  const totalLostDays = DOWNTIME_DAYS * devs;
  const monthlyFTE   = fteCosts / 12;
  const monthsSaved  = savings > 0 ? (savings / monthlyFTE).toFixed(1) : 0;
  const hcWorkplace  = parseFloat(document.getElementById('cslider-workplace').value)  || 0;
  const hcRecruiting = parseFloat(document.getElementById('cslider-recruiting').value) || 0;
  const hcOnboarding = parseFloat(document.getElementById('cslider-onboarding').value) || 0;
  const hcTraining   = parseFloat(document.getElementById('cslider-training').value)   || 0;
  const hcTotal      = fteCosts + hcWorkplace + hcRecruiting + hcOnboarding + hcTraining;
  return { baseSalary, fteCosts, mainlyCosts, savings, savingsPct, totalLostDays, monthsSaved,
           hcWorkplace, hcRecruiting, hcOnboarding, hcTraining, hcTotal };
}

function render() {
  const r = calculate();
  const { devs } = state;

  document.getElementById('out-basesalary').innerHTML = `\u2212${fmtEUR(r.baseSalary)} <small>/Jahr</small>`;
  document.getElementById('out-fte').innerHTML        = `\u2212${fmtEUR(r.fteCosts)} <small>/Jahr</small>`;
  document.getElementById('out-mainly').innerHTML     = `${fmtEUR(r.mainlyCosts)} <small>/Jahr</small>`;
  document.getElementById('out-lostdays').innerHTML   = `${r.totalLostDays} Tage/Jahr <small>gesamt (${devs} FTE)</small>`;
  document.getElementById('out-gained').innerHTML     = `+${r.totalLostDays} Tage/Jahr <small>mehr Verfügbarkeit</small>`;

  const savingsEl    = document.getElementById('out-savings');
  const savingsPctEl = document.getElementById('out-savings-pct');
  const monthsEl     = document.getElementById('out-months');
  const card         = document.getElementById('savings-card');

  if (r.savings > 0) {
    savingsEl.textContent    = '+' + fmtEUR(r.savings);
    savingsEl.style.color    = 'var(--green)';
    savingsPctEl.textContent = `${r.savingsPct.toFixed(0)} % günstiger als Inhouse-Entwicklung`;
    monthsEl.textContent     = r.monthsSaved;
    card.style.borderColor   = 'rgba(22,163,74,0.25)';
    card.style.background    = 'linear-gradient(135deg,rgba(22,163,74,0.07),rgba(22,163,74,0.03))';
  } else {
    savingsEl.textContent    = fmtEUR(r.savings);
    savingsEl.style.color    = 'var(--red)';
    savingsPctEl.textContent = 'Inhouse ist günstiger bei diesem Volumen';
    monthsEl.textContent     = '\u2014';
    card.style.borderColor   = 'rgba(220,38,38,0.2)';
    card.style.background    = 'linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.03))';
  }

  const max = Math.max(r.fteCosts, r.mainlyCosts, r.hcTotal);
  document.getElementById('bar-fte').style.width       = (r.fteCosts   / max * 100) + '%';
  document.getElementById('bar-fte-full').style.width  = (r.hcTotal    / max * 100) + '%';
  document.getElementById('bar-mainly').style.width    = (r.mainlyCosts / max * 100) + '%';
  document.getElementById('bar-fte-val').textContent      = fmtEUR(r.fteCosts);
  document.getElementById('bar-fte-full-val').textContent = fmtEUR(r.hcTotal);
  document.getElementById('bar-mainly-val').textContent   = fmtEUR(r.mainlyCosts);

  document.getElementById('fact-norecruit').textContent = `${Math.round(devs * 2.5)} Monate`;

  updateEmailCTA(r);
}

function updateEmailCTA(r) {
  const { devs, salary, days } = state;
  const subject = encodeURIComponent('Anfrage: Whitelabel Dev | mainly.design Kostenrechner');
  const body = encodeURIComponent(
    'Hallo mainly.design-Team,\n\n' +
    'ich habe gerade Ihren Kostenrechner genutzt \u2014 hier meine Werte:\n\n' +
    '  \u2022 Anzahl Entwickler: ' + devs + ' FTE\n' +
    '  \u2022 Jahresgehalt (\u00d8): ' + salary.toLocaleString('de-DE') + ' \u20ac\n' +
    '  \u2022 Projektvolumen: ' + days + ' Tage/Monat\n' +
    '  \u2022 Tagessatz mainly.design: ' + FIXED_RATE + ' \u20ac\n\n' +
    'Ergebnis:\n' +
    '  \u2022 FTE-Kosten/Jahr (inkl. NK): ' + fmtEUR(r.fteCosts) + '\n' +
    '  \u2022 mainly.design/Jahr: ' + fmtEUR(r.mainlyCosts) + '\n' +
    '  \u2022 J\u00e4hrl. Ersparnis: ' + fmtEUR(r.savings) + '\n\n' +
    'Ich w\u00fcrde gerne mehr erfahren.\n\nViele Gr\u00fc\u00dfe'
  );
  const href = 'mailto:hello@mainly.design?subject=' + subject + '&body=' + body;
  document.getElementById('email-cta-btn').href = href;
  document.getElementById('cta-main-btn').href  = href;
}

function computeCostDefaults() {
  const { devs, salary } = state;
  return {
    'workplace':  Math.round(WORKPLACE_MONTHLY * 12 * devs),
    'recruiting': Math.round(salary * RECRUITING_PCT * devs),
    'onboarding': Math.round((salary / 12) * ONBOARDING_MONTHS * devs),
    'training':   Math.round(TRAINING_ANNUAL * devs),
  };
}

function updateCostDefaults() {
  var defaults = computeCostDefaults();
  costSliders.forEach(function(cfg) {
    var slider = document.getElementById('cslider-' + cfg.id);
    if (slider && slider.dataset.auto === 'true') {
      var val = Math.min(Math.max(defaults[cfg.id], cfg.min), cfg.max);
      slider.value = val;
      updateCostSliderUI(cfg, parseFloat(slider.value));
    }
  });
}

function updateURL() {
  const { devs, salary, days } = state;
  const params = new URLSearchParams({ devs, salary, days });
  costSliders.forEach(function(cfg) {
    var input = document.getElementById('cslider-' + cfg.id);
    if (input && input.dataset.auto === 'false') {
      params.set(cfg.id, Math.round(parseFloat(input.value)));
    }
  });
  history.replaceState(null, '', window.location.pathname + '?' + params.toString());
}

function trackConversion(action, value) {
  if (typeof gtag === 'function') {
    gtag('event', action, { event_category: 'lead', event_label: 'calculator', value: Math.round(value || 0) });
  }
}

document.getElementById('copy-link-btn').addEventListener('click', function() {
  navigator.clipboard.writeText(window.location.href).then(function() {
    var btn = document.getElementById('copy-link-btn');
    btn.textContent = '\u2713 Kopiert!';
    btn.classList.add('copied');
    trackConversion('share_link', calculate().savings);
    setTimeout(function() {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 13 13" fill="none"><path d="M5.5 7.5a3 3 0 0 0 4.243 0l1.5-1.5A3 3 0 0 0 7 1.757L6.25 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7.5 5.5a3 3 0 0 0-4.243 0l-1.5 1.5A3 3 0 0 0 6 11.243l.75-.743" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> Link kopieren';
      btn.classList.remove('copied');
    }, 2000);
  });
});

document.getElementById('print-btn').addEventListener('click', function() {
  trackConversion('pdf_export', calculate().savings);
  window.print();
});

document.getElementById('email-cta-btn').addEventListener('click', function() {
  trackConversion('email_cta', calculate().savings);
});

document.getElementById('cta-main-btn').addEventListener('click', function() {
  trackConversion('cta_click', calculate().savings);
});

document.getElementById('reset-btn').addEventListener('click', function() {
  state.devs   = DEFAULTS.devs;
  state.salary = DEFAULTS.salary;
  state.days   = DEFAULTS.days;
  sliders.forEach(function(cfg) {
    var input = document.getElementById('slider-' + cfg.id);
    input.value = state[cfg.id];
    updateSliderUI(cfg, state[cfg.id]);
  });
  costSliders.forEach(function(cfg) {
    document.getElementById('cslider-' + cfg.id).dataset.auto = 'true';
  });
  updateCostDefaults();
  updateURL();
  render();
});

function updateSliderUI(cfg, value) {
  var pct = (value - cfg.min) / (cfg.max - cfg.min);
  document.getElementById('fill-'  + cfg.id).style.width = (pct * 100) + '%';
  document.getElementById('thumb-' + cfg.id).style.left  = (pct * 100) + '%';
  document.getElementById('val-'   + cfg.id).innerHTML   = cfg.fmt(value) + ' <span>' + cfg.unit + '</span>';
}

function updateCostSliderUI(cfg, value) {
  var pct = (value - cfg.min) / (cfg.max - cfg.min);
  document.getElementById('cfill-'  + cfg.id).style.width = (pct * 100) + '%';
  document.getElementById('cthumb-' + cfg.id).style.left  = (pct * 100) + '%';
  document.getElementById('cval-'   + cfg.id).innerHTML   = cfg.fmt(value) + ' <span>' + cfg.unit + '</span>';
}

sliders.forEach(function(cfg) {
  var input = document.getElementById('slider-' + cfg.id);
  input.value = state[cfg.id];
  updateSliderUI(cfg, state[cfg.id]);
  input.addEventListener('input', function() {
    var v = parseFloat(input.value);
    state[cfg.id] = v;
    updateSliderUI(cfg, v);
    updateCostDefaults();
    updateURL();
    render();
    scheduleTrack();
  });
});

// ── Slider-Tracking (aggregiert, kein personenbezogenes Tracking) ──────────
var trackTimer = null;
function scheduleTrack() {
  clearTimeout(trackTimer);
  trackTimer = setTimeout(function() {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devs: state.devs, salary: state.salary, days: state.days }),
    }).catch(function() {}); // silent – kein Fehler wenn offline
  }, 1500);
}
// ─────────────────────────────────────────────────────────────────────────

document.getElementById('footer-year').textContent = new Date().getFullYear();

costSliders.forEach(function(cfg) {
  var input = document.getElementById('cslider-' + cfg.id);
  input.addEventListener('input', function() {
    var v = parseFloat(input.value);
    input.dataset.auto = 'false';
    updateCostSliderUI(cfg, v);
    updateURL();
    render();
  });
});

// Restore manually-set cost sliders from URL
costSliders.forEach(function(cfg) {
  if (state[cfg.id] !== undefined) {
    var input = document.getElementById('cslider-' + cfg.id);
    if (input) {
      input.value = clamp(state[cfg.id], cfg.min, cfg.max);
      input.dataset.auto = 'false';
      updateCostSliderUI(cfg, parseFloat(input.value));
    }
  }
});
updateCostDefaults();
render();

// ── Mega-menu (hover + click) ─────────────────────────────────────────────
window.initMegaMenu = function() {
  var navItem = document.getElementById('nav-tech');
  var btn     = document.getElementById('nav-tech-btn');
  var menu    = document.getElementById('mega-menu');
  var closeTimer;

  function open() {
    clearTimeout(closeTimer);
    navItem.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function close() {
    navItem.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function scheduleClose() { closeTimer = setTimeout(close, 120); }

  navItem.addEventListener('mouseenter', open);
  navItem.addEventListener('mouseleave', scheduleClose);
  menu.addEventListener('mouseenter', function() { clearTimeout(closeTimer); });
  menu.addEventListener('mouseleave', scheduleClose);

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    navItem.classList.contains('open') ? close() : open();
  });

  document.addEventListener('click', function(e) {
    if (!navItem.contains(e.target)) close();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') close();
  });
};
// ─────────────────────────────────────────────────────────────────────────

document.dispatchEvent(new Event('calculatorReady'));
window.initMegaMenu();
