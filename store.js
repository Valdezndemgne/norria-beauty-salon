/**
 * Stockage des donnees Norria Coiffure dans un simple fichier JSON.
 * Aucune dependance native -> se deploie partout (Render, Railway, VPS...).
 * Contient : prestations, disponibilites, reservations, clients (comptes), catalogue.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(__dirname, 'data.json');
const SWITCH = '2026-09-01'; // bascule ete -> rentree

function seedServices() {
  return [
    { id: 1,  nom: 'Coiffure homme',               categorie: 'homme', duree_min: 40,  prix: 20,   acompte: 5,  actif: 1, ordre: 1 },
    { id: 2,  nom: 'Soins capillaires',            categorie: 'femme', duree_min: 60,  prix: null, acompte: 10, actif: 1, ordre: 2 },
    { id: 3,  nom: 'Pony tail',                    categorie: 'femme', duree_min: 120, prix: null, acompte: 10, actif: 1, ordre: 3 },
    { id: 4,  nom: 'Tresses collees (cornrows)',   categorie: 'femme', duree_min: 150, prix: 40,   acompte: 10, actif: 1, ordre: 4 },
    { id: 5,  nom: 'Tresses simples (box braids)', categorie: 'femme', duree_min: 240, prix: 40,   acompte: 10, actif: 1, ordre: 5 },
    { id: 6,  nom: 'Vanilles / Twists',            categorie: 'femme', duree_min: 240, prix: null, acompte: 10, actif: 1, ordre: 6 },
    { id: 7,  nom: 'Rastafaris',                   categorie: 'femme', duree_min: 210, prix: null, acompte: 10, actif: 1, ordre: 7 },
    { id: 8,  nom: 'Coiffures protectrices',       categorie: 'femme', duree_min: 240, prix: null, acompte: 10, actif: 1, ordre: 8 },
    { id: 9,  nom: 'Knotless braids',              categorie: 'femme', duree_min: 300, prix: 50,   acompte: 10, actif: 1, ordre: 9 },
    { id: 10, nom: 'Dreadlocks',                   categorie: 'femme', duree_min: 180, prix: null, acompte: 10, actif: 1, ordre: 10 },
    { id: 11, nom: 'Tresses longues',              categorie: 'femme', duree_min: 360, prix: 60,   acompte: 10, actif: 1, ordre: 11 },
    { id: 12, nom: 'Tresses enfant',               categorie: 'enfant', duree_min: 120, prix: null, acompte: 5, actif: 1, ordre: 12 },
    { id: 13, nom: 'Coupe enfant',                 categorie: 'enfant', duree_min: 40,  prix: 35,   acompte: 5, actif: 1, ordre: 13 },
  ];
}
function seedDispos() {
  // VACANCES : Valdez tresse 24h/24 et 7j/7. Tous les jours, ouverts en continu.
  // (A partir de septembre, on remplacera par des horaires reduits.)
  return [0, 1, 2, 3, 4, 5, 6].map((jour) => (
    { jour, debut: '00:00', fin: '24:00', effectif_du: null, effectif_au: null }
  ));
}
// Catalogue : vraies photos de Norria, classees en 3 categories cliquables.
function seedCatalogue() {
  const items = [];
  let id = 0;
  const add = (cat, files) => files.forEach((f, i) => items.push(
    { id: ++id, titre: `${cat} ${i + 1}`, categorie: cat, image_url: f, actif: 1 }
  ));
  add('Tresses femmes', [
    '/realisations/real-photo-2.jpg',
    '/catalogue/img-01.jpg', '/catalogue/img-02.jpg', '/catalogue/img-03.jpg',
    '/catalogue/img-08.jpg', '/catalogue/img-13.jpg', '/catalogue/img-14.jpg',
  ]);
  add('Tresses hommes', [
    '/realisations/real-photo-1.jpg',
    '/catalogue/img-04.jpg', '/catalogue/img-05.jpg', '/catalogue/img-06.jpg',
    '/catalogue/img-07.jpg', '/catalogue/img-09.jpg', '/catalogue/img-10.jpg',
    '/catalogue/img-11.jpg', '/catalogue/img-12.jpg',
  ]);
  add('Tresses enfant', [
    '/catalogue/enfant-1.jpg', '/catalogue/enfant-2.jpg', '/catalogue/enfant-3.jpg',
    '/catalogue/enfant-4.jpg', '/catalogue/enfant-5.jpg', '/catalogue/enfant-6.jpg',
  ]);
  return items;
}

// Realisations : vraies photos/videos du travail de Valdez.
function seedRealisations() {
  return [
    { id: 1, type: 'video', src: '/realisations/real-video-1.mp4', titre: 'Tresses réalisées par Norria', actif: 1 },
    { id: 2, type: 'image', src: '/realisations/real-photo-1.jpg', titre: 'Tresses collées homme', actif: 1 },
    { id: 3, type: 'image', src: '/realisations/real-photo-2.jpg', titre: 'Box braids longues (boho)', actif: 1 },
    { id: 4, type: 'video', src: '/realisations/real-video-2.mp4', titre: 'Réalisation Norria', actif: 1 },
    { id: 5, type: 'video', src: '/realisations/real-video-3.mp4', titre: 'Réalisation Norria', actif: 1 },
  ];
}

function seed() {
  return {
    services: seedServices(),
    disponibilites: seedDispos(),
    catalogue: seedCatalogue(),
    realisations: seedRealisations(),
    reservations: [],
    clients: [],
    secret: crypto.randomBytes(24).toString('hex'),
    seq: 0, seqClient: 0, seqCat: 22, seqReal: 5,
  };
}

let data;
function load() {
  if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    // Migrations douces si un ancien data.json existe deja
    let changed = false;
    if (!data.clients) { data.clients = []; changed = true; }
    if (!data.catalogue) { data.catalogue = seedCatalogue(); data.seqCat = 12; changed = true; }
    if (!data.secret) { data.secret = crypto.randomBytes(24).toString('hex'); changed = true; }
    if (data.seqClient == null) { data.seqClient = data.clients.length; changed = true; }
    if (data.seqCat == null) { data.seqCat = data.catalogue.length; changed = true; }
    if (!data.realisations) { data.realisations = seedRealisations(); data.seqReal = 1; changed = true; }
    if (data.seqReal == null) { data.seqReal = data.realisations.length; changed = true; }
    if (changed) save();
  } else {
    data = seed();
    save();
  }
}
function save() { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }
load();

module.exports = {
  secret: () => data.secret,

  // ----- prestations -----
  getServices: () => data.services.filter((s) => s.actif).sort((a, b) => a.ordre - b.ordre),
  getAllServices: () => [...data.services].sort((a, b) => a.ordre - b.ordre),
  getService: (id) => data.services.find((s) => s.id === Number(id) && s.actif),
  getServiceById: (id) => data.services.find((s) => s.id === Number(id)),
  updateService(id, fields) { const s = data.services.find((x) => x.id === Number(id)); if (s) { Object.assign(s, fields); save(); } },

  // ----- disponibilites -----
  getRules: (jour, dateStr) => data.disponibilites.filter(
    (r) => r.jour === jour && (!r.effectif_du || dateStr >= r.effectif_du) && (!r.effectif_au || dateStr < r.effectif_au)
  ),

  // ----- reservations -----
  getReservationsByDate: (dateStr) => data.reservations.filter((r) => r.date === dateStr && r.statut !== 'annulee'),
  createReservation(obj) {
    data.seq += 1;
    const r = { id: data.seq, statut: obj.statut, acompte_paye: 0, photo: obj.photo || null, client_id: obj.client_id || null, cree_le: new Date().toISOString(), ...obj, id: data.seq };
    data.reservations.push(r);
    save();
    return r;
  },
  setReservationPhoto(id, photo) { const r = data.reservations.find((x) => x.id === Number(id)); if (r) { r.photo = photo; save(); } },
  allReservationsJoined() {
    return [...data.reservations].map((r) => {
      const s = data.services.find((x) => x.id === r.service_id) || {};
      return { ...r, service_nom: s.nom, service_prix: s.prix };
    }).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
  },
  reservationsByClient(clientId) {
    return data.reservations.filter((r) => r.client_id === Number(clientId)).map((r) => {
      const s = data.services.find((x) => x.id === r.service_id) || {};
      return { ...r, service_nom: s.nom };
    }).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
  },
  getReservationById: (id) => data.reservations.find((x) => x.id === Number(id)),
  patchReservation(id, fields) { const r = data.reservations.find((x) => x.id === Number(id)); if (r) { Object.assign(r, fields); save(); } return r || null; },
  cancelReservation(id) { const r = data.reservations.find((x) => x.id === Number(id)); if (r) { r.statut = 'annulee'; save(); } },
  markPaid(id) { const r = data.reservations.find((x) => x.id === Number(id)); if (r) { r.statut = 'confirmee'; r.acompte_paye = 1; save(); } },

  // ----- clients / comptes -----
  findClientByEmail: (email) => data.clients.find((c) => c.email && email && c.email.toLowerCase() === email.toLowerCase()),
  getClient: (id) => data.clients.find((c) => c.id === Number(id)),
  createClient(obj) {
    data.seqClient += 1;
    const c = { id: data.seqClient, cree_le: new Date().toISOString(), ...obj };
    data.clients.push(c);
    save();
    return c;
  },
  setClientPassword(id, hash) { const c = data.clients.find((x) => x.id === Number(id)); if (c) { c.pass_hash = hash; save(); } },
  allClients: () => [...data.clients].sort((a, b) => b.id - a.id),

  // ----- catalogue -----
  getCatalogue: () => data.catalogue.filter((c) => c.actif),
  getAllCatalogue: () => data.catalogue,
  addCatalogue(obj) { data.seqCat += 1; const c = { id: data.seqCat, actif: 1, ...obj }; data.catalogue.push(c); save(); return c; },
  removeCatalogue(id) { data.catalogue = data.catalogue.filter((c) => c.id !== Number(id)); save(); },

  // ----- realisations (portfolio photos + videos) -----
  getRealisations: () => data.realisations.filter((r) => r.actif),
  getAllRealisations: () => data.realisations,
  addRealisation(obj) { data.seqReal += 1; const r = { id: data.seqReal, actif: 1, ...obj }; data.realisations.push(r); save(); return r; },
  removeRealisation(id) { data.realisations = data.realisations.filter((r) => r.id !== Number(id)); save(); },
};
