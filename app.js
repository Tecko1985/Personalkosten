// ---------- Helpers ----------
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "pxxxxxxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ""; }

// Zahl -> "1.234,5" (de-DE), ohne überflüssige Nachkommastellen.
function numFmt(n, maxDec) {
  n = Number(n) || 0;
  return n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: maxDec == null ? 2 : maxDec });
}
function fmtEuro(n) { return numFmt(n, 2) + " €"; }
function fmtPct(factor) { return numFmt((Number(factor) || 0) * 100, 1) + " %"; }

// ---------- State ----------
let appData = { meta: {}, seasons: {}, parameter: {} };
let currentUser = null;
let currentTab = "uebersicht";
let editing = { bereich: null, id: null };
let persistTimer = null;

// ---------- Normalisierung ----------
function normalizeParamGroup(arr, fallback) {
  if (!Array.isArray(arr)) return clone(fallback);
  const out = arr
    .filter((x) => x && typeof x === "object" && x.label != null)
    .map((x) => ({ label: String(x.label), betrag: Number(x.betrag) || 0 }));
  return out.length ? out : clone(fallback);
}
function normalizeParameter(p) {
  const d = p && typeof p === "object" ? p : {};
  return {
    positionen: normalizeParamGroup(d.positionen, DEFAULT_PARAMETER.positionen),
    lizenzen: normalizeParamGroup(d.lizenzen, DEFAULT_PARAMETER.lizenzen),
    landesebene: normalizeParamGroup(d.landesebene, DEFAULT_PARAMETER.landesebene),
    jahrgangsleiter: normalizeParamGroup(d.jahrgangsleiter, DEFAULT_PARAMETER.jahrgangsleiter)
  };
}
function normalizeSeason(s) {
  const d = s && typeof s === "object" ? s : {};
  return {
    trainer: Array.isArray(d.trainer) ? d.trainer : [],
    schwerpunkt: Array.isArray(d.schwerpunkt) ? d.schwerpunkt : [],
    foerderung: Array.isArray(d.foerderung) ? d.foerderung : []
  };
}
function normalizeData(data) {
  const d = data && typeof data === "object" ? data : {};
  const seasons = {};
  const src = d.seasons && typeof d.seasons === "object" ? d.seasons : {};
  Object.keys(src).forEach((k) => { seasons[k] = normalizeSeason(src[k]); });
  if (Object.keys(seasons).length === 0) {
    seasons[DEFAULT_SEASON] = { trainer: [], schwerpunkt: [], foerderung: [] };
  }
  const meta = d.meta && typeof d.meta === "object" ? Object.assign({}, d.meta) : {};
  if (!meta.currentSeason || !seasons[meta.currentSeason]) meta.currentSeason = Object.keys(seasons)[0];
  return { meta, seasons, parameter: normalizeParameter(d.parameter) };
}

// ---------- Zugriff / Berechnung ----------
function currentSeasonKey() { return appData.meta.currentSeason; }
function getSeason() { return appData.seasons[currentSeasonKey()]; }

function betragOf(list, label) {
  if (!label) return 0;
  const hit = (list || []).find((x) => x.label === label);
  return hit ? (Number(hit.betrag) || 0) : 0;
}
function trainerAe100(t) {
  const p = appData.parameter;
  return betragOf(p.positionen, t.position)
    + betragOf(p.lizenzen, t.lizenz)
    + betragOf(p.landesebene, t.landesebene)
    + betragOf(p.jahrgangsleiter, t.jahrgangsleiter);
}
function hasManual(t) { return t.manuellAE != null && t.manuellAE !== ""; }
function trainerAeIst(t) {
  if (hasManual(t)) return Number(t.manuellAE) || 0;
  return trainerAe100(t) * (Number(t.stelle) || 0);
}
function entryAe(x) { return Number(x.ae) || 0; }

