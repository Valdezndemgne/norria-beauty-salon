// ===== Norria Coiffure — parcours client =====
const WA_NUMBER = '33752955792'; // WhatsApp Valdez (07 52 95 57 92)
const state = { service: null, date: null, slot: null, style: null, photoData: null };
let services = [], catalogue = [];
let token = localStorage.getItem('norria_token') || null;
let me = JSON.parse(localStorage.getItem('norria_me') || 'null');

const fmtDuree = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`; };
const fmtPrix = (s) => (s.prix != null ? `${s.prix} €` : 'sur devis');
const waHref = (txt) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(txt || 'Bonjour Valdez, je souhaite des infos pour une coiffure chez Norria 💕')}`;

// ---------- init ----------
function refreshAuthUI() {
  const logged = !!token && !!me;
  document.getElementById('authBtns').classList.toggle('hidden', logged);
  document.getElementById('userBtns').classList.toggle('hidden', !logged);
  document.getElementById('hello').textContent = logged ? `Bonjour ${me.nom.split(' ')[0]} 👋` : 'Bienvenue chez Norria';
  if (logged) {
    document.getElementById('nom').value = me.nom || '';
    document.getElementById('tel').value = me.tel || '';
    document.getElementById('email').value = me.email || '';
    document.getElementById('createAccountBox').classList.add('hidden');
  } else {
    document.getElementById('createAccountBox').classList.remove('hidden');
  }
}

document.getElementById('waTop').href = waHref();
document.getElementById('waStep').href = waHref();

// ---------- catalogue ----------
async function loadCatalogue() {
  catalogue = await (await fetch('/api/catalogue')).json();
  const cats = ['Tous', ...new Set(catalogue.map((c) => c.categorie))];
  const filters = document.getElementById('catFilters');
  filters.innerHTML = '';
  cats.forEach((c, i) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (i === 0 ? ' on' : '');
    chip.textContent = c;
    chip.onclick = () => { document.querySelectorAll('.chip').forEach((x) => x.classList.remove('on')); chip.classList.add('on'); renderGallery(c); };
    filters.appendChild(chip);
  });
  renderGallery('Tous');
}
function renderGallery(cat) {
  const g = document.getElementById('gallery');
  g.innerHTML = '';
  catalogue.filter((c) => cat === 'Tous' || c.categorie === cat).forEach((c) => {
    const el = document.createElement('div');
    el.className = 'gcard';
    el.innerHTML = `
      <div class="gimg" style="background-image:url('${c.image_url}')"></div>
      <div class="gcap"><span>${c.titre}</span>
        <button class="mini gold" onclick="chooseStyle('${c.titre.replace(/'/g, "\\'")}')">Choisir ce style</button>
      </div>`;
    g.appendChild(el);
  });
}
function chooseStyle(titre) {
  state.style = titre;
  const box = document.getElementById('chosenStyle');
  box.classList.remove('hidden');
  box.innerHTML = `💇🏽‍♀️ Modèle choisi : <b>${titre}</b> <button class="link" onclick="clearStyle()">retirer</button>`;
  document.getElementById('step1').scrollIntoView({ behavior: 'smooth' });
}
function clearStyle() { state.style = null; document.getElementById('chosenStyle').classList.add('hidden'); }

// ---------- prestations ----------
async function loadServices() {
  services = await (await fetch('/api/services')).json();
  const box = document.getElementById('services');
  box.innerHTML = '';
  services.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'service';
    el.onclick = () => selectService(s, el);
    el.innerHTML = `<div><div class="n">${s.nom}</div>
      <div class="meta">Durée ~ ${fmtDuree(s.duree_min)} · acompte ${s.acompte} €</div></div>
      <div class="price">${fmtPrix(s)}</div>`;
    box.appendChild(el);
  });
}
function selectService(s, el) {
  state.service = s; state.slot = null;
  document.querySelectorAll('.service').forEach((x) => x.classList.remove('sel'));
  el.classList.add('sel');
  const d = document.getElementById('date');
  d.min = new Date().toISOString().slice(0, 10);
  goStep(2);
}

// ---------- creneaux : vue calendrier / agenda ----------
const _toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const _toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

document.getElementById('date').addEventListener('change', loadSlots);
function shiftDay(delta) {
  const inp = document.getElementById('date');
  const base = inp.value ? new Date(inp.value + 'T00:00:00') : new Date();
  base.setDate(base.getDate() + delta);
  const iso = base.toISOString().slice(0, 10);
  if (iso < new Date().toISOString().slice(0, 10)) return; // pas dans le passe
  inp.value = iso; loadSlots();
}

