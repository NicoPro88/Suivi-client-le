# Fil Rouge

Application de suivi client pour artisan (électricité, réparation) : fiches clients,
interventions, rendez-vous dans Google Agenda, suivi de chantier, rappels et recherche rapide.

Elle s'installe sur téléphone (Android, iPhone) et sur PC depuis le navigateur, fonctionne
sans réseau et synchronise tout dès que la connexion revient.

## Ce que fait la V1

| Fonction | Où |
| --- | --- |
| Fiche client : nom, prénom, téléphones, adresse assistée, email, notes | Clients, bouton + |
| Appeler, SMS, itinéraire Google Maps ou Waze en un geste | Fiche client, intervention |
| Alerte doublon (même téléphone ou même nom) | Création d'un client |
| Intervention : type, intitulé, détails, adresse de chantier différente | Fiche client > Nouvelle intervention |
| RDV envoyé dans un agenda Google dédié « Interventions » | Automatique à l'enregistrement |
| Statuts de suivi (Nouveau → Payé) et journal daté | Page de l'intervention |
| Rappels « Me rappeler de… » envoyés dans Google Agenda | Page de l'intervention |
| SMS de confirmation de RDV prérédigé | Page de l'intervention |
| Écran « Aujourd'hui » : rappels, RDV du jour, 7 jours, chantiers en cours | Accueil |
| Recherche : nom, téléphone partiel, ville, adresse, notes, référence | Barre en haut de chaque écran |
| Historique des interventions d'un client | Fiche client |
| Export Excel (clients, interventions), export ou suppression d'un client (RGPD) | Réglages, fiche client |
| Types d'intervention, statuts, modèle de SMS modifiables | Réglages |
| Mode hors ligne, mode sombre, installation sur l'écran d'accueil | Partout |

## Technique

- React 19 + TypeScript, Vite, Tailwind CSS, application web installable (PWA).
- Données : Firebase Firestore (cache hors ligne), connexion avec le compte Google.
- Agenda : API Google Agenda depuis le navigateur, avec la permission
  `calendar.app.created` : l'appli ne voit et ne modifie que l'agenda qu'elle a créé.
- Adresses : Base Adresse Nationale (Géoplateforme IGN), gratuite.
- Hébergement : Firebase Hosting, mis à jour par GitHub Actions à chaque fusion sur `main`.

```
src/
  lib/        logique sans écran (recherche, dates, agenda, export…) + tests
  data/       stockage (Firestore ou démo locale) et actions de l'appli
  components/ éléments d'interface partagés
  pages/      écrans
```

## Commandes

```bash
npm install
npm run dev          # appli en local ; sans fichier .env, elle démarre en mode démo
npm test             # tests de la logique
npm run build        # version de production dans dist/
npx vite build --mode demo --outDir dist-demo   # démo autonome (données fictives)
```

La mise en place du compte Firebase et de Google Agenda est décrite pas à pas dans
[docs/MISE-EN-PLACE.md](docs/MISE-EN-PLACE.md).