function bereichSum(bereich) {
  const s = getSeason();
  if (bereich === "trainer") return s.trainer.reduce((a, t) => a + trainerAeIst(t), 0);
  return s[bereich].reduce((a, x) => a + entryAe(x), 0);
}

// ---------- Selects befüllen ----------
function optionsHtml(values, allLabel) {
  return (allLabel != null ? `<option value="">${escapeHtml(allLabel)}</option>` : "") +
    values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
}
function distinct(arr, key) {
  const seen = [];
  arr.forEach((x) => { const v = x[key]; if (v && !seen.includes(v)) seen.push(v); });
  return seen.sort((a, b) => a.localeCompare(b, "de"));
}
function fillFilter(id, values, allLabel) {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = el.value;
  el.innerHTML = optionsHtml(values, allLabel);
  if (values.includes(cur)) el.value = cur;
}
function populateFilters() {
  const s = getSeason();
  ["trainer", "schwerpunkt", "foerderung"].forEach((b) => {
    fillFilter(b + "-mannschaft", distinct(s[b], "mannschaft"), "Alle Mannschaften");
    fillFilter(b + "-position", distinct(s[b], "position"), "Alle Positionen");
  });
  fillFilter("trainer-lizenz", distinct(s.trainer, "lizenz"), "Alle Lizenzen");
}

// ---------- Saison-Auswahl ----------
function renderSeasonSelect() {
  const el = document.getElementById("season-select");
  const keys = Object.keys(appData.seasons).sort();
  el.innerHTML = keys.map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
  el.value = currentSeasonKey();
  const info = document.getElementById("season-info");
  if (info) {
    const s = getSeason();
    const n = s.trainer.length + s.schwerpunkt.length + s.foerderung.length;
    info.textContent = `${currentSeasonKey()} — ${n} Personen`;
  }
}

// ---------- Übersicht ----------
function renderSummary() {
  const t = bereichSum("trainer"), sp = bereichSum("schwerpunkt"), fo = bereichSum("foerderung");
  const gesamt = t + sp + fo;
  const cards = [
    { label: "Trainer", value: t, sub: getSeason().trainer.length + " Personen" },
    { label: "Schwerpunkttrainer", value: sp, sub: getSeason().schwerpunkt.length + " Personen" },
    { label: "Förderung", value: fo, sub: getSeason().foerderung.length + " Personen" },
    { label: "Gesamt / Monat", value: gesamt, sub: `× ${MONATE_PRO_JAHR} = ${fmtEuro(gesamt * MONATE_PRO_JAHR)} / Jahr`, strong: true }
  ];
  document.getElementById("summary-cards").innerHTML = cards.map((c) => `
    <div class="summary-card${c.strong ? " strong" : ""}">
      <div class="sc-label">${escapeHtml(c.label)}</div>
      <div class="sc-value">${escapeHtml(fmtEuro(c.value))}</div>
      <div class="sc-sub">${escapeHtml(c.sub)}</div>
    </div>`).join("");

  // Nach Mannschaft aggregieren.
  const s = getSeason();
  const map = {};
  const add = (m, key, v) => {
    m = m || "(ohne Mannschaft)";
    if (!map[m]) map[m] = { trainer: 0, schwerpunkt: 0, foerderung: 0 };
    map[m][key] += v;
  };
  s.trainer.forEach((x) => add(x.mannschaft, "trainer", trainerAeIst(x)));
  s.schwerpunkt.forEach((x) => add(x.mannschaft, "schwerpunkt", entryAe(x)));
  s.foerderung.forEach((x) => add(x.mannschaft, "foerderung", entryAe(x)));
  const rows = Object.keys(map).sort((a, b) => a.localeCompare(b, "de")).map((m) => {
    const r = map[m]; const sum = r.trainer + r.schwerpunkt + r.foerderung;
    return `<tr><td>${escapeHtml(m)}</td><td class="num">${escapeHtml(fmtEuro(r.trainer))}</td><td class="num">${escapeHtml(fmtEuro(r.schwerpunkt))}</td><td class="num">${escapeHtml(fmtEuro(r.foerderung))}</td><td class="num strong">${escapeHtml(fmtEuro(sum))}</td></tr>`;
  }).join("");
  const footer = `<tr class="total-row"><td>Summe</td><td class="num">${escapeHtml(fmtEuro(t))}</td><td class="num">${escapeHtml(fmtEuro(sp))}</td><td class="num">${escapeHtml(fmtEuro(fo))}</td><td class="num strong">${escapeHtml(fmtEuro(gesamt))}</td></tr>`;
  document.querySelector("#uebersicht-mannschaft tbody").innerHTML = rows + footer;
}

