// ===== Back-office Norria Beauty Salon =====
let pass = '';
const H = () => ({ 'x-admin-password': pass });

async function login() {
  pass = document.getElementById('pass').value;
  const res = await fetch('/api/admin/reservations', { headers: H() });
  if (!res.ok) { document.getElementById('lerr').classList.remove('hidden'); return; }
  document.getElementById('login').classList.add('hidden');
  document.getElementById('dash').classList.remove('hidden');
  const rows = await res.json();
  renderResa(rows); renderDashboard(rows); renderCalendar();
  loadClients(); loadCatalogue(); loadReal();
}

function tab(t) {
  ['dash', 'cal', 'resa', 'clients', 'catalogue', 'real'].forEach((x) => {
    document.getElementById('v-' + x).classList.toggle('hidden', x !== t);
    document.querySelector(`.tab[data-t="${x}"]`).classList.toggle('on', x === t);
  });
  if (t === 'cal') renderCalendar();
}

const eur = (n) => `${Number(n).toFixed(0)} €`;
const dfr = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

// ----- tableau de bord -----
function renderDashboard(rows) {
  const today = new Date().toISOString().slice(0, 10);
  const actives = rows.filter((r) => r.statut !== 'annulee');
  const upcoming = actives.filter((r) => r.date >= today).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
  const past = actives.filter((r) => r.date < today).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
  const ca = actives.reduce((s, r) => s + (r.service_prix || 0), 0);
  const acomptes = actives.reduce((s, r) => s + (r.acompte_paye ? 1 : 0), 0);

  document.getElementById('stats').innerHTML =
    `<div class="stat"><b>${upcoming.length}</b> RDV à venir</div>` +
    `<div class="stat"><b>${actives.length}</b> au total</div>` +
    `<div class="stat"><b>${acomptes}</b> acomptes payés</div>` +
    `<div class="stat"><b>${eur(ca)}</b> CA estimé</div>`;

  const line = (r) => `<div class="mine"><b>${r.service_nom}</b> — ${r.cliente_nom}<br>
    <span class="muted" style="font-size:12px">${dfr(r.date)} · ${r.debut}–${r.fin} · ${r.statut.replace(/_/g, ' ')}</span></div>`;
  document.getElementById('upcoming').innerHTML = upcoming.length ? upcoming.slice(0, 8).map(line).join('') : '<p class="muted">Aucun rendez-vous à venir.</p>';
  document.getElementById('history').innerHTML = past.length ? past.slice(0, 8).map(line).join('') : '<p class="muted">Pas encore d\'historique.</p>';

  const counts = {};
  actives.forEach((r) => { counts[r.service_nom] = (counts[r.service_nom] || 0) + 1; });
  const pop = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  document.querySelector('#popular tbody').innerHTML = pop.length ? pop.map(([n, c]) => `<tr><td>${n}</td><td>${c}</td></tr>`).join('') : '<tr><td colspan="2" class="muted">Aucune donnée.</td></tr>';

  document.getElementById('revenue').innerHTML = `<div class="bignum">${eur(ca)}</div><p class="muted">sur ${actives.length} réservation(s) — hors prestations « sur devis »</p>`;
}

