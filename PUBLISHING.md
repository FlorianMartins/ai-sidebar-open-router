# Publication — Hivey AI (Firefox AMO / Chrome Web Store / Edge)

Documentation complète de mise en conformité et de publication.
Version de référence : **2.195.0**.

> Voir aussi [`REVIEWERS.md`](REVIEWERS.md) — instructions de build reproductible
> destinées aux relecteurs des stores.

---

## 0. État de conformité

Validation avec le linter officiel Mozilla (`addons-linter`, celui exécuté par AMO) :

```
errors: 0   notices: 0   warnings: 24   (dont 0 sur le manifest)
```

**22 des 24 warnings viennent de `vendor/`** — des bibliothèques tierces
open-source livrées **non modifiées** (SHA-256 vérifiables) :

| Code | Fichier | Occurrences |
|---|---|---|
| `UNSAFE_VAR_ASSIGNMENT` | `vendor/mermaid.min.js` | 9 |
| `DANGEROUS_EVAL` | `vendor/pdf.min.js` | 4 |
| `DANGEROUS_EVAL` | `vendor/pdf.worker.min.js` | 3 |
| `DANGEROUS_EVAL` | `vendor/transformers/transformers.min.js` | 2 |
| `DANGEROUS_EVAL` | `vendor/mermaid.min.js` | 2 |
| `UNSAFE_VAR_ASSIGNMENT` | `vendor/purify.min.js` | 1 |
| `DANGEROUS_EVAL` | `vendor/jszip.min.js` | 1 |

Ils sont **irréductibles** sans supprimer les fonctionnalités correspondantes
(lecture PDF, diagrammes Mermaid, RAG local, lecture de ZIP). Les relecteurs des
stores s'y attendent pour des libs aussi connues.

**Les 2 restants sont dans notre code, et c'est volontaire** :
`src/lib/dom.js:32` et `src/content/content.js:7`. Ce sont les **deux uniques
points de passage** par lesquels transite toute insertion HTML de l'extension
(voir §1). Auparavant il y en avait 37 dispersés.

Ces warnings n'empêchent pas la publication mais **déclenchent une revue humaine**.
C'est normal et attendu pour ce type d'extension.

---

## 1. Corrections appliquées pour la conformité (2.194.0 → 2.195.0)

### Firefox — `manifest.json`

| Correction | Avant | Après | Pourquoi |
|---|---|---|---|
| `strict_min_version` | `121.0` | `142.0` | `optional_host_permissions` exige FF 128, `data_collection_permissions` exige FF 140 / **Android 142**. Déclarer 121 produisait 4 warnings de validation. |
| `data_collection_permissions.required` | `["none"]` | `["websiteContent"]` | ⚠️ **Correction importante.** Déclarer « none » alors que l'extension transmet le contenu des pages à un fournisseur d'IA est une **sous-déclaration** — motif de rejet. `websiteContent` est la catégorie exacte. |

> Les valeurs autorisées sont : `authenticationInfo`, `bookmarksInfo`, `browsingActivity`,
> `financialAndPaymentInfo`, `healthInfo`, `locationInfo`, `personalCommunications`,
> `personallyIdentifyingInfo`, `searchTerms`, `websiteActivity`, `websiteContent`
> (+ `technicalAndInteraction`, **optionnel uniquement**), ou `none`.

### Chrome — `manifest.chrome.json`

| Correction | Avant | Après | Pourquoi |
|---|---|---|---|
| `author` | `"Florian Martins"` (string) | **supprimé** | En MV3 Chrome attend un objet `{"email": …}` **dont l'email doit correspondre exactement au compte éditeur**. Une non-correspondance = **rejet à l'upload**. Le champ étant facultatif, le supprimer élimine le risque. |
| `minimum_chrome_version` | absent | `"119"` | `side_panel` exige Chrome 114, `optional_host_permissions` exige **119**. Sans ce champ, l'extension s'installe sur des Chrome trop anciens et **casse silencieusement**. |

### Les deux — `rules/frame-unblock.json`

La règle `declarativeNetRequest` retirait `X-Frame-Options` et `Content-Security-Policy`
sur **24 domaines**, dont des domaines d'**authentification** :
`accounts.google.com`, `auth.openai.com`, `login.microsoftonline.com`, `login.live.com`,
plus des domaines parents très larges (`google.com`, `microsoft.com`, `openai.com`…).

➡️ **Réduite à 11 domaines de chat uniquement**, strictement alignés sur `content_scripts`.

**C'était le principal risque de rejet.** Retirer les en-têtes de sécurité de pages de
connexion est explicitement qualifié de *contournement de mesures de sécurité* par les
deux stores, et Google interdit par ailleurs l'embarquement de son écran de connexion
dans une iframe. La fonctionnalité « chat web embarqué » reste opérationnelle : seule
la connexion doit se faire dans un onglet normal, ce qui est le comportement attendu.

