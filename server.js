/**
 * Norria Coiffure — serveur de reservation en ligne.
 * Node.js + Express + stockage JSON (aucune dependance native).
 * Phase 2 : comptes clients, catalogue, upload photo, espacement (duree + 1h trajet).
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const store = require('./store');

// Charge .env si present (parseur minimal, sans dependance)
try {
  const p = path.join(__dirname, '.env');
  if (fs.existsSync(p)) {
    fs.readFileSync(p, 'utf8').split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    });
  }
} catch (_) {}

const app = express();
app.use(express.json({ limit: '40mb' })); // large pour accepter photos + courtes videos en base64
app.use(express.static(path.join(__dirname, 'public')));

// Dossier des photos televersees (configurable pour un disque persistant en prod)
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// Sert les photos, meme si le dossier est hors de /public (disque monte)
app.use('/uploads', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'norria2026';
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || '';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const SLOT_STEP = 30;
const BUFFER = 60; // minutes de trajet/tampon entre deux clientes

// ---------- utilitaires temps ----------
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// ---------- auth (mots de passe hashes + token signe) ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}
function signToken(clientId) {
  const sig = crypto.createHmac('sha256', store.secret()).update(String(clientId)).digest('hex');
  return `${clientId}.${sig}`;
}
function clientFromToken(token) {
  if (!token) return null;
  const [id, sig] = String(token).split('.');
  if (!id || !sig) return null;
  const expected = crypto.createHmac('sha256', store.secret()).update(String(id)).digest('hex');
  if (sig !== expected) return null;
  return store.getClient(id) || null;
}
const bearer = (req) => (req.header('authorization') || '').replace(/^Bearer\s+/i, '');

// ---------- creneaux disponibles (avec tampon) ----------
function computeSlots(serviceId, dateStr) {
  const service = store.getService(serviceId);
  if (!service) return { error: 'Prestation introuvable' };
  const rules = store.getRules(weekday(dateStr), dateStr);
  const windows = rules.map((r) => ({ debut: r.debut, fin: r.fin })).sort((a, b) => a.debut.localeCompare(b.debut));
  const bookedRaw = store.getReservationsByDate(dateStr);
  const booked = bookedRaw.map((r) => ({ debut: r.debut, fin: r.fin }));
  if (dateStr < todayStr()) return { service, slots: [], windows, booked };

  const bookedMin = bookedRaw.map((r) => [toMin(r.debut), toMin(r.fin)]);
  const duree = service.duree_min;
  const isToday = dateStr === todayStr();
  const minStartToday = nowMin() + 60;
  const slots = [];

  for (const rule of rules) {
    const open = toMin(rule.debut), close = toMin(rule.fin);
    for (let start = open; start + duree <= close; start += SLOT_STEP) {
      if (isToday && start < minStartToday) continue;
      const cStart = start, cEnd = start + duree;
      const overlap = bookedMin.some(([bs, be]) => cStart < be + BUFFER && bs < cEnd + BUFFER);
      if (!overlap) slots.push(toHHMM(start));
    }
  }
  return { service, slots: [...new Set(slots)].sort(), windows, booked };
}

// ---------- notifications ----------
let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}
async function sendEmail(to, sujet, texte) {
  if (!mailer || !to) return;
  try { await mailer.sendMail({ from: process.env.MAIL_FROM || 'Norria Coiffure <no-reply@norria-coiffure.fr>', to, subject: sujet, text: texte }); }
  catch (e) { console.error('Email KO:', e.message); }
}
async function sendWhatsApp(texte) {
  const phone = process.env.CALLMEBOT_PHONE, apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return;
  try { await fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(texte)}&apikey=${encodeURIComponent(apikey)}`); }
  catch (e) { console.error('WhatsApp KO:', e.message); }
}
const waLink = (texte) => (OWNER_WHATSAPP ? `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(texte)}` : null);

// ---------- Stripe (acompte) ----------
async function createStripeCheckout(reservation, service) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const p = new URLSearchParams();
  p.append('mode', 'payment');
  p.append('success_url', `${PUBLIC_URL}/paiement/succes?rid=${reservation.id}`);
  p.append('cancel_url', `${PUBLIC_URL}/paiement/annule?rid=${reservation.id}`);
  p.append('line_items[0][quantity]', '1');
  p.append('line_items[0][price_data][currency]', 'eur');
  p.append('line_items[0][price_data][unit_amount]', String(Math.round(service.acompte * 100)));
  p.append('line_items[0][price_data][product_data][name]', `Acompte — ${service.nom}`);
  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString(),
    });
    const data = await res.json();
    return data.url || null;
  } catch (e) { console.error('Stripe KO:', e.message); return null; }
}

// ---------- upload photo (base64 dataURL) ----------
function savePhoto(dataUrl, resaId) {
  if (!dataUrl || !/^data:image\//.test(dataUrl)) return null;
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return null; // 6 Mo max
  const name = `resa-${resaId}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}

// ---------- upload media (photo ou video) pour les realisations ----------
function saveMedia(dataUrl, id) {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp)|video\/(?:mp4|webm|quicktime));base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 35 * 1024 * 1024) return null; // 35 Mo max
  const ext = mime === 'video/quicktime' ? 'mov' : mime.split('/')[1].replace('jpeg', 'jpg');
  const type = mime.startsWith('video') ? 'video' : 'image';
  const name = `real-${id}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return { src: `/uploads/${name}`, type };
}

// ================= API publique =================
app.get('/api/services', (req, res) => res.json(store.getServices()));
app.get('/api/catalogue', (req, res) => res.json(store.getCatalogue()));
app.get('/api/realisations', (req, res) => res.json(store.getRealisations()));

app.get('/api/slots', (req, res) => {
  const { service_id, date } = req.query;
  if (!service_id || !date) return res.status(400).json({ error: 'service_id et date requis' });
  res.json(computeSlots(Number(service_id), date));
});

// --- comptes clients ---
app.post('/api/register', (req, res) => {
  const { nom, tel, email, password } = req.body || {};
  if (!nom || !tel || !email || !password) return res.status(400).json({ error: 'Nom, téléphone, e-mail et mot de passe requis' });
  if (store.findClientByEmail(email)) return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail' });
  const client = store.createClient({ nom, tel, email, pass_hash: hashPassword(password) });
  res.json({ token: signToken(client.id), client: { id: client.id, nom, tel, email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const client = store.findClientByEmail(email);
  if (!client || !verifyPassword(password, client.pass_hash)) return res.status(401).json({ error: 'E-mail ou mot de passe incorrect' });
  res.json({ token: signToken(client.id), client: { id: client.id, nom: client.nom, tel: client.tel, email: client.email } });
});

// Mot de passe oublie : verification par e-mail + telephone du compte
app.post('/api/reset', (req, res) => {
  const { email, tel, password } = req.body || {};
  if (!email || !tel || !password) return res.status(400).json({ error: 'E-mail, téléphone et nouveau mot de passe requis' });
  const client = store.findClientByEmail(email);
  const norm = (x) => (x || '').replace(/\D/g, '');
  if (!client || norm(client.tel) !== norm(tel)) return res.status(400).json({ error: 'Aucun compte ne correspond à cet e-mail et ce téléphone.' });
  store.setClientPassword(client.id, hashPassword(password));
  res.json({ token: signToken(client.id), client: { id: client.id, nom: client.nom, tel: client.tel, email: client.email } });
});

app.get('/api/me', (req, res) => {
  const client = clientFromToken(bearer(req));
  if (!client) return res.status(401).json({ error: 'Non connecté' });
  res.json({
    client: { id: client.id, nom: client.nom, tel: client.tel, email: client.email },
    reservations: store.reservationsByClient(client.id),
  });
});

// --- reservation ---
app.post('/api/reservations', async (req, res) => {
  const { service_id, date, debut, nom, tel, email, note, photo, creer_compte, password } = req.body || {};
  if (!service_id || !date || !debut || !nom || !tel) return res.status(400).json({ error: 'Champs obligatoires manquants' });

  const service = store.getService(service_id);
  if (!service) return res.status(404).json({ error: 'Prestation introuvable' });

  const { slots } = computeSlots(Number(service_id), date);
  if (!slots || !slots.includes(debut)) return res.status(409).json({ error: "Ce créneau vient d'être pris. Choisissez-en un autre." });

  // Client : connecte, existant, ou creation optionnelle
  let client = clientFromToken(bearer(req));
  let newToken = null;
  if (!client && creer_compte && email && password) {
    if (!store.findClientByEmail(email)) {
      client = store.createClient({ nom, tel, email, pass_hash: hashPassword(password) });
      newToken = signToken(client.id);
    }
  }
  if (!client && email) client = store.findClientByEmail(email) || null;

  const fin = toHHMM(toMin(debut) + service.duree_min);
  const stripeReady = !!process.env.STRIPE_SECRET_KEY;
  const statut = stripeReady ? 'en_attente_acompte' : 'confirmee';

  const reservation = store.createReservation({
    service_id: Number(service_id), date, debut, fin,
    cliente_nom: nom, cliente_tel: tel, cliente_email: email || null,
    note: note || null, statut, client_id: client ? client.id : null,
  });

  // Photo de reference (optionnelle)
  const photoPath = savePhoto(photo, reservation.id);
  if (photoPath) store.setReservationPhoto(reservation.id, photoPath);

  const prixTxt = service.prix != null ? `${service.prix} €` : 'sur devis';
  const msgOwner =
    `Nouvelle reservation Norria !\n${service.nom} (${prixTxt})\n${date} a ${debut} (fin ~${fin})\n` +
    `Cliente : ${nom} — ${tel}${email ? ' — ' + email : ''}\nAcompte : ${service.acompte} €` +
    `${note ? '\nNote : ' + note : ''}${photoPath ? '\nPhoto de reference fournie (voir back-office)' : ''}`;
  const msgClient =
    `Bonjour ${nom}, votre reservation chez Norria Beauty Salon est enregistree.\n` +
    `${service.nom} — ${date} a ${debut}.\n` +
    `Pour confirmer, reglez l'acompte de ${service.acompte} € par Wero au 07 52 95 57 92, ` +
    `puis envoyez la preuve sur WhatsApp.\nA tres vite ! — Angela`;

  await sendEmail(OWNER_EMAIL, 'Nouvelle reservation Norria', msgOwner);
  await sendEmail(email, 'Votre reservation Norria Beauty Salon', msgClient);
  await sendWhatsApp(msgOwner);

  const checkoutUrl = await createStripeCheckout(reservation, service);
  res.json({
    ok: true, reservation, acompte: service.acompte, checkoutUrl,
    token: newToken, whatsappOwnerLink: waLink(msgOwner),
    message: stripeReady ? "Redirection vers le paiement de l'acompte." : 'Reservation confirmee.',
  });
});

app.get('/paiement/succes', (req, res) => { if (req.query.rid) store.markPaid(req.query.rid); res.sendFile(path.join(__dirname, 'public', 'merci.html')); });
app.get('/paiement/annule', (req, res) => res.redirect('/?paiement=annule'));

// ================= API admin =================
function requireAdmin(req, res, next) {
  const pass = req.header('x-admin-password') || req.query.password;
  if (pass !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Mot de passe incorrect' });
  next();
}
app.get('/api/admin/reservations', requireAdmin, (req, res) => res.json(store.allReservationsJoined()));
app.post('/api/admin/reservations/:id/annuler', requireAdmin, (req, res) => { store.cancelReservation(req.params.id); res.json({ ok: true }); });

// Deplacer / modifier une reservation (page gestionnaire Valdez)
app.put('/api/admin/reservations/:id', requireAdmin, (req, res) => {
  const resa = store.getReservationById(req.params.id);
  if (!resa) return res.status(404).json({ error: 'Réservation introuvable' });
  const { date, debut, statut, note } = req.body || {};
  const fields = {};
  if (date) fields.date = date;
  if (statut) fields.statut = statut;
  if (note !== undefined) fields.note = note;
  if (debut) {
    const svc = store.getServiceById(resa.service_id);
    fields.debut = debut;
    fields.fin = toHHMM(toMin(debut) + (svc ? svc.duree_min : 60));
  }
  // Verifie qu'on ne chevauche pas une AUTRE reservation (avec tampon)
  const targetDate = fields.date || resa.date;
  const targetDebut = fields.debut || resa.debut;
  const targetFin = fields.fin || resa.fin;
  const clash = store.getReservationsByDate(targetDate).some((r) =>
    r.id !== resa.id && toMin(targetDebut) < toMin(r.fin) + BUFFER && toMin(r.debut) < toMin(targetFin) + BUFFER
  );
  if (clash && (date || debut)) return res.status(409).json({ error: 'Ce créneau chevauche une autre réservation (tampon 1h inclus).' });
  const updated = store.patchReservation(req.params.id, fields);
  res.json({ ok: true, reservation: updated });
});
app.get('/api/admin/clients', requireAdmin, (req, res) => res.json(store.allClients().map((c) => ({ id: c.id, nom: c.nom, tel: c.tel, email: c.email, cree_le: c.cree_le }))));
app.get('/api/admin/catalogue', requireAdmin, (req, res) => res.json(store.getAllCatalogue()));
app.post('/api/admin/catalogue', requireAdmin, (req, res) => {
  const { titre, categorie, image_url } = req.body || {};
  if (!titre || !image_url) return res.status(400).json({ error: 'titre et image_url requis' });
  res.json(store.addCatalogue({ titre, categorie: categorie || 'Autre', image_url }));
});
app.delete('/api/admin/catalogue/:id', requireAdmin, (req, res) => { store.removeCatalogue(req.params.id); res.json({ ok: true }); });
app.get('/api/admin/realisations', requireAdmin, (req, res) => res.json(store.getAllRealisations()));
app.post('/api/admin/realisations', requireAdmin, (req, res) => {
  const { titre, src, media } = req.body || {};
  let finalSrc = src, type = /\.(mp4|webm|mov)$/i.test(src || '') ? 'video' : 'image';
  if (media) {
    const saved = saveMedia(media, store.getAllRealisations().length + 1);
    if (!saved) return res.status(400).json({ error: 'Média invalide (image ou vidéo, max 35 Mo).' });
    finalSrc = saved.src; type = saved.type;
  }
  if (!finalSrc) return res.status(400).json({ error: 'Fournissez un fichier ou une URL.' });
  res.json(store.addRealisation({ titre: titre || '', src: finalSrc, type }));
});
app.delete('/api/admin/realisations/:id', requireAdmin, (req, res) => { store.removeRealisation(req.params.id); res.json({ ok: true }); });
app.put('/api/admin/services/:id', requireAdmin, (req, res) => {
  const { prix, duree_min, acompte, actif } = req.body || {};
  store.updateService(req.params.id, { prix, duree_min, acompte, actif: actif ? 1 : 0 });
  res.json({ ok: true });
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`Norria Coiffure en ligne sur ${PUBLIC_URL} (port ${PORT})`);
  console.log(`Back-office : ${PUBLIC_URL}/admin  (mot de passe : ${ADMIN_PASSWORD})`);
  if (!process.env.STRIPE_SECRET_KEY) console.log('NB: Stripe non configure -> acompte non encaisse (mode demo).');
  if (!process.env.SMTP_HOST) console.log('NB: SMTP non configure -> emails non envoyes (mode demo).');
});