async function loadSlots() {
  state.date = document.getElementById('date').value; state.slot = null;
  document.getElementById('toStep3').disabled = true;
  if (!state.service || !state.date) return;
  const data = await (await fetch(`/api/slots?service_id=${state.service.id}&date=${state.date}`)).json();
  const wrap = document.getElementById('slotsWrap'), agenda = document.getElementById('agenda'), noSlot = document.getElementById('noSlot');
  wrap.classList.remove('hidden');
  document.getElementById('dayLabel').textContent = formatDate(state.date);
  agenda.innerHTML = '';
  const slots = data.slots || [];
  const windows = data.windows || [];
  const busy = (data.booked || []).map((b) => [_toMin(b.debut), _toMin(b.fin)]);
  noSlot.style.display = windows.length ? 'none' : 'block';
  if (!windows.length) return;

  const freeSet = new Set(slots);
  const openMin = Math.min(...windows.map((w) => _toMin(w.debut)));
  const closeMin = Math.max(...windows.map((w) => _toMin(w.fin)));
  const inWindow = (t) => windows.some((w) => t >= _toMin(w.debut) && t < _toMin(w.fin));
  const isBusy = (t) => busy.some(([bs, be]) => t >= bs && t < be);

  for (let t = openMin; t < closeMin; t += 30) {
    const row = document.createElement('div');
    const free = freeSet.has(_toHHMM(t));
    row.className = 'arow ' + (free ? 'free' : (inWindow(t) ? (isBusy(t) ? 'busy' : 'na') : 'closed'));
    row.innerHTML = `<span class="atime">${_toHHMM(t)}</span><span class="abar">${free ? 'Réserver' : (isBusy(t) ? 'occupé' : '')}</span>`;
    if (free) row.onclick = () => {
      state.slot = _toHHMM(t);
      document.querySelectorAll('.arow').forEach((x) => x.classList.remove('sel'));
      row.classList.add('sel');
      document.getElementById('toStep3').disabled = false;
    };
    agenda.appendChild(row);
  }
}