// ---------- Datentabellen ----------
const BEREICH_CFG = {
  trainer: { filters: ["mannschaft", "position", "lizenz"], row: trainerRowHtml },
  schwerpunkt: { filters: ["mannschaft", "position"], row: schwerpunktRowHtml },
  foerderung: { filters: ["mannschaft", "position"], row: foerderungRowHtml }
};

function trainerRowHtml(t) {
  return `<tr class="data-row" data-bereich="trainer" data-id="${escapeHtml(t.id)}">
    <td class="strong">${escapeHtml(t.name)}</td>
    <td>${escapeHtml(t.mannschaft)}</td>
    <td>${escapeHtml(t.position)}</td>
    <td>${escapeHtml(t.jahrgangsleiter)}</td>
    <td>${escapeHtml(t.lizenz)}</td>
    <td>${escapeHtml(t.landesebene)}</td>
    <td class="num">${escapeHtml(fmtPct(t.stelle))}</td>
    <td class="num">${escapeHtml(fmtEuro(trainerAe100(t)))}</td>
    <td class="num strong">${escapeHtml(fmtEuro(trainerAeIst(t)))}${hasManual(t) ? ' <span class="badge" title="Manueller Wert">M</span>' : ""}${t.besonderheit ? ` <span class="badge info" title="${escapeHtml(t.besonderheit)}">!</span>` : ""}</td>
  </tr>`;
}
function schwerpunktRowHtml(x) {
  return `<tr class="data-row" data-bereich="schwerpunkt" data-id="${escapeHtml(x.id)}">
    <td class="strong">${escapeHtml(x.name)}</td>
    <td>${escapeHtml(x.mannschaft)}</td>
    <td>${escapeHtml(x.position)}</td>
    <td>${escapeHtml(x.besonderheit)}</td>
    <td>${escapeHtml(x.einheitenProWoche)}</td>
    <td class="num strong">${escapeHtml(fmtEuro(entryAe(x)))}</td>
  </tr>`;
}
function foerderungRowHtml(x) {
  return `<tr class="data-row" data-bereich="foerderung" data-id="${escapeHtml(x.id)}">
    <td class="strong">${escapeHtml(x.name)}</td>
    <td>${escapeHtml(x.mannschaft)}</td>
    <td>${escapeHtml(x.position)}</td>
    <td>${escapeHtml(x.besonderheit)}</td>
    <td class="num strong">${escapeHtml(fmtEuro(entryAe(x)))}</td>
  </tr>`;
}

