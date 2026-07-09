# Mettre Norria Beauty Salon en ligne — guide pas à pas

Objectif : obtenir une adresse web (ex. `https://norria-beauty-salon.onrender.com`) à partager
sur WhatsApp et Instagram. **Gratuit.** Compter ~20 minutes la première fois.

> Ce que je ne peux pas faire à ta place : **créer les comptes** (GitHub, Render) et **saisir les
> mots de passe**. Ces étapes sont à toi. Tout le reste (le code, la config) est déjà prêt.

Le principe : 1) le code va sur **GitHub** (un « coffre » pour le code), 2) **Render** lit ce code
et le met en ligne automatiquement grâce au fichier `render.yaml` déjà inclus.

---

## Étape 1 — Mettre le code sur GitHub (le plus simple : GitHub Desktop)

1. Crée un compte sur **github.com** (gratuit).
2. Télécharge et installe **GitHub Desktop** : https://desktop.github.com (application, pas de ligne de commande).
3. Ouvre GitHub Desktop, connecte-toi.
4. Menu **File → Add local repository** → choisis le dossier `norria-coiffure` (celui que je t'ai livré).
   - S'il propose « create a repository », accepte.
5. Clique **Publish repository** (tu peux laisser « Keep this code private » coché).

✅ Ton code est maintenant sur GitHub.

> Astuce : avant de publier, supprime le sous-dossier `node_modules` s'il est présent (il est lourd
> et inutile en ligne — Render le réinstalle tout seul). Le fichier `.gitignore` fourni l'ignore déjà.

---

## Étape 2 — Publier sur Render

1. Crée un compte sur **render.com** (tu peux te connecter avec ton compte GitHub, c'est plus rapide).
2. En haut à droite : **New +** → **Blueprint**.
3. Sélectionne le dépôt `norria-coiffure` que tu viens de publier.
4. Render détecte le fichier **`render.yaml`** et propose de tout configurer. Clique **Apply**.
5. Render va demander de renseigner quelques variables (laisse vides celles que tu n'utilises pas
   encore). Au minimum, mets :
   - `ADMIN_PASSWORD` → un mot de passe pour le back-office de Valdez (à retenir).
   - `OWNER_EMAIL` → l'e-mail qui reçoit les alertes de réservation.
   - `OWNER_WHATSAPP` → `33752955792` (le numéro au format international).
6. Clique **Create / Deploy**. Render installe et démarre (2–4 min).

✅ Quand c'est vert, Render affiche l'adresse, du type `https://norria-beauty-salon.onrender.com`.

---

## Étape 3 — Finaliser

- Ouvre l'adresse : c'est la page cliente. Ajoute `/admin` pour le back-office de Valdez.
- Reviens dans Render → onglet **Environment** → ajoute `PUBLIC_URL` avec l'adresse complète
  (utile seulement pour le paiement d'acompte).
- **Partage l'adresse** sur WhatsApp et dans la bio Instagram @Angy_kke. 🎉

### Activer les extras (quand tu veux)
Toujours dans Render → **Environment**, ajoute :
- **E-mails** : `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` = l'e-mail,
  `SMTP_PASS` = un « mot de passe d'application » Gmail.
- **WhatsApp automatique** : `CALLMEBOT_PHONE` et `CALLMEBOT_APIKEY`
  (inscription gratuite : https://www.callmebot.com/blog/free-api-whatsapp-messages/).
- **Acompte en ligne** : `STRIPE_SECRET_KEY` (compte Stripe requis + statut auto-entrepreneur).

---

## Bon à savoir

- **Offre gratuite Render** : le site « s'endort » après un moment sans visite et met ~30 s à se
  réveiller au premier clic. Le disque persistant (déjà configuré dans `render.yaml`) garde les
  réservations et les photos. Pour supprimer la mise en veille, l'offre payante Render est ~7 $/mois.
- **Nom de domaine** : tu peux acheter `norria-coiffure.fr` (~10 €/an) et le brancher dans Render
  (onglet *Settings → Custom Domains*).
- **Sécurité** : change bien `ADMIN_PASSWORD`, et ne partage jamais tes clés (elles restent dans
  Render, pas dans le code).

Besoin d'aide sur une étape précise ? Dis-moi où tu bloques (avec une capture) et je te débloque.