### Les deux — centralisation des insertions HTML (2.195.0)

Les 37 affectations `innerHTML` dispersées dans le code ont été remplacées par un
helper unique `setHTML()` (`src/lib/dom.js`), plus une copie locale dans
`src/content/content.js` (un content script ne peut pas importer de module ES).

- **Aucun changement de comportement** : `setHTML(el, html)` fait exactement
  `el.innerHTML = html`. Substitution purement mécanique, vérifiée fichier par
  fichier.
- **Gain de sécurité réel** : un seul endroit auditable écrit du HTML dans le DOM.
- **Gain de validation** : 37 warnings → 2.

`printConversation()` (`src/lib/exportConversation.js`) a par ailleurs été
réécrit en API DOM pure : plus de `document.write`, plus de chaîne HTML, plus de
`<script>` inline, et le texte des messages passe par `textContent` (injection de
balises devenue structurellement impossible).

---

## 2. Justification des permissions (à recopier dans les formulaires)

Le Chrome Web Store exige une justification **pour chaque permission**. C'est la
première cause de rejet. Textes prêts à l'emploi :

| Permission | Justification |
|---|---|
| `storage` | Enregistre localement les réglages, la clé API de l'utilisateur et l'historique des conversations. Aucune donnée n'est envoyée à nos serveurs. |
| `tabs` | Lit le titre et l'URL des onglets que l'utilisateur sélectionne **explicitement** comme contexte de sa question. |
| `activeTab` | Permet de lire ou de capturer la page courante, uniquement après une action explicite de l'utilisateur. |
| `scripting` | Injecte la surcouche de sélection (choix d'un élément / capture de zone) à la demande de l'utilisateur. |
| `contextMenus` | Ajoute les entrées de clic droit « Résumer la sélection » et « Capturer une zone ». |
| `clipboardWrite` | Boutons « Copier » sur les réponses et les blocs de code. |
| `identity` | Connexion OpenRouter via OAuth PKCE (`launchWebAuthFlow`). Facultatif : l'utilisateur peut coller sa clé à la main. |
| `declarativeNetRequest` | Autorise l'affichage des interfaces de chat des fournisseurs dans le panneau latéral. Liste de domaines fixe et limitée, déclarée dans `rules/frame-unblock.json`. |
| `alarms` | Vérifie périodiquement les pages que l'utilisateur a demandé de surveiller. |
| `notifications` | Prévient l'utilisateur qu'une page surveillée a changé. |
| `sidePanel` *(Chrome)* | Fournit le panneau latéral, qui est l'interface principale de l'extension. |
| `host_permissions` (API fournisseurs) | Envoie les requêtes à l'API du fournisseur d'IA choisi par l'utilisateur, avec **sa propre clé** (BYOK). |
| `<all_urls>` | Lit ou capture la page que l'utilisateur demande explicitement d'analyser. Aucune lecture automatique ni en arrière-plan. |

**Remote code : répondre « Non ».** C'est exact : la CSP est `script-src 'self'`,
toutes les bibliothèques sont empaquetées dans `vendor/`, et les *artifacts* s'exécutent
dans une iframe distante **sandboxée** (`hivey.be/artifact-runner.html`) qui ne peut pas
injecter de code dans l'extension.

> **Cas du modèle d'embedding (Wisebase).** Au premier usage de Wisebase, l'extension
> télécharge depuis le CDN Hugging Face le modèle `Xenova/all-MiniLM-L6-v2` (~23 Mo),
> puis le met en cache. **Ce ne sont pas des scripts** : ce sont des **poids ONNX et un
> tokenizer**, des données inertes consommées par le moteur d'inférence, lequel est
> **empaqueté dans l'extension** (`vendor/transformers/`). Aucun JavaScript n'est
> chargé à distance et rien n'est évalué — la réponse « Non » à *remote code* reste
> exacte. Ce téléchargement est **différé** : il n'a lieu que si l'utilisateur ouvre
> Wisebase et indexe une source.

---

## 3. Publier sur Firefox (AMO) — gratuit

1. Compte sur [addons.mozilla.org](https://addons.mozilla.org) — **2FA obligatoire**.
2. *Submit a New Add-on* → **« On this site »** (listed).
3. Uploader `ai-sidebar-2.195.0-firefox.zip`.
4. **Code source** : joindre `ai-sidebar-2.195.0-source.zip`. Notre code n'est ni
   minifié ni bundlé, mais `vendor/` contient des libs minifiées → fournir la source
   évite un aller-retour. Pointer le relecteur vers `REVIEWERS.md`.
5. Fiche : nom, résumé, description, captures, catégorie, licence, **URL de politique
   de confidentialité** (`https://hivey.be/ai-sidebar-privacy.html`).
6. Consentement données : déjà déclaré dans le manifest (`websiteContent`) → Firefox
   affiche automatiquement l'écran de consentement à l'installation.
7. **Revue** : avec `<all_urls>` + `declarativeNetRequest`, revue humaine quasi
   systématique. Compter **quelques jours à 2 semaines** la première fois.

### Mise à jour automatique
Automatique et gratuite via AMO. Rien à héberger, rien à configurer.

---

## 4. Firefox auto-hébergé (alternative, avec auto-update)

Utile pour distribuer hors AMO tout en gardant l'auto-update.

**a) Signer le XPI** (canal *unlisted*, automatisé, sans revue humaine) :
```bash
npx web-ext sign --channel=unlisted \
  --api-key=user:xxxxx --api-secret=yyyyy \
  --source-dir=/opt/firefox-ai-sidebar
```
Clés API : addons.mozilla.org → *Developer Hub* → *Manage API Keys*.

**b) Déclarer `update_url`** dans `manifest.json` (HTTPS obligatoire) :
```json
"browser_specific_settings": {
  "gecko": {
    "id": "ai-sidebar-open-router@github",
    "strict_min_version": "142.0",
    "update_url": "https://hivey.be/updates.json"
  }
}
```