function filteredList(bereich) {
  const cfg = BEREICH_CFG[bereich];
  const data = getSeason()[bereich];
  const q = (val(bereich + "-search") || "").trim().toLowerCase();
  const mf = val(bereich + "-mannschaft");
  const pf = val(bereich + "-position");
  const lf = cfg.filters.includes("lizenz") ? val(bereich + "-lizenz") : "";
  return data.filter((x) => {
    if (mf && (x.mannschaft || "") !== mf) return false;
    if (pf && (x.position || "") !== pf) return false;
    if (lf && (x.lizenz || "") !== lf) return false;
    if (q) {
      const hay = `${x.name || ""} ${x.mannschaft || ""} ${x.position || ""} ${x.besonderheit || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderBereich(bereich) {
  const cfg = BEREICH_CFG[bereich];
  const data = getSeason()[bereich];
  const list = filteredList(bereich);
  document.getElementById(bereich + "-rows").innerHTML = list.map(cfg.row).join("");
  document.getElementById(bereich + "-count").textContent = `${list.length} von ${data.length}`;
  document.getElementById(bereich + "-empty").classList.toggle("hidden", list.length > 0);
}

// ---------- Parameter-Editor ----------
const PARAM_GROUPS = [
  { key: "positionen", label: "Positionen" },
  { key: "lizenzen", label: "Lizenzen" },
  { key: "landesebene", label: "Landesebene" },
  { key: "jahrgangsleiter", label: "Jahrgangsleiter" }
];
function renderParameter() {
  document.getElementById("parameter-groups").innerHTML = PARAM_GROUPS.map((g) => {
    const rows = appData.parameter[g.key].map((r, i) => `
      <div class="param-row">
        <input class="pg-label" data-group="${g.key}" data-idx="${i}" data-k="label" value="${escapeHtml(r.label)}" />
        <input class="pg-betrag" type="number" step="1" data-group="${g.key}" data-idx="${i}" data-k="betrag" value="${escapeHtml(r.betrag)}" /> €
        <button class="icon-btn" data-remove="${g.key}" data-idx="${i}" title="Zeile entfernen">×</button>
      </div>`).join("");
    return `<div class="param-group">
      <h3>${escapeHtml(g.label)}</h3>
      ${rows}
      <button class="btn small secondary" data-addrow="${g.key}">+ Zeile</button>
    </div>`;
  }).join("");
}

// ---------- Meta / Changelog / Nutzer ----------
function renderMeta() {
  const m = appData.meta || {};
  const rows = [
    ["Aktive Saison", currentSeasonKey()],
    ["Saisons gesamt", String(Object.keys(appData.seasons).length)],
    ["Letzter Stand", m.stand ? new Date(m.stand).toLocaleString("de-DE") : "—"]
  ];
  document.getElementById("meta-view").innerHTML = rows.map(([k, v]) =>
    `<div class="form-field"><label>${escapeHtml(k)}</label><span>${escapeHtml(v)}</span></div>`).join("");
}
function renderVersionInfo() {
  document.querySelectorAll("#version-badge, #version-badge-2").forEach((el) => { if (el) el.textContent = "v" + APP_VERSION; });
  const list = document.getElementById("changelog-list");
  if (!list) return;
  list.innerHTML = APP_CHANGELOG.map((entry) => `
    <div class="changelog-entry">
      <div class="cv">Version ${escapeHtml(entry.version)}</div>
      ${entry.groups.map((g) => `
        <div class="changelog-group">
          <div class="cg-title">${escapeHtml(g.title)}</div>
          <ul class="cg-items">${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>`).join("");
}
function renderHeaderUser() {
  const el = document.getElementById("header-user");
  const el2 = document.getElementById("einstellungen-user");
  if (!currentUser) { if (el) el.textContent = ""; if (el2) el2.textContent = ""; return; }
  const name = (currentUser.vorname || currentUser.nachname)
    ? `${currentUser.vorname || ""} ${currentUser.nachname || ""}`.trim()
    : currentUser.username;
  const admin = currentUser.isAdmin ? " (Admin)" : "";
  if (el) el.textContent = "👤 " + name + admin;
  if (el2) el2.textContent = "Angemeldet als " + name + admin +
    (currentUser.isAdmin ? "" : " — Bearbeiten ist Administratoren vorbehalten.");
}
function applyAdminVisibility() {
  const isAdmin = !!(currentUser && currentUser.isAdmin);
  document.body.classList.toggle("is-admin", isAdmin);
  document.querySelectorAll(".admin-only").forEach((el) => el.classList.toggle("hidden", !isAdmin));
}

function renderAll() {
  renderSeasonSelect();
  populateFilters();
  renderSummary();
  renderBereich("trainer");
  renderBereich("schwerpunkt");
  renderBereich("foerderung");
  renderParameter();
  renderMeta();
  renderVersionInfo();
  const total = getSeason().trainer.length + getSeason().schwerpunkt.length + getSeason().foerderung.length;
  document.getElementById("import-banner").classList.toggle("hidden", total > 0);
}

// ---------- Personen-Formular ----------
const FIELD_DEFS = {
  trainer: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "mannschaft", label: "Mannschaft", type: "text" },
    { key: "position", label: "Position", type: "paramselect", param: "positionen", allowEmpty: true },
    { key: "jahrgangsleiter", label: "Jahrgangsleiter", type: "paramselect", param: "jahrgangsleiter", allowEmpty: true },
    { key: "lizenz", label: "Lizenz", type: "paramselect", param: "lizenzen", allowEmpty: false },
    { key: "landesebene", label: "Landesebene", type: "paramselect", param: "landesebene", allowEmpty: false },
    { key: "stelle", label: "Stelle (%)", type: "percent" },
    { key: "manuellAE", label: "AE manuell (€)", type: "number", placeholder: "leer = automatisch" },
    { key: "besonderheit", label: "Besonderheit", type: "text", wide: true }
  ],
  schwerpunkt: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "mannschaft", label: "Mannschaft", type: "text" },
    { key: "position", label: "Position", type: "text" },
    { key: "einheitenProWoche", label: "Einheiten/Woche", type: "text" },
    { key: "ae", label: "AE / Monat (€)", type: "number" },
    { key: "besonderheit", label: "Besonderheit", type: "text", wide: true }
  ],
  foerderung: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "mannschaft", label: "Mannschaft", type: "text" },
    { key: "position", label: "Position", type: "text" },
    { key: "ae", label: "AE / Monat (€)", type: "number" },
    { key: "besonderheit", label: "Besonderheit", type: "text", wide: true }
  ]
};

