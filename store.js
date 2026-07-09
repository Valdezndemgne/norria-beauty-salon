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
  ];
}
function seedDispos() {
  return [
    { jour: 1, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 2, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 3, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 4, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 5, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 6, debut: '09:00', fin: '19:00', effectif_du: null,   effectif_au: SWITCH },
    { jour: 3, debut: '17:00', fin: '21:00', effectif_du: SWITCH, effectif_au: null },
    { jour: 6, debut: '09:00', fin: '19:00', effectif_du: SWITCH, effectif_au: null },
    { jour: 0, debut: '10:00', fin: '18:00', effectif_du: SWITCH, effectif_au: null },
  ];
}
// Catalogue : photos libres de droits (Pexels, usage commercial autorise, sans attribution).
// Valdez pourra ajouter/remplacer par ses propres realisations depuis l'admin.
function seedCatalogue() {
  const P = (id, f) => `https://images.pexels.com/photos/${id}/${f || 'pexels-photo-' + id + '.jpeg'}?auto=compress&cs=tinysrgb&w=600`;
  return [
    { id: 1,  titre: 'Box braids classiques',     categorie: 'Box braids',        image_url: P(10810251), actif: 1 },
    { id: 2,  titre: 'Box braids longues',         categorie: 'Tresses longues',   image_url: P(13767165), actif: 1 },
    { id: 3,  titre: 'Box braids stylées',         categorie: 'Box braids',        image_url: P(11515382), actif: 1 },
    { id: 4,  titre: 'Knotless braids',            categorie: 'Knotless',          image_url: P(8973502),  actif: 1 },
    { id: 5,  titre: 'Twists / Vanilles',          categorie: 'Vanilles / Twists', image_url: P(7190007),  actif: 1 },
    { id: 6,  titre: 'Coiffure protectrice',       categorie: 'Protectrice',       image_url: P(6691645),  actif: 1 },
    { id: 7,  titre: 'Coiffure homme',             categorie: 'Homme',             image_url: P(16778662, 'free-photo-of-man-with-braided-hair.jpeg'), actif: 1 },
    { id: 8,  titre: 'Cornrows / Tresses collées', categorie: 'Cornrows',          image_url: P(11269006), actif: 1 },
    { id: 9,  titre: 'Cornrows stylisées',         categorie: 'Cornrows',          image_url: P(33664383, 'free-photo-of-top-view-of-stylish-braided-hairstyle-on-woman.jpeg'), actif: 1 },
    { id: 10, titre: 'Tresses au naturel',         categorie: 'Vanilles / Twists', image_url: P(15576674, 'free-photo-of-a-young-woman-having-her-hair-braided.jpeg'), actif: 1 },
    { id: 11, titre: 'Portrait tresses soleil',    categorie: 'Box braids',        image_url: P(32228162, 'free-photo-of-portrait-of-a-woman-with-braided-hairstyle-in-sunlight.jpeg'), actif: 1 },
    { id: 12, titre: 'Coiffure élégante',          categorie: 'Protectrice',       image_url: P(4800598),  actif: 1 },
  ];
}

function seed() {
  return {
    services: seedServices(),
    disponibilites: seedDispos(),
    catalogue: seedCatalogue(),
    reservations: [],
    clients: [],
    secret: crypto.randomBytes(24).toString('hex'),
    seq: 0, seqClient: 0, seqCat: 12,
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
  allClients: () => [...data.clients].sort((a, b) => b.id - a.id),

  // ----- catalogue -----
  getCatalogue: () => data.catalogue.filter((c) => c.actif),
  getAllCatalogue: () => data.catalogue,
  addCatalogue(obj) { data.seqCat += 1; const c = { id: data.seqCat, actif: 1, ...obj }; data.catalogue.push(c); save(); return c; },
  removeCatalogue(id) { data.catalogue = data.catalogue.filter((c) => c.id !== Number(id)); save(); },
};
