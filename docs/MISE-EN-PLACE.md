# Mise en place (une seule fois)

Compte une demi-heure. Tout se fait avec ton compte Google, depuis un PC de préférence.
Tu me transmets deux choses à la fin (la configuration Firebase et l'ID client Google) :
elles ne sont pas secrètes, elles identifient seulement ton projet.

## 1. Créer le projet Firebase

1. Va sur <https://console.firebase.google.com> et clique **Créer un projet**.
2. Nom : `fil-rouge` (ou ce que tu veux). Désactive Google Analytics, inutile ici.

## 2. Activer la connexion Google

1. Menu **Créer** > **Authentication** > **Commencer**.
2. Onglet **Mode de connexion** > **Google** > **Activer**, choisis ton adresse e-mail d'assistance, **Enregistrer**.

## 3. Créer la base de données

1. Menu **Créer** > **Firestore Database** > **Créer une base de données**.
2. Emplacement : **europe-west9 (Paris)**. Les données de tes clients restent en France.
3. Mode : **production**. Les règles de sécurité de l'appli seront installées automatiquement
   (fichier `firestore.rules` : chacun ne voit que ses propres données).

## 4. Déclarer l'application web

1. Roue dentée > **Paramètres du projet** > en bas, **Vos applications** > icône **`</>`**.
2. Nom : `Fil Rouge`. Coche **Configurer aussi Firebase Hosting**, puis **Enregistrer l'application**.
3. Copie le bloc `firebaseConfig` affiché (apiKey, authDomain, projectId…) et envoie-le-moi.

## 5. Autoriser Google Agenda

Dans <https://console.cloud.google.com>, choisis le projet `fil-rouge` en haut de la page.

1. **API et services** > **Bibliothèque** > cherche **Google Calendar API** > **Activer**.
2. **API et services** > **Écran de consentement OAuth** (ou « Google Auth Platform ») :
   type **Externe**, nom de l'appli `Fil Rouge`, ton e-mail, puis enregistre.
   Dans **Audience**, clique **Publier l'application** : sinon Google te redemande ton accord chaque semaine.
   Google affichera « application non vérifiée » à la première connexion : c'est normal pour une appli
   réservée à toi. Clique **Paramètres avancés** > **Accéder à Fil Rouge**.
3. **API et services** > **Identifiants** > ouvre l'**ID client OAuth** nommé
   « Web client (auto created by Google Service) ».
   Dans **Origines JavaScript autorisées**, ajoute :
   - `https://<ton-projet>.web.app`
   - `https://<ton-projet>.firebaseapp.com`
   - `http://localhost:5173` (pour les tests)
4. Enregistre, copie l'**ID client** (il finit par `.apps.googleusercontent.com`) et envoie-le-moi.

## 6. Autoriser GitHub à mettre l'appli en ligne

1. Dans <https://console.cloud.google.com>, **IAM et administration** > **Comptes de service** > **Créer un compte de service**.
   Nom : `github-deploy`.
2. Rôles à lui donner :
   - Administrateur Firebase Hosting
   - Administrateur des règles Firebase
   - Lecteur de clés API
   - Lecteur Cloud Run
3. Ouvre le compte créé > onglet **Clés** > **Ajouter une clé** > **JSON**. Un fichier se télécharge.
4. Sur GitHub, dans le dépôt : **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.
   Nom : `FIREBASE_SERVICE_ACCOUNT`. Valeur : colle tout le contenu du fichier JSON.
5. Supprime ensuite le fichier JSON de ton ordinateur. **Ne l'envoie à personne, ni dans la conversation.**

## 7. Première mise en ligne

Je range ta configuration dans le fichier `.env.production` du dépôt. Dès que la modification est
fusionnée sur `main`, GitHub publie l'appli sur `https://<ton-projet>.web.app`.

Ensuite, sur ton téléphone Android :
1. Ouvre l'adresse dans Chrome et connecte-toi avec Google.
2. Menu **⋮** > **Ajouter à l'écran d'accueil** (ou **Installer l'application**).
3. Dans l'appli : **Réglages** > **Connecter Google Agenda**.
   Un agenda « Fil Rouge – Interventions » apparaît dans ton Google Agenda, avec ses notifications.

Sur ton PC, même adresse dans Chrome ou Edge, puis l'icône d'installation dans la barre d'adresse.

## Coût

Gratuit au volume d'un artisan : la formule gratuite (Spark) de Firebase inclut 1 Gio de données,
50 000 lectures et 20 000 écritures par jour, et l'hébergement. Aucune carte bancaire demandée.