function fieldHtml(f) {
  const id = "pf-" + f.key;
  let input;
  if (f.type === "paramselect") {
    const opts = (f.allowEmpty ? `<option value="">—</option>` : "") +
      appData.parameter[f.param].map((o) => `<option value="${escapeHtml(o.label)}">${escapeHtml(o.label)} (${escapeHtml(o.betrag)} €)</option>`).join("");
    input = `<select id="${id}">${opts}</select>`;
  } else if (f.type === "number" || f.type === "percent") {
    input = `<input type="number" step="${f.type === "percent" ? "1" : "0.01"}" id="${id}" placeholder="${escapeHtml(f.placeholder || "")}" />`;
  } else {
    input = `<input type="text" id="${id}" placeholder="${escapeHtml(f.placeholder || "")}" />`;
  }
  return `<div class="form-field${f.wide ? " wide" : ""}"><label>${escapeHtml(f.label)}${f.required ? " *" : ""}</label>${input}</div>`;
}

function openPersonModal(bereich, id) {
  if (!(currentUser && currentUser.isAdmin)) return;
  const defs = FIELD_DEFS[bereich];
  const arr = getSeason()[bereich];
  const obj = id ? arr.find((x) => x.id === id) : null;
  editing = { bereich, id: obj ? obj.id : null };

  document.getElementById("pf-fields").innerHTML = defs.map(fieldHtml).join("");
  // Werte setzen
  defs.forEach((f) => {
    const el = document.getElementById("pf-" + f.key);
    if (!el) return;
    let v = obj ? obj[f.key] : undefined;
    if (f.type === "percent") {
      const factor = obj ? (Number(obj.stelle) || 0) : 1;
      el.value = numFmt(factor * 100, 2);
    } else if (f.key === "manuellAE") {
      el.value = (obj && hasManual(obj)) ? obj.manuellAE : "";
    } else if (f.type === "paramselect" && !obj) {
      el.value = f.allowEmpty ? "" : (appData.parameter[f.param][0] ? appData.parameter[f.param][0].label : "");
    } else {
      el.value = v == null ? "" : v;
    }
  });

  document.getElementById("person-modal-title").textContent =
    (obj ? "Bearbeiten" : "Neu") + " — " + (BEREICHE.find((b) => b.id === bereich).label);
  document.getElementById("btn-delete-person").classList.toggle("hidden", !obj);

  const preview = document.getElementById("pf-ae-preview");
  if (bereich === "trainer") {
    preview.classList.remove("hidden");
    defs.forEach((f) => {
      const el = document.getElementById("pf-" + f.key);
      if (el) el.addEventListener("input", updateAePreview);
    });
    updateAePreview();
  } else {
    preview.classList.add("hidden");
  }

  document.getElementById("person-modal").classList.remove("hidden");
  const first = document.getElementById("pf-name");
  if (first) first.focus();
}

