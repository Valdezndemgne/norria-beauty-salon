# Norria Coiffure — application de réservation en ligne

Application web de prise de rendez-vous pour **Norria Beauty Salon** (Antony), inspirée de Fresha,
aux couleurs du salon. La cliente choisit sa prestation, sa date et son créneau ; Valdez est
notifiée et gère tout depuis un back-office.

## Ce qui est inclus

- **Page de réservation** (`/`) : 11 prestations avec durées et prix, créneaux calculés en temps réel.
- **Anti double-réservation** : un créneau déjà pris disparaît automatiquement.
- **Horaires intelligents** : temps plein cet été (lun–sam 9h–19h), puis bascule automatique au
  **1er septembre 2026** vers mercredi soir (17h–21h) + samedi (9h–19h) + dimanche (10h–18h).
- **Back-office** (`/admin`) : liste des réservations, statistiques, annulation. Protégé par mot de passe.
- **Notifications** e-mail + WhatsApp à chaque réservation (voir config).
- **Acompte en ligne** 10 € (femmes) / 5 € (hommes) via Stripe (voir config).

L'application **fonctionne immédiatement en mode démo** (sans e-mail ni paiement) : idéal pour tester.
Les e-mails, WhatsApp et l'acompte s'activent en remplissant le fichier `.env`.

## Fonctions ajoutées (phase 2)

- **Comptes clients** (optionnels) : la cliente peut réserver sans compte, ou en créer un pour
  retrouver ses rendez-vous (« Mes rendez-vous »). Mots de passe **hashés** (jamais stockés en clair).
- **Fichier clients** dans l'admin : toutes les coordonnées regroupées.
- **Catalogue de coiffures** avec photos libres de droits (Pexels), filtrable par catégorie.
  Valdez ajoute/supprime ses propres réalisations depuis l'admin (onglet Catalogue).
- **Photo du modèle souhaité** : la cliente peut téléverser une photo à la réservation ; Valdez
  la voit dans le back-office. Sinon, bouton **WhatsApp** pour discuter directement.
- **Espacement intelligent** : chaque réservation bloque sa durée réelle **+ 1h de trajet** avant
  et après (ex. une pose de 09:00 à 11:30 libère le créneau suivant à partir de 12:30).
- **Page gestionnaire Valdez** : dans l'admin, chaque RDV peut être **déplacé** (nouvelle date/heure,
  la fin est recalculée automatiquement), **modifié** (statut, note) ou **annulé**.

> Astuce technique : la variable d'environnement `DATA_FILE` permet de pointer vers un autre fichier
> de données (utile pour tester sans toucher aux vraies réservations).

## ⚠️ Important : ne pas ouvrir les fichiers directement

Si vous double-cliquez `admin.html` ou `index.html`, la page apparaîtra **sans style et sans
données** (adresse `file:///…`) : c'est normal, l'app a besoin du serveur pour charger le style
et les réservations. Il faut **lancer le serveur** (ci-dessous) puis ouvrir `http://localhost:3000`.

Pour juste **voir le design** sans rien installer, ouvrez le fichier `apercu.html` (celui-ci est
autonome et s'affiche correctement même en double-clic).

## Lancer en local (sur un ordinateur)

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus.

```bash
npm install
npm start
```

Puis ouvrir :
- Réservation : http://localhost:3000
- Back-office : http://localhost:3000/admin  (mot de passe par défaut : `norria2026`)

## Mettre en ligne (avoir un vrai lien à partager sur WhatsApp)

L'app doit être hébergée pour avoir une adresse publique. Options gratuites/simples, faites pour Node.js :
**Render.com**, **Railway.app** ou **Fly.io**. Marche à suivre type (Render) :

1. Créer un compte sur render.com (c'est **toi** qui crées le compte et choisis le mot de passe).
2. Mettre ce dossier sur un dépôt GitHub, puis « New → Web Service » et le connecter.
3. Build command : `npm install` — Start command : `npm start`.
4. Ajouter les variables d'environnement (onglet *Environment*), voir ci-dessous.
5. Render fournit une URL type `https://norria-coiffure.onrender.com` → c'est **ce lien** qu'on partage.
6. (Option) Acheter le domaine `norria-coiffure.fr` et le brancher.

> Le fichier `data.json` stocke les réservations. Sur certains hébergeurs gratuits le disque est
> réinitialisé aux redéploiements : pour un usage sérieux, activer un disque persistant (Render
> « Disk ») ou me demander de brancher une vraie base hébergée.

## Configuration (fichier `.env`)

Copier `.env.example` en `.env` et remplir. Tout est optionnel — ce qui est vide reste en mode démo.

| Variable | À quoi ça sert |
|---|---|
| `ADMIN_PASSWORD` | Mot de passe du back-office **(à changer)** |
| `OWNER_EMAIL` | E-mail qui reçoit les alertes de réservation |
| `OWNER_WHATSAPP` | Numéro au format international (07… → 337…) pour le lien WhatsApp |
| `SMTP_*` / `MAIL_FROM` | Envoi des e-mails (gratuit via Gmail + « mot de passe d'application ») |
| `CALLMEBOT_*` | WhatsApp **automatique** gratuit (inscription CallMeBot en 2 min) |
| `STRIPE_SECRET_KEY` | Encaisser l'acompte en ligne (compte Stripe requis) |
| `PUBLIC_URL` | L'adresse publique du site (pour les retours de paiement) |

### E-mails via Gmail (gratuit)
1. Activer la validation en 2 étapes sur le compte Gmail.
2. Créer un « mot de passe d'application » (myaccount.google.com → Sécurité).
3. Le coller dans `SMTP_PASS`.

### WhatsApp automatique (gratuit, via CallMeBot)
Suivre https://www.callmebot.com/blog/free-api-whatsapp-messages/ (envoyer un message
d'activation depuis le numéro de Valdez), récupérer la clé, remplir `CALLMEBOT_PHONE` et
`CALLMEBOT_APIKEY`. Sans ça, l'app génère quand même un lien WhatsApp cliquable de secours.

### Acompte en ligne (Stripe)
1. Créer un compte sur stripe.com (nécessite le statut auto-entrepreneur pour encaisser).
2. Copier la **clé secrète** (Développeurs → Clés API) dans `STRIPE_SECRET_KEY`.
3. À la réservation, la cliente est redirigée vers un paiement sécurisé Stripe ; une fois payé,
   le rendez-vous passe en « confirmé ».

## Modifier les prestations, prix et horaires

- **Prix / durée / acompte** : modifiables dans le back-office, ou directement dans `data.json`.
- **Horaires** : dans `store.js` (ou `data.json`), section `disponibilites`. La date de bascule
  été → rentrée est le `2026-09-01` (constante `SWITCH` dans `store.js`).

## Sécurité (important)

- Ne jamais mettre le fichier `.env` en public (il contient les clés).
- Changer `ADMIN_PASSWORD`.
- Les paiements passent par Stripe : l'app ne stocke **aucune** donnée de carte bancaire.

---

Fait pour le lancement de **Norria Beauty Salon** · Antony · 07 52 95 57 92 · @Angy_kke