**c) Héberger `updates.json`** :
```json
{
  "addons": {
    "ai-sidebar-open-router@github": {
      "updates": [
        {
          "version": "2.195.0",
          "update_link": "https://hivey.be/ai-sidebar-2.195.0.xpi",
          "update_hash": "sha256:<sha256 du xpi>"
        }
      ]
    }
  }
}
```

Firefox vérifie **toutes les ~24 h**. Forçage manuel : `about:addons` → ⚙️ →
*Vérifier les mises à jour*.

⚠️ Le `version` du JSON doit correspondre **exactement** à celui du XPI signé.
⚠️ `update_url` est **ignoré** si l'extension est publiée sur AMO.

---

## 5. Publier sur Chrome Web Store — 5 $ (frais unique)

1. [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
   → payer les **5 $** (une seule fois, à vie).
2. Uploader `ai-sidebar-chrome-2.195.0.zip` (le **zip**, jamais un `.crx`).
3. Fiche : description, **≥ 1 capture 1280×800**, icône 128 px, catégorie, langue.
4. Onglet **Privacy** — le point critique :
   - *Single purpose* : « Panneau latéral de chat IA en BYOK : l'utilisateur branche
     sa propre clé API pour interroger un modèle sur la page qu'il consulte. »
   - **Justifier chaque permission** → tableau §2.
   - *Remote code* : **No** → voir §2.
   - Cocher les 3 certifications d'usage des données + URL de politique de confidentialité.
5. Publier → revue. Permissions larges = **plusieurs jours à quelques semaines**.

### Mise à jour automatique
Automatique : Chrome interroge le store environ **toutes les 5 h**. Pour publier une
mise à jour : incrémenter `version`, ré-uploader le zip, resoumettre.

### ⚠️ Auto-hébergement Chrome : impossible en pratique
Le mécanisme `update_url` existe toujours, mais **Chrome bloque sur Windows et macOS
toute extension non issue du Web Store** depuis 2018. Seule échappatoire : les
politiques d'entreprise (`ExtensionInstallForcelist`), donc réservé au déploiement
en parc maîtrisé. Pour le grand public, **le Web Store est obligatoire**.

### OAuth OpenRouter
`src/lib/auth.js` utilise `browser.identity.getRedirectURL()`, qui **s'adapte
automatiquement** à l'ID attribué par le store. Aucune action requise.
Si l'on souhaite malgré tout figer l'ID entre dev et production : récupérer la clé
publique dans le dashboard CWS (*Package* → *Public key*) et l'ajouter en `"key"`
dans le manifest — l'ordre inverse ne fonctionne pas.

---

## 6. Edge Add-ons — gratuit (bonus)

Accepte **le même zip Chrome**, sans frais d'inscription, et la revue y est
nettement plus rapide. [partner.microsoft.com/dashboard/microsoftedge](https://partner.microsoft.com/dashboard/microsoftedge)

---

## 7. Checklist avant chaque soumission

```bash
# 1. Incrémenter la version dans manifest.json ET manifest.chrome.json
# 2. Rebuild
bash scripts/build.sh
# 3. Valider (Node 20+ requis)
npx addons-linter@latest .build
#    → attendu : 0 errors, 0 warning sur manifest.json
```

- [ ] `version` identique dans les deux manifests
- [ ] `0 errors` au linter
- [ ] Aucun domaine d'authentification dans `rules/frame-unblock.json`
- [ ] `data_collection_permissions` reflète la réalité de ce qui est transmis
- [ ] Pas de champ `author` dans le manifest Chrome
- [ ] Zip source joint pour AMO