function readPersonForm(bereich) {
  const obj = {};
  FIELD_DEFS[bereich].forEach((f) => {
    const el = document.getElementById("pf-" + f.key);
    if (!el) return;
    if (f.type === "percent") {
      obj.stelle = (parseFloat(String(el.value).replace(",", ".")) || 0) / 100;
    } else if (f.key === "manuellAE") {
      const s = String(el.value).trim();
      obj.manuellAE = s === "" ? null : (parseFloat(s.replace(",", ".")) || 0);
    } else if (f.type === "number") {
      obj[f.key] = parseFloat(String(el.value).replace(",", ".")) || 0;
    } else {
      obj[f.key] = el.value.trim();
    }
  });
  return obj;
}

function updateAePreview() {
  const t = readPersonForm("trainer");
  const ae100 = trainerAe100(t);
  const aeIst = trainerAeIst(t);
  document.getElementById("pf-ae-preview").innerHTML =
    `AE 100 %: <strong>${escapeHtml(fmtEuro(ae100))}</strong> &nbsp;·&nbsp; AE / Monat: <strong>${escapeHtml(fmtEuro(aeIst))}</strong>` +
    (hasManual(t) ? ' <span class="muted">(manueller Wert)</span>' : "");
}

function closePersonModal() {
  document.getElementById("person-modal").classList.add("hidden");
  editing = { bereich: null, id: null };
}

function savePerson() {
  const bereich = editing.bereich;
  if (!bereich) return;
  const data = readPersonForm(bereich);
  if (!data.name) { alert("Bitte einen Namen eingeben."); return; }
  const arr = getSeason()[bereich];
  let obj = editing.id ? arr.find((x) => x.id === editing.id) : null;
  if (!obj) { obj = { id: uuid() }; arr.push(obj); }
  Object.assign(obj, data);
  persist();
  renderAll();
  closePersonModal();
}

function deletePerson() {
  const bereich = editing.bereich;
  if (!bereich || !editing.id) return;
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;
  const s = getSeason();
  s[bereich] = s[bereich].filter((x) => x.id !== editing.id);
  persist();
  renderAll();
  closePersonModal();
}

// ---------- Saison-Verwaltung ----------
function switchSeason(key) {
  if (!appData.seasons[key]) return;
  appData.meta.currentSeason = key;
  persist();
  renderAll();
}
function newSeason() {
  if (!(currentUser && currentUser.isAdmin)) return;
  const name = (prompt("Name der neuen (leeren) Saison, z. B. 2027/28:") || "").trim();
  if (!name) return;
  if (appData.seasons[name]) { alert("Diese Saison existiert bereits."); return; }
  appData.seasons[name] = { trainer: [], schwerpunkt: [], foerderung: [] };
  switchSeason(name);
}
function duplicateSeason() {
  if (!(currentUser && currentUser.isAdmin)) return;
  const name = (prompt("Name der neuen Saison (Kopie der aktuellen), z. B. 2027/28:") || "").trim();
  if (!name) return;
  if (appData.seasons[name]) { alert("Diese Saison existiert bereits."); return; }
  const copy = clone(getSeason());
  ["trainer", "schwerpunkt", "foerderung"].forEach((b) => copy[b].forEach((x) => { x.id = uuid(); }));
  appData.seasons[name] = copy;
  switchSeason(name);
}
function deleteSeason() {
  if (!(currentUser && currentUser.isAdmin)) return;
  if (Object.keys(appData.seasons).length <= 1) { alert("Die letzte Saison kann nicht gelöscht werden."); return; }
  const key = currentSeasonKey();
  if (!confirm(`Saison „${key}“ mit allen Einträgen wirklich löschen?`)) return;
  delete appData.seasons[key];
  appData.meta.currentSeason = Object.keys(appData.seasons)[0];
  persist();
  renderAll();
}