// ----- calendrier jour -----
let calDate = new Date().toISOString().slice(0, 10);
const CAL_START = 8 * 60, CAL_END = 21 * 60, PXMIN = 0.9; // 0.9px/min
function calShift(d) { const x = new Date(calDate + 'T00:00:00'); x.setDate(x.getDate() + d); calDate = x.toISOString().slice(0, 10); renderCalendar(); }
function calToday() { calDate = new Date().toISOString().slice(0, 10); renderCalendar(); }
function renderCalendar() {
  document.getElementById('calLabel').textContent = new Date(calDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const grid = document.getElementById('calGrid');
  const height = (CAL_END - CAL_START) * PXMIN;
  let html = `<div class="calhours">`;
  for (let h = CAL_START; h <= CAL_END; h += 60) html += `<div class="calhour" style="top:${(h - CAL_START) * PXMIN}px">${String(h / 60).padStart(2, '0')}:00</div>`;
  html += `</div><div class="calcol" style="height:${height}px">`;
  for (let h = CAL_START; h <= CAL_END; h += 60) html += `<div class="calline" style="top:${(h - CAL_START) * PXMIN}px"></div>`;
  const toMin = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
  (lastRows || []).filter((r) => r.date === calDate && r.statut !== 'annulee').forEach((r) => {
    const top = (toMin(r.debut) - CAL_START) * PXMIN;
    const hgt = Math.max((toMin(r.fin) - toMin(r.debut)) * PXMIN, 22);
    html += `<div class="calevt" style="top:${top}px;height:${hgt}px" onclick="openEdit(${r.id})">
      <b>${r.debut}–${r.fin}</b> ${r.cliente_nom}<br><span>${r.service_nom}</span></div>`;
  });
  html += `</div>`;
  grid.innerHTML = html;
}

// ----- reservations -----
let lastRows = [];
async function reloadResa() { renderResa(await (await fetch('/api/admin/reservations', { headers: H() })).json()); }
function renderResa(rows) {
  lastRows = rows;
  const today = new Date().toISOString().slice(0, 10);
  const actives = rows.filter((r) => r.statut !== 'annulee');
  const aVenir = actives.filter((r) => r.date >= today).length;
  const acomptes = actives.reduce((s, r) => s + (r.acompte_paye ? 1 : 0), 0);
  document.getElementById('stats').innerHTML =
    `<div class="stat"><b>${actives.length}</b> réservations</div>` +
    `<div class="stat"><b>${aVenir}</b> à venir</div>` +
    `<div class="stat"><b>${acomptes}</b> acomptes payés</div>`;
  const tb = document.querySelector('#tbl tbody'); tb.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.debut}–${r.fin}</td>
      <td>${r.service_nom}${r.note ? `<br><span class="muted" style="font-size:12px">📝 ${r.note}</span>` : ''}</td>
      <td>${r.cliente_nom}${r.cliente_email ? `<br><span class="muted" style="font-size:12px">${r.cliente_email}</span>` : ''}</td>
      <td><a href="tel:${r.cliente_tel}">${r.cliente_tel}</a></td>
      <td>${r.photo ? `<a href="${r.photo}" target="_blank"><img class="thumb" src="${r.photo}"></a>` : '—'}</td>
      <td><span class="badge b-${r.statut}">${r.statut.replace(/_/g, ' ')}</span></td>
      <td>${r.statut !== 'annulee' ? `${r.statut === 'en_attente_acompte' ? `<button class="btn mini" style="background:linear-gradient(90deg,#3fae6b,#8fe0ad);color:#0c2a18" onclick="confirmer(${r.id})">✓ Confirmer l'acompte</button> ` : ''}<button class="btn ghost mini" onclick="openEdit(${r.id})">Déplacer</button> <button class="btn ghost mini" onclick="annuler(${r.id})">Annuler</button>` : ''}</td>`;
    tb.appendChild(tr);
  });
}
async function annuler(id) {
  if (!confirm('Annuler cette réservation ?')) return;
  await fetch(`/api/admin/reservations/${id}/annuler`, { method: 'POST', headers: H() });
  reloadResa();
}
async function confirmer(id) {
  if (!confirm('Confirmer que l\'acompte a bien été reçu (Wero) ? Le rendez-vous deviendra définitif.')) return;
  await fetch(`/api/admin/reservations/${id}/confirmer`, { method: 'POST', headers: H() });
  reloadResa();
}

// ----- deplacer / modifier -----
let editId = null;
function openEdit(id) {
  const r = lastRows.find((x) => x.id === id); if (!r) return;
  editId = id;
  document.getElementById('editRecap').textContent = `${r.service_nom} — ${r.cliente_nom} (actuel : ${r.date} à ${r.debut})`;
  document.getElementById('e_date').value = r.date;
  document.getElementById('e_debut').value = r.debut;
  document.getElementById('e_statut').value = r.statut;
  document.getElementById('e_note').value = r.note || '';
  document.getElementById('e_err').classList.add('hidden');
  document.getElementById('editModal').classList.remove('hidden');
}
async function saveEdit() {
  const body = {
    date: document.getElementById('e_date').value,
    debut: document.getElementById('e_debut').value,
    statut: document.getElementById('e_statut').value,
    note: document.getElementById('e_note').value,
  };
  const res = await fetch('/api/admin/reservations/' + editId, {
    method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, H()), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) { const e = document.getElementById('e_err'); e.textContent = data.error || 'Erreur'; e.classList.remove('hidden'); return; }
  document.getElementById('editModal').classList.add('hidden');
  reloadResa();
}

