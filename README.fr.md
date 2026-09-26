# Haru PC

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [繁體中文](README.zh-Hant.md) · **Français** · [Deutsch](README.de.md) · [Español](README.es.md) · [Português](README.pt-BR.md)

**Demandez à Haru sur votre téléphone. Votre ordinateur s'occupe du reste.**

Haru PC est le compagnon de bureau de **Haru – AI Assistant** (iPhone et Android). Vous confiez une tâche à Haru depuis votre téléphone, par exemple « range le dossier Rapports sur mon PC » ou « retrouve la facture du mois dernier et envoie-la-moi ». Haru PC reçoit la demande sur votre propre ordinateur, l'exécute, puis renvoie le résultat sur votre téléphone.

Haru PC fonctionne sur [OpenClaw](https://github.com/openclaw/openclaw), l'assistant IA personnel open source (licence MIT). Le programme d'installation met en place une version testée d'OpenClaw et y ajoute le plugin Haru PC : la personnalité d'assistant de Haru, une couche de sécurité fondée sur l'approbation depuis le téléphone et un ensemble de compétences prêtes à l'emploi. Haru PC est une distribution non officielle, sans lien avec le projet OpenClaw.

> **État :** préversion. Quelques imperfections sont à prévoir : n'hésitez pas à signaler les problèmes.

---

## Fonctionnement

```
 App Haru (téléphone)                             Haru PC (votre ordinateur)
 ────────────────────                             ──────────────────────────
 « Range le dossier Rapports sur mon PC »
   → Carte : « Envoyer à votre PC ? » [Exécuter]
   ── connexion directe, sans relais cloud ─────▶ reçoit la tâche
                                                    planifie les étapes
   ◀── « Je vais déplacer 12 fichiers. OK ? » ──  demande avant toute action risquée
   [Approuver]  ────────────────────────────────▶ effectue le travail
   ◀── « Terminé : 12 déplacés, 3 doublons » ───  envoie le résultat
```

- **Votre téléphone communique avec votre ordinateur** via une connexion chiffrée de bout en bout. Sur le même Wi-Fi, la connexion est directe ; hors de chez vous, elle passe par le relais Haru, qui ne transmet que des données chiffrées qu'il ne peut pas lire et ne conserve qu'une empreinte (hash) de votre jeton de connexion. Aucun réglage de box ni VPN nécessaire.
- **Rien ne s'exécute sans votre accord.** Toute action qui modifie des fichiers, lance des commandes, envoie des messages ou utilise le navigateur s'affiche d'abord sous forme de carte sur votre téléphone. Elle ne s'exécute qu'après que vous avez touché **Approuver**.
- **Vos données restent les vôtres.** Les conversations, la mémoire et les identifiants sont stockés uniquement sur votre ordinateur et votre téléphone.

---

## Ce que Haru PC sait faire

| Ce que vous demandez sur le téléphone | Ce que fait Haru PC |
|---|---|
| « Range mon dossier Téléchargements » | Classe les fichiers dans des dossiers par type et par date, et signale les doublons |
| « Retrouve le contrat PDF de la semaine dernière et envoie-le-moi » | Cherche dans vos fichiers et envoie le fichier sur votre téléphone |
| « Transforme ce compte rendu de réunion en document Word » | Crée un `.docx` dans votre dossier Documents |
| « Résume le tableur qui est sur mon bureau » | Lit le fichier et répond avec un bref résumé |
| « Compare le prix de cet article sur ces trois sites » | Ouvre un navigateur, compare et répond. La compétence navigateur reste désactivée tant que vous ne l'activez pas, et elle ne paie jamais |
| « Tous les lundis à 9 h, liste les fichiers que j'ai modifiés cette semaine » | Crée une routine qui s'exécute sur votre ordinateur |

Les compétences peuvent être ajoutées, activées ou désactivées. Voir [Compétences](#compétences).

---

## Configuration requise

- **L'application Haru** sur votre téléphone (iPhone et Android, bientôt disponible sur l'App Store et Google Play)
- **Un ordinateur qui reste allumé** tant que vous voulez que Haru PC accepte des tâches :
  - **macOS** 13 ou version ultérieure (Apple silicon ou Intel)
  - **Windows** 10/11, 64 bits. Fonctionne en natif, WSL n'est donc pas nécessaire
  - **Linux** avec `systemd` : Ubuntu 22.04+, Debian 12+, Fedora et équivalents. Un Raspberry Pi 4/5 (64 bits, 2 Go ou plus) convient aussi, à condition d'utiliser un modèle cloud
  - **Node.js 24** ou version ultérieure. Le programme d'installation l'installe pour vous s'il est absent
- **Un modèle d'IA**, à votre choix :
  - **Modèle cloud :** connectez-vous avec un abonnement ChatGPT, Claude ou GitHub Copilot que vous avez déjà, ou utilisez une clé d'API (par exemple Gemini). C'est l'option qui offre la meilleure qualité.
  - **Modèle local** exécuté sur votre ordinateur (llama.cpp ou [Ollama](https://ollama.com)). Il est gratuit et entièrement privé, mais plus lent. Avec 16 Go de RAM, un modèle d'environ 9 milliards de paramètres est la limite en pratique. Par sécurité, les petits modèles locaux n'ont accès qu'à des compétences en lecture seule, sauf si vous modifiez ce réglage.

### Configuration conseillée

Un **Mac mini** (ou tout ordinateur allumé en permanence) est l'endroit idéal pour Haru PC : il consomme peu, fonctionne sans écran et, avec 16 Go de RAM ou plus, peut aussi faire tourner un modèle local gratuit. Appairez-le une fois avec l'app Haru sur votre téléphone, puis laissez-le allumé.

---

## Installation

### macOS et Linux

```bash
curl -fsSL https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/inphilchoi/haru-pc/main/install.ps1 | iex
```

Le programme d'installation :
1. installe Node.js si nécessaire, puis une version testée et figée d'OpenClaw,
2. ajoute le plugin Haru PC et ses compétences par défaut,
3. applique des réglages sûrs : approbation obligatoire des commandes, connexions chiffrées (TLS) et découverte sur le réseau local activée,
4. configure Haru PC pour qu'il démarre en arrière-plan (launchd sous macOS, tâche planifiée sous Windows, service `systemd --user` sous Linux),
5. vous aide à choisir un modèle d'IA, puis affiche un QR code d'appairage.

Vous préférez lire le script avant de l'exécuter ? Téléchargez [`install.sh`](install.sh) ou [`install.ps1`](install.ps1), vérifiez-les, puis lancez-les. En savoir plus : [inphilchoi.github.io/haru](https://inphilchoi.github.io/haru/)

---

## Connecter votre téléphone

1. Ouvrez **Haru** sur votre téléphone et dites **« Connecte mon PC »** (ou touchez ⚙ → **Haru PC**).
2. Scannez le QR code affiché par le programme d'installation. Il est valable 10 minutes et ne fonctionne qu'une seule fois. Pour en afficher un nouveau, exécutez :
   ```bash
   haru-pc pair
   ```
3. Quand l'application affiche **« Connecté »**, c'est terminé — chez vous comme à l'extérieur.

**Utilisation hors de chez vous :** rien à configurer. Le code d'association contient déjà le relais Haru chiffré : l'application atteint Haru PC où que vous soyez. Haru PC n'ouvre jamais de port sur l'internet public. (Si vous préférez votre propre réseau [Tailscale](https://tailscale.com), `haru-pc remote on` fonctionne toujours.)

---

## Choisir votre modèle d'IA

Choisissez-en un lors de l'installation ; vous pourrez en changer à tout moment.

**Connectez-vous avec un abonnement IA que vous avez déjà.** Haru PC ne vous demande jamais votre mot de passe. Vous vous connectez sur la page du fournisseur lui-même, et Haru PC ne reçoit que l'autorisation dont il a besoin.

| Fournisseur | Comment se connecter |
|---|---|
| **ChatGPT** (OpenAI) | `haru-pc model login chatgpt`, puis connectez-vous sur la page d'OpenAI. Les limites de votre forfait ChatGPT s'appliquent |
| **Claude** (Anthropic) | Connectez-vous une fois avec la CLI Claude officielle d'Anthropic (`claude auth login`), puis exécutez `haru-pc model login claude`. Les limites de votre forfait Claude s'appliquent. Vérifiez les conditions actuelles d'Anthropic concernant l'utilisation de votre forfait avec d'autres outils |
| **GitHub Copilot** | `haru-pc model login copilot`, puis saisissez le code affiché sur la page de GitHub |

**Ou utilisez une clé d'API** (Anthropic, OpenAI, Google Gemini, Mistral, DeepSeek, entre autres) :

```bash
haru-pc model key openai      # collez votre clé lorsqu'elle est demandée
haru-pc model key gemini
```

Google Gemini se connecte uniquement avec une clé d'API. Vous pouvez obtenir une clé gratuite dans Google AI Studio.

**Ou exécutez un modèle local** sur votre ordinateur. C'est gratuit et privé :

```bash
haru-pc model local           # recommande un modèle adapté à votre ordinateur
```

```bash
haru-pc model                 # affiche le modèle actuel
```

Les connexions et les clés sont conservées dans le stockage sécurisé de votre système d'exploitation (Trousseau, Gestionnaire d'identification Windows ou libsecret sous Linux). Elles ne sont jamais envoyées à votre téléphone, ni à nous.

### En Chine continentale

OpenAI, Anthropic et Google ne proposent pas leurs modèles en Chine continentale. Choisissez plutôt un fournisseur disponible sur place, par exemple DeepSeek, Qwen (Alibaba), Kimi (Moonshot), Doubao (Volcano Engine), ERNIE (Baidu Qianfan), MiniMax ou Zhipu GLM, avec `haru-pc model key <provider>`, ou utilisez un modèle local avec `haru-pc model local`, qui fonctionne sans accès à internet.

---

## Compétences

Les compétences sont de petits ensembles d'instructions, faciles à lire, qui apprennent un métier à Haru PC. Elles se trouvent dans `~/.haru-pc/skills/` et suivent le format de compétences d'OpenClaw.

```bash
haru-pc skills                # liste les compétences installées
haru-pc skills enable office  # active une compétence
haru-pc skills disable browser
```

Compétences par défaut :

| Compétence | Rôle |
|---|---|
| `files` | Trouver, déplacer, renommer et ranger des fichiers. Signale les doublons |
| `send-to-phone` | Renvoyer un fichier ou un résumé vers votre application Haru |
| `office` | Créer et lire des documents Word, Excel, PowerPoint et PDF |
| `browser` | Faire des recherches et comparer des pages. **Désactivée par défaut.** Ne paie jamais et ne se connecte jamais à un compte sans vous le demander |
| `routines` | Exécuter une tâche selon un planning (« tous les lundis à 9 h ») |

Haru PC est livré avec ses propres compétences, relues et vérifiées, et n'installe jamais de lui-même des compétences issues des marketplaces publiques. Toute nouvelle installation doit être approuvée sur votre téléphone.

Vous pouvez aussi écrire votre propre compétence. Voir [docs/skills.md](docs/skills.md).

---

## Sécurité

Haru PC peut agir sur votre ordinateur ; il a donc été conçu pour être prudent :

- **Approbation sur le téléphone pour chaque action** qui modifie quelque chose : écrire ou déplacer des fichiers, lancer des commandes, utiliser le navigateur, envoyer des fichiers. Vous voyez exactement ce qui va s'exécuter et vous choisissez **Autoriser une fois** ou **Refuser**. Il n'existe pas d'option « toujours autoriser ».
- **Les messages sont des entrées non fiables.** Le texte contenu dans des fichiers, des pages web ou des e-mails ne peut pas donner de nouvelles instructions à Haru PC. Il est traité comme de simples données, ce qui protège contre l'injection de prompt.
- **Liste de dossiers autorisés.** Par défaut, Haru PC ne travaille que dans `Documents`, `Downloads` et `Desktop`. Pour modifier cette liste, utilisez `haru-pc allow <folder>`.
- **Aucun paiement, aucun virement.** Haru PC n'achète jamais rien, ne paie jamais et ne déplace jamais d'argent.
- **Appairage obligatoire.** Seuls les téléphones que vous avez appairés peuvent envoyer des tâches. Vous pouvez les dissocier à tout moment avec `haru-pc unpair`.
- **Réseau local ou votre tailnet uniquement.** Haru PC n'est jamais exposé à l'internet public.
- **Version figée et auditée.** Le programme d'installation utilise une version testée d'OpenClaw et lance l'audit de sécurité d'OpenClaw à la fin. `haru-pc update` passe à la version testée suivante.

Si vous découvrez un problème de sécurité, écrivez à **creativelab.choi@gmail.com** plutôt que d'ouvrir une issue publique.

---

## Mise à jour et désinstallation

```bash
haru-pc update       # met à jour Haru PC et ses compétences
haru-pc uninstall    # arrête le service en arrière-plan et supprime Haru PC
```

Vos réglages restent dans `~/.haru-pc` tant que vous ne supprimez pas ce dossier.

---

## Dépannage

| Problème | Solution |
|---|---|
| Le téléphone ne trouve pas le PC | Vérifiez que l'ordinateur est allumé et connecté à internet, puis exécutez `haru-pc status`. Si cela ne suffit pas, affichez un nouveau code avec `haru-pc pair` et scannez-le à nouveau |
| Le QR code d'appairage a expiré | Exécutez de nouveau `haru-pc pair` |
| Les tâches sont lentes | Un modèle local sur une machine modeste est lent. Connectez-vous à un abonnement avec `haru-pc model login chatgpt` ou `haru-pc model login claude` |
| Aucune carte d'approbation n'est apparue | Vous pouvez fermer Haru après avoir confié une tâche : Haru PC continue jusqu'à 15 minutes, et les cartes d'approbation en attente s'affichent quand vous rouvrez Haru. Si une demande reste sans réponse pendant 10 minutes, Haru PC la refuse et rien ne s'exécute. Ouvrez Haru et redemandez |
| Quelque chose s'est mal passé | Exécutez `haru-pc logs` et joignez la sortie à une issue |

---

## Confidentialité

Haru PC ne nécessite aucun compte et ne passe par aucun serveur à nous. Vos tâches, fichiers, mémoire et clés restent sur vos appareils. Si vous choisissez un modèle d'IA cloud, le texte de votre tâche est transmis à ce fournisseur, selon ses propres conditions. Avec un modèle local, rien ne quitte votre ordinateur.

---

## Crédits et licence

Haru PC est développé par **CreativeLab**. Contact : creativelab.choi@gmail.com

Il fonctionne sur **OpenClaw**, créé par l'OpenClaw Foundation et ses contributeurs, utilisé sous licence MIT (la licence et l'avis de copyright d'OpenClaw sont inclus dans ce dépôt). Haru PC est une distribution indépendante et non officielle ; elle n'est ni affiliée à l'OpenClaw Foundation, ni approuvée par elle. Le nom « OpenClaw » n'est utilisé ici que pour indiquer sur quoi repose Haru PC.

Haru PC est distribué sous [licence MIT](LICENSE).