// ---------- Import (einmaliger Cloud-Seed) ----------
function handleImportFile(file) {
  if (!file) return;
  if (!(currentUser && currentUser.isAdmin)) { alert("Nur Administratoren können importieren."); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try { parsed = JSON.parse(reader.result); }
    catch (e) { alert("Die Datei ist kein gültiges JSON."); return; }
    if (!parsed || typeof parsed.seasons !== "object" || parsed.seasons == null) {
      alert("Die Datei enthält nicht das erwartete Format ({ seasons: { … } }).");
      return;
    }
    const total = getSeason().trainer.length + getSeason().schwerpunkt.length + getSeason().foerderung.length;
    if (total > 0 && !confirm("Es sind bereits Daten vorhanden. Diese durch den Import ERSETZEN?")) return;
    appData = normalizeData(parsed);
    renderAll();
    const ok = await saveNow();
    if (ok) alert("Import erfolgreich gespeichert.");
  };
  reader.readAsText(file, "utf-8");
}

// ---------- Tabs ----------
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-section").forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
  if (tab === "uebersicht") renderSummary();
  if (BEREICH_CFG[tab]) renderBereich(tab);
  if (tab === "parameter") renderParameter();
  if (tab === "einstellungen") { renderMeta(); renderVersionInfo(); renderSeasonSelect(); }
}

// ---------- Gateway: Laden / Speichern / Konflikte ----------
function setSaveStatus(text, kind) {
  const el = document.getElementById("save-status");
  if (!el) return;
  el.textContent = text;
  el.className = "header-status" + (kind ? " is-" + kind : "");
}
function persist() {
  clearTimeout(persistTimer);
  setSaveStatus("Änderung noch nicht gespeichert…", "pending");
  persistTimer = setTimeout(doPersist, 300);
}
async function saveNow() { clearTimeout(persistTimer); return doPersist(); }
async function doPersist() {
  setSaveStatus("Speichern…", "pending");
  try {
    appData.meta = Object.assign({}, appData.meta, { stand: new Date().toISOString() });
    await gatewaySave(appData);
    const t = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    setSaveStatus("Gespeichert " + t, "ok");
    return true;
  } catch (e) {
    if (e instanceof ConflictError) { await reloadAfterConflict(); setSaveStatus("Von anderem Gerät aktualisiert", ""); return false; }
    if (e instanceof NotLoggedInError) { showConnectScreen("Sitzung abgelaufen — bitte neu anmelden."); return false; }
    console.error("Speichern fehlgeschlagen", e);
    setSaveStatus("Nicht gespeichert", "error");
    alert("Speichern fehlgeschlagen: " + e.message);
    return false;
  }
}
async function reloadAfterConflict() {
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    renderAll();
    alert("Die Daten wurden zwischenzeitlich auf einem anderen Gerät geändert — die aktuelle Version wurde neu geladen. Bitte die letzte Änderung bei Bedarf erneut vornehmen.");
  } catch (e) {
    console.error("Neuladen nach Konflikt fehlgeschlagen", e);
  }
}