// ----- clients -----
async function loadClients() {
  const rows = await (await fetch('/api/admin/clients', { headers: H() })).json();
  const tb = document.querySelector('#ctbl tbody'); tb.innerHTML = '';
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">Aucun compte client pour le moment.</td></tr>'; return; }
  rows.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.id}</td><td>${c.nom}</td><td><a href="tel:${c.tel}">${c.tel}</a></td><td>${c.email}</td><td>${(c.cree_le || '').slice(0, 10)}</td>`;
    tb.appendChild(tr);
  });
}

// ----- catalogue -----
async function loadCatalogue() {
  const rows = await (await fetch('/api/admin/catalogue', { headers: H() })).json();
  const g = document.getElementById('gadmin'); g.innerHTML = '';
  rows.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div class="im" style="background-image:url('${c.image_url}')"></div>
      <div class="cap"><span>${c.titre}</span><button class="link" onclick="delCat(${c.id})">suppr.</button></div>`;
    g.appendChild(el);
  });
}
async function addCat() {
  const titre = document.getElementById('c_titre').value.trim();
  const categorie = document.getElementById('c_cat').value.trim();
  const image_url = document.getElementById('c_url').value.trim();
  if (!titre || !image_url) { alert('Titre et URL de l\'image requis.'); return; }
  await fetch('/api/admin/catalogue', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H()), body: JSON.stringify({ titre, categorie, image_url }) });
  document.getElementById('c_titre').value = ''; document.getElementById('c_cat').value = ''; document.getElementById('c_url').value = '';
  loadCatalogue();
}
async function delCat(id) {
  if (!confirm('Supprimer cette photo du catalogue ?')) return;
  await fetch('/api/admin/catalogue/' + id, { method: 'DELETE', headers: H() });
  loadCatalogue();
}

// ----- realisations -----
async function loadReal() {
  const rows = await (await fetch('/api/admin/realisations', { headers: H() })).json();
  const g = document.getElementById('gadminReal'); g.innerHTML = '';
  rows.forEach((c) => {
    const media = c.type === 'video'
      ? `<video src="${c.src}" muted playsinline preload="metadata" style="width:100%;height:120px;object-fit:cover"></video>`
      : `<div class="im" style="background-image:url('${c.src}')"></div>`;
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `${media}<div class="cap"><span>${c.type === 'video' ? '🎬' : '📷'} ${c.titre || ''}</span><button class="link" onclick="delReal(${c.id})">suppr.</button></div>`;
    g.appendChild(el);
  });
}
async function addReal() {
  const titre = document.getElementById('r_titre').value.trim();
  const url = document.getElementById('r_url').value.trim();
  const file = document.getElementById('r_file').files[0];
  const err = document.getElementById('r_err'); err.classList.add('hidden');
  const send = async (body) => {
    const res = await fetch('/api/admin/realisations', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H()), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Erreur'; err.classList.remove('hidden'); return; }
    document.getElementById('r_titre').value = ''; document.getElementById('r_url').value = ''; document.getElementById('r_file').value = '';
    loadReal();
  };
  if (file) {
    if (file.size > 35 * 1024 * 1024) { err.textContent = 'Fichier trop lourd (max 35 Mo).'; err.classList.remove('hidden'); return; }
    const reader = new FileReader();
    reader.onload = (e) => send({ titre, media: e.target.result });
    reader.readAsDataURL(file);
  } else if (url) {
    send({ titre, src: url });
  } else {
    err.textContent = 'Choisissez un fichier ou saisissez une URL.'; err.classList.remove('hidden');
  }
}
async function delReal(id) {
  if (!confirm('Supprimer cette réalisation ?')) return;
  await fetch('/api/admin/realisations/' + id, { method: 'DELETE', headers: H() });
  loadReal();
}