// ---------- navigation ----------
function goStep(n) {
  if (n === 3) {
    if (!state.service || !state.date || !state.slot) return;
    const s = state.service;
    document.getElementById('recap').innerHTML =
      `<b>${s.nom}</b> — ${fmtPrix(s)}<br>📅 ${formatDate(state.date)} à <b>${state.slot}</b><br>` +
      `⏱️ Durée estimée ${fmtDuree(s.duree_min)}` + (state.style ? `<br>💇🏽‍♀️ Modèle : <b>${state.style}</b>` : '');
    document.getElementById('depositNotice').innerHTML =
      `Un <b>acompte de ${s.acompte} €</b> confirme le rendez-vous (déduit du prix total). Le solde se règle sur place.`;
    if (state.style && !document.getElementById('note').value) document.getElementById('note').value = `Modèle souhaité : ${state.style}`;
  }
  [1, 2, 3].forEach((i) => {
    document.getElementById('step' + i).classList.toggle('hidden', i !== n);
    document.getElementById('d' + i).classList.toggle('on', i <= n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
const formatDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// ---------- photo ----------
function previewPhoto() {
  const f = document.getElementById('photo').files[0];
  if (!f) { state.photoData = null; return; }
  if (f.size > 6 * 1024 * 1024) { alert('Photo trop lourde (max 6 Mo).'); document.getElementById('photo').value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => { state.photoData = e.target.result; const img = document.getElementById('photoPreview'); img.src = e.target.result; img.classList.remove('hidden'); };
  reader.readAsDataURL(f);
}
function toggleAcct() { document.getElementById('pwdWrap').classList.toggle('hidden', !document.getElementById('creerCompte').checked); }

// ---------- reservation ----------
async function submitBooking() {
  const err = document.getElementById('err'); err.classList.add('hidden');
  const nom = document.getElementById('nom').value.trim();
  const tel = document.getElementById('tel').value.trim();
  const email = document.getElementById('email').value.trim();
  const note = document.getElementById('note').value.trim();
  const creer = document.getElementById('creerCompte') && document.getElementById('creerCompte').checked;
  const password = document.getElementById('password') ? document.getElementById('password').value : '';
  if (!nom || !tel) { err.textContent = 'Le nom et le téléphone sont obligatoires.'; err.classList.remove('hidden'); return; }
  if (creer && (!email || !password)) { err.textContent = 'Pour créer un compte, renseignez e-mail et mot de passe.'; err.classList.remove('hidden'); return; }

  const btn = document.getElementById('confirmBtn'); btn.disabled = true; btn.textContent = 'Enregistrement…';
  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: JSON.stringify({ service_id: state.service.id, date: state.date, debut: state.slot, nom, tel, email, note, photo: state.photoData, creer_compte: creer, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    if (data.token) { token = data.token; me = { nom, tel, email }; localStorage.setItem('norria_token', token); localStorage.setItem('norria_me', JSON.stringify(me)); }
    if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
    document.querySelector('.wrap').innerHTML = `
      <div class="card center">
        <h2 class="section">Merci ${nom} ! 💛</h2>
        <p>Votre réservation est enregistrée :</p>
        <p class="summary"><b>${state.service.nom}</b><br>${formatDate(state.date)} à <b>${state.slot}</b></p>
        <div class="notice">Un acompte de <b>${data.acompte} €</b> confirmera le rendez-vous. Angela vous recontacte.</div>
        <a class="btn ghost" style="margin-top:14px" href="${waHref('Bonjour Valdez, je viens de réserver ' + state.service.nom + ' le ' + state.date + ' à ' + state.slot)}" target="_blank">💬 Prévenir Valdez sur WhatsApp</a>
        <p class="muted" style="margin-top:14px">Norria Beauty Salon · 07 52 95 57 92</p>
      </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Confirmer la réservation';
  }
}

// ---------- auth ----------
let authMode = 'login';
function openAuth(mode) {
  authMode = mode;
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('regFields').classList.toggle('hidden', mode !== 'register');
  document.getElementById('authTitle').textContent = mode === 'register' ? 'Créer un compte' : 'Connexion';
  document.getElementById('a_err').classList.add('hidden');
  document.getElementById('authSwitch').innerHTML = mode === 'register'
    ? 'Déjà un compte ? <button class="link" onclick="openAuth(\'login\')">Se connecter</button>'
    : 'Pas de compte ? <button class="link" onclick="openAuth(\'register\')">Créer un compte</button>';
}
function closeAuth() { document.getElementById('authModal').classList.add('hidden'); }
async function submitAuth() {
  const err = document.getElementById('a_err'); err.classList.add('hidden');
  const email = document.getElementById('a_email').value.trim();
  const pass = document.getElementById('a_pass').value;
  const body = { email, password: pass };
  if (authMode === 'register') { body.nom = document.getElementById('a_nom').value.trim(); body.tel = document.getElementById('a_tel').value.trim(); }
  try {
    const res = await fetch('/api/' + (authMode === 'register' ? 'register' : 'login'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');
    token = data.token; me = data.client;
    localStorage.setItem('norria_token', token); localStorage.setItem('norria_me', JSON.stringify(me));
    closeAuth(); refreshAuthUI();
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
}
function logout() { token = null; me = null; localStorage.removeItem('norria_token'); localStorage.removeItem('norria_me'); refreshAuthUI(); }

const BOOKING_IDS = ['catalogSection', 'stepDots', 'step1', 'step2', 'step3'];
function showBooking() {
  document.getElementById('clientDash').classList.add('hidden');
  BOOKING_IDS.forEach((id) => { const el = document.getElementById(id); if (el && id !== 'step2' && id !== 'step3') el.classList.remove('hidden'); });
  document.getElementById('catalogSection').classList.remove('hidden');
  document.getElementById('stepDots').classList.remove('hidden');
  document.getElementById('step1').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function showDashboard() {
  const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) { logout(); return; }
  const data = await res.json();
  const c = data.client, rs = data.reservations || [];
  const today = new Date().toISOString().slice(0, 10);
  const actives = rs.filter((r) => r.statut !== 'annulee');
  const upcoming = actives.filter((r) => r.date >= today).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
  const past = actives.filter((r) => r.date < today).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
  const next = upcoming[0];

  const nextCard = next
    ? `<div class="nextrdv">
         <div class="nextlabel">Votre prochain rendez-vous</div>
         <div class="nexttitle">${next.service_nom}</div>
         <div class="nextmeta">📅 ${formatDate(next.date)} · <b>${next.debut}</b></div>
         <a class="btn ghost" style="margin-top:10px" target="_blank" href="${waHref('Bonjour Valdez, au sujet de mon RDV du ' + next.date + ' à ' + next.debut)}">💬 Contacter Valdez</a>
       </div>`
    : `<div class="nextrdv empty"><div class="nextlabel">Aucun rendez-vous à venir</div>
         <button class="btn" style="margin-top:10px" onclick="showBooking()">Réserver une coiffure ✨</button></div>`;

  const line = (r) => `<div class="mine"><b>${r.service_nom}</b><br>
    <span class="muted" style="font-size:12px">${formatDate(r.date)} · ${r.debut} · ${r.statut.replace(/_/g, ' ')}</span></div>`;

  document.getElementById('clientDash').innerHTML = `
    <div class="card">
      <div class="dashhead">
        <div><h2 class="section" style="margin:0">Bonjour ${c.nom.split(' ')[0]} 👋</h2>
          <span class="muted" style="font-size:13px">${c.email || ''}</span></div>
        <button class="mini gold" onclick="showBooking()">+ Nouvelle réservation</button>
      </div>
      <div class="cstats">
        <div class="stat2"><b>${upcoming.length}</b><span>à venir</span></div>
        <div class="stat2"><b>${actives.length}</b><span>au total</span></div>
        <div class="stat2"><b>${past.length}</b><span>passés</span></div>
      </div>
      ${nextCard}
      <h3 style="color:#fff;margin:18px 0 8px">Historique</h3>
      ${past.length ? past.map(line).join('') : '<p class="muted">Pas encore d\'historique.</p>'}
    </div>`;

  document.getElementById('clientDash').classList.remove('hidden');
  ['catalogSection', 'stepDots', 'step1', 'step2', 'step3'].forEach((id) => document.getElementById(id).classList.add('hidden'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- go ----------
loadCatalogue();
loadServices();
refreshAuthUI();