// ---------- Start ----------
function showConnectScreen(errorMsg) {
  document.getElementById("connect-screen").style.display = "";
  document.getElementById("app-shell").style.display = "none";
  document.getElementById("cloud-error").textContent = errorMsg ? "Fehler: " + errorMsg : "";
}
async function startApp() {
  document.getElementById("connect-screen").style.display = "none";
  document.getElementById("app-shell").style.display = "";
  renderAll();
  try { currentUser = await fetchMe(); } catch (_) { /* best effort */ }
  renderHeaderUser();
  applyAdminVisibility();
}
async function init() {
  setupListeners();
  if (!getSessionToken()) { showConnectScreen(); return; }
  try {
    const data = await gatewayLoad();
    appData = normalizeData(data);
    await startApp();
  } catch (e) {
    if (e instanceof NotLoggedInError) { showConnectScreen(); return; }
    console.error("Nextcloud-Zugriff über Login fehlgeschlagen", e);
    showConnectScreen(e.message);
  }
}

function setupListeners() {
  document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.getElementById("season-select").addEventListener("change", (e) => switchSeason(e.target.value));

  // Filter (live) je Bereich
  ["trainer", "schwerpunkt", "foerderung"].forEach((b) => {
    document.querySelectorAll(`[data-filter="${b}"]`).forEach((el) => {
      el.addEventListener("input", () => renderBereich(b));
      el.addEventListener("change", () => renderBereich(b));
    });
    document.getElementById(b + "-rows").addEventListener("click", (e) => {
      const row = e.target.closest(".data-row");
      if (row && currentUser && currentUser.isAdmin) openPersonModal(b, row.dataset.id);
    });
  });

  // Hinzufügen-Buttons
  document.querySelectorAll("[data-add]").forEach((btn) =>
    btn.addEventListener("click", () => openPersonModal(btn.dataset.add, null)));

  // Personen-Modal
  document.getElementById("person-modal-close").addEventListener("click", closePersonModal);
  document.getElementById("btn-cancel-person").addEventListener("click", closePersonModal);
  document.getElementById("btn-save-person").addEventListener("click", savePerson);
  document.getElementById("btn-delete-person").addEventListener("click", deletePerson);
  document.getElementById("person-modal").addEventListener("click", (e) => { if (e.target.id === "person-modal") closePersonModal(); });
  document.getElementById("person-form").addEventListener("submit", (e) => { e.preventDefault(); savePerson(); });

  // Parameter-Editor (Event-Delegation)
  const pg = document.getElementById("parameter-groups");
  pg.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.dataset.group) return;
    const g = el.dataset.group, i = Number(el.dataset.idx), k = el.dataset.k;
    if (k === "betrag") appData.parameter[g][i].betrag = parseFloat(String(el.value).replace(",", ".")) || 0;
    else appData.parameter[g][i].label = el.value;
    persist();
    renderSummary();
    renderBereich("trainer");
  });
  pg.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      appData.parameter[rm.dataset.remove].splice(Number(rm.dataset.idx), 1);
      persist(); renderParameter(); renderSummary(); renderBereich("trainer"); populateFilters();
      return;
    }
    const add = e.target.closest("[data-addrow]");
    if (add) {
      appData.parameter[add.dataset.addrow].push({ label: "Neu", betrag: 0 });
      persist(); renderParameter();
      return;
    }
  });

  // Saison-Verwaltung
  document.getElementById("btn-season-new").addEventListener("click", newSeason);
  document.getElementById("btn-season-duplicate").addEventListener("click", duplicateSeason);
  document.getElementById("btn-season-delete").addEventListener("click", deleteSeason);

  // Import
  document.getElementById("btn-import-seed").addEventListener("click", () => document.getElementById("import-file-input").click());
  document.getElementById("import-file-input").addEventListener("change", (e) => { handleImportFile(e.target.files[0]); e.target.value = ""; });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("person-modal").classList.contains("hidden")) closePersonModal();
  });
}

document.addEventListener("DOMContentLoaded", init);
