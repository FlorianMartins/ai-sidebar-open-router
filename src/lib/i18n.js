// Tiny i18n layer for the sidebar UI.
//
// English is the source/default language; French is an optional overlay the user
// selects in Settings (`uiLang`). Lookup order: DICT[lang][key] → DICT.en[key] →
// the key itself (so a missing translation degrades to English, never to a blank).
//
// Static markup is annotated with data-i18n attributes and `applyDom(root)` fills
// it in at load time; dynamic strings call `t(key, vars)` directly. Interpolation
// uses {name} placeholders replaced from the `vars` object.

let lang = "en";

const EN = {
  // ----- Top bar / panels ----------------------------------------------------
  "history.title": "History (local)",
  "newChat.title": "New conversation",
  "settings.title": "Settings",
  "history.head": "History",
  "history.local": "(local, private)",
  "history.clearAll": "Clear all",
  "history.clearAllTitle": "Clear everything",
  "close.title": "Close",
  "pagebar.title": "Page seen by the AI",
  "tabs.btnTitle": "Choose which tabs to give the AI",
  "tabs.use": "Use the ticked tabs",
  "refresh.title": "Refresh",

  // ----- Onboarding / empty state -------------------------------------------
  "onboard.title": "AI Sidebar — plug in your AI",
  "onboard.lead": "The simplest and <b>free</b> option: sign in to <b>OpenRouter</b> (Google / GitHub / email account) — get <b>free models</b> (Llama, Gemini, DeepSeek…) with no key to manage.",
  "onboard.free": "🎁 Connect (OpenRouter — free)",
  "onboard.others": "⚙ Other providers / API key",
  "onboard.lead2": "Or: Claude, OpenAI, Gemini, Mistral, Groq, DeepSeek… (API key, often free) or a <b>local</b> model (Ollama / LM Studio).",
  "greeting": "How can I help you?",
  "greeting.terminal": "⌨️ Terminal ready — describe a coding task.",
  "greeting.agent": "🤖 Agent mode — describe a task to automate.",

  // ----- Terminal ------------------------------------------------------------
  "term.modelTitle": "Model used by the terminal",
  "term.clear": "clear",
  "term.clearTitle": "Clear the terminal",
  "term.inputPh": "describe a coding task…  ('help', 'clear', ↑/↓ history)",
  "term.noModel": "(no model — connect a provider)",
  "term.banner": "OpenClaude · code agent in a terminal (via OpenRouter & other APIs)",
  "term.sessionStarted": "● Session started — model: {model}  ·  local history on.",
  "term.describeTask": "  Describe a coding task. 'help' for help, 'clear' to clear, ↑/↓ to recall.",
  "term.restored": "— previous session restored —",
  "term.help":
    "OpenClaude — type a coding task (e.g. “write a bash script that backs up /etc”).\n" +
    "  • the model answers like a CLI agent (commands, diffs, statuses);\n" +
    "  • it CANNOT run anything on your machine — it gives you the commands to run;\n" +
    "  • 'clear' clears · ↑/↓ recall your commands · Enter sends, Shift+Enter = newline;\n" +
    "  • pick the model top-right; history stays 100% local.",
  "term.noModelConnected": "✗ no model connected — connect a provider (OpenRouter) then pick a model top-right.",
  "term.interrupted": "■ interrupted",
  "term.modelLine": "● Model: {model}",

  // ----- Code workspace (Program Generator launcher) -------------------------
  "code.title": "Program Generator",
  "code.sub": "Build web &amp; mobile apps with AI: code generation, <b>live preview</b>, a built-in terminal and <b>Expo Go</b> to test on mobile. Self-hosted, and it shares this sidebar's OpenRouter key — one and the same service.",
  "code.open": "🚀 Open the workshop in a new tab",
  "code.notConfigured": "Workshop URL not configured",
  "code.setUrl": "Set the URL in Settings → Code workshop.",
  "code.feat1": "⚡ AI code generation &amp; editing",
  "code.feat2": "👁 Live preview (web) in the browser",
  "code.feat3": "📱 Expo Go QR code to test on your phone",
  "code.feat4": "⌨️ Built-in terminal &amp; file management",
  "code.sec": "🔒 The workshop opens in an isolated tab. It uses the same providers as the sidebar — your OpenRouter key is handed over for you, so you never re-enter it. URL configurable in <b>Settings → Code workshop</b>.",

  // ----- Controls / model bar / composer ------------------------------------
  "confirm.allow": "Allow",
  "confirm.deny": "Deny",
  "chip.thinking": "💭 Reasoning",
  "chip.thinkingTitle": "Show the model's reasoning",
  "chip.webTitle": "Web search (Perplexity / OpenRouter / Claude) — configurable in ⚙",
  "chip.pageTitle": "The AI sees the current page",
  "translate.to": "Translate to",
  "translate.empty": "empty = the page",
  "improve.style": "Writing style",
  "image.size": "Size",
  "image.sizeTitle": "Sizes depend on the model. Native 4K/1440p doesn't exist on current image models — upscale the image afterwards.",
  "model.connect": "🔌 Connect a provider",
  "composer.ph": "Write a message…",
  "send.title": "Send",
  "stop.title": "Stop",

  // ----- Rail (workspace switcher) ------------------------------------------
  "rail.chat": "Chat",
  "rail.agent": "Agent",
  "rail.translate": "Translate",
  "rail.improve": "Improve",
  "rail.image": "Image",
  "rail.terminal": "Terminal",
  "rail.code": "Code",
  "rail.chatTitle": "Chat",
  "rail.agentTitle": "Agent — the AI acts in the browser",
  "rail.translateTitle": "Translate",
  "rail.improveTitle": "Improve a text",
  "rail.imageTitle": "Generate an image",
  "rail.terminalTitle": "Terminal (command-line code agent)",
  "rail.codeTitle": "AI code workshop (preview, Expo Go…)",
  "workspace.label": "Workspaces",

  // ----- Placeholders (per workspace) ---------------------------------------
  "ph.chat": "Write a message…",
  "ph.agent": "Describe a task to perform in the browser…",
  "ph.translate": "Text to translate (or leave empty for the page)…",
  "ph.improve": "Text to improve (or leave empty for the selection)…",
  "ph.image": "Describe the image to generate…",
  "ph.terminal": "Ask for code, a command, a script…",

  // ----- Model picker --------------------------------------------------------
  "cost.free": "free",
  "model.choose": "— Choose a model —",
  "model.current": "✓ Current model",
  "model.keyMissing": " (key missing)",
  "image.connectOpenAI": "— Connect OpenAI to generate images —",
  "image.connectAny": "— Connect an image provider (e.g. OpenAI) —",
  "image.tierDefault": "price depends on the model",

  // ----- OpenRouter connect --------------------------------------------------
  "or.connecting": "Connecting…",
  "or.connected": "✓ Connected to OpenRouter — pick a free model below.",
  "or.connectErr": "OpenRouter connection: {msg}",

  // ----- History list --------------------------------------------------------
  "time.now": "just now",
  "time.min": "{n} min",
  "time.hour": "{n} h",
  "time.day": "{n} d",
  "history.empty": "No saved conversation.",
  "history.untitled": "Conversation",
  "delete.title": "Delete",

  // ----- Compare / send ------------------------------------------------------
  "compare.with": "⚖ Compare with",
  "compare.btn": "Compare",
  "err.keyMissingFor": "Key missing for {label}.",
  "msg.interrupted": "■ Interrupted.",
  "err.generic": "Error: {msg}",
  "err.image": "Image: {msg}",
  "confirm.prompt": "Allow the action “{name}”? {input}",
  "err.noKeyModel": "No key for this model. Click “Connect / Add a provider” (⚙).",
  "badge.web": "🌐 Web search · {label} · {model}",
  "badge.agent": "🤖 Agent · {label} · {model}",

  // ----- Quick actions / translate / improve / image -------------------------
  "label.translate": "🌐 Translate",
  "label.translatePage": "🌐 Translate the page",
  "label.translateSel": "🌐 Translate the selection",
  "prompt.translate": "Translate to {lang}, keeping the formatting:\n\n{text}",
  "err.nothingToTranslateInput": "Nothing to translate (type some text or open a page).",
  "err.nothingToTranslate": "Nothing to translate.",
  "err.typeOrSelect": "Type or select some text.",
  "improve.only": "Return only the result, with no preamble.",
  "improve.textLabel": "Text:",
  "err.describeImage": "Describe the image to generate.",
  "label.summarizePage": "📝 Summarize the page",
  "prompt.summarizePage": "Summarize this page as key points (title, main ideas, conclusion).",
  "err.noReadablePage": "No readable page to summarize.",
  "label.summarizeSel": "📝 Summarize the selection",
  "prompt.summarizeSel": "Summarize as key points:\n\n{text}",
  "err.nothingToSummarize": "Nothing to summarize.",
  "label.improve": "✨ Improve the text",
  "prompt.improve": "Improve this text (clarity, style, grammar), keep the original language, return only the rewritten text:\n\n{text}",
  "err.selectToImprove": "Select some text to improve first.",
  "label.explain": "💡 Explain",
  "prompt.explain": "Explain simply and clearly:\n\n{text}",
  "err.nothingToExplain": "Nothing to explain.",
  "label.reply": "✉️ Draft reply",
  "prompt.reply": "Write a polite, fitting reply (in {lang}) to the following message/email. Provide a draft ready to review and send (I'll check before sending):\n\n{text}",
  "err.noMessageToReply": "No message to reply to.",
  "err.imageKeyMissing": "Key missing for image generation ({label}).",
  "image.generating": "Generating the image…",

  // ----- Image sizes (by value) ---------------------------------------------
  "size.256x256": "Favicon — square 256² (DALL·E 2)",
  "size.512x512": "Small icon — square 512² (DALL·E 2)",
  "size.1024x1024": "Logo / HD square — 1024² (all models)",
  "size.1536x1024": "Landscape 3:2 — 1536×1024 (gpt-image-1)",
  "size.1024x1536": "Portrait 2:3 — 1024×1536 (gpt-image-1)",
  "size.1792x1024": "Landscape 16:9 “HD” — 1792×1024 (DALL·E 3)",
  "size.1024x1792": "Portrait 9:16 “HD” — 1024×1792 (DALL·E 3)",

  // ----- Writing presets (label by id) --------------------------------------
  "preset.improve": "Improve (clarity & grammar)",
  "preset.shorten": "Shorten",
  "preset.expand": "Expand / elaborate",
  "preset.simplify": "Simplify",
  "preset.formal": "More formal",
  "preset.friendly": "More friendly",
  "preset.marketing": "Marketing / copywriting",
  "preset.newsletter": "Newsletter",
  "preset.email": "Professional email",
  "preset.linkedin": "LinkedIn post",
  "preset.tweet": "X post / Tweet",
  "preset.blog": "Blog article",
  "preset.academic": "Academic",
  "preset.storytelling": "Storytelling",
  "presetPrompt.improve": "Improve this text: clarity, style, grammar and flow, keeping the original language and intent.",
  "presetPrompt.shorten": "Shorten this text while keeping the essentials and the meaning.",
  "presetPrompt.expand": "Expand and enrich this text with more relevant details and examples.",
  "presetPrompt.simplify": "Reword this text in a simple, accessible way (general-audience level).",
  "presetPrompt.formal": "Rewrite this text in a formal, professional register.",
  "presetPrompt.friendly": "Rewrite this text in a warm, friendly and accessible tone.",
  "presetPrompt.marketing": "Rewrite this text like a copywriter: catchy, benefit-driven, with a clear call to action.",
  "presetPrompt.newsletter": "Turn this text into an engaging newsletter section: catchy headline, conversational tone, and a compelling closing.",
  "presetPrompt.email": "Write a clear, polite professional email from this content (subject + body + sign-off).",
  "presetPrompt.linkedin": "Turn this text into a punchy LinkedIn post: strong hook, short paragraphs, and a few relevant hashtags.",
  "presetPrompt.tweet": "Condense this text into a punchy X post (≤ 280 characters), optionally with 1–2 hashtags.",
  "presetPrompt.blog": "Expand this text into a structured blog article (title, subheadings, intro, conclusion) in an informative tone.",
  "presetPrompt.academic": "Rewrite this text in an academic style: precise, neutral, with elevated vocabulary.",
  "presetPrompt.storytelling": "Rewrite this text as an immersive narrative (storytelling) that grabs attention.",

  // ----- Target-language option names ---------------------------------------
  "lang.French": "French",
  "lang.English": "English",
  "lang.Spanish": "Spanish",
  "lang.German": "German",
  "lang.Italian": "Italian",
  "lang.Portuguese": "Portuguese",
  "lang.Dutch": "Dutch",
  "lang.Arabic": "Arabic",
  "lang.Chinese": "Chinese",
  "lang.Japanese": "Japanese",
  "lang.Russian": "Russian",
};

const FR = {
  "history.title": "Historique (local)",
  "newChat.title": "Nouvelle conversation",
  "settings.title": "Réglages",
  "history.head": "Historique",
  "history.local": "(local, privé)",
  "history.clearAll": "Tout effacer",
  "history.clearAllTitle": "Tout effacer",
  "close.title": "Fermer",
  "pagebar.title": "Page vue par l'IA",
  "tabs.btnTitle": "Choisir les onglets à donner à l'IA",
  "tabs.use": "Utiliser les onglets cochés",
  "refresh.title": "Rafraîchir",

  "onboard.title": "Sidebar IA — branchez votre IA",
  "onboard.lead": "Le plus simple et <b>gratuit</b> : connectez-vous à <b>OpenRouter</b> (compte Google / GitHub / email) — accès à des <b>modèles gratuits</b> (Llama, Gemini, DeepSeek…) sans gérer de clé.",
  "onboard.free": "🎁 Se connecter (OpenRouter — gratuit)",
  "onboard.others": "⚙ Autres fournisseurs / clé API",
  "onboard.lead2": "Ou : Claude, OpenAI, Gemini, Mistral, Groq, DeepSeek… (clé API, souvent gratuite) ou un modèle <b>local</b> (Ollama / LM Studio).",
  "greeting": "Comment puis-je vous aider ?",
  "greeting.terminal": "⌨️ Terminal prêt — décrivez une tâche de code.",
  "greeting.agent": "🤖 Mode agent — décrivez une tâche à automatiser.",

  "term.modelTitle": "Modèle utilisé par le terminal",
  "term.clear": "clear",
  "term.clearTitle": "Effacer le terminal",
  "term.inputPh": "décris une tâche de code…  ('help', 'clear', ↑/↓ historique)",
  "term.noModel": "(aucun modèle — connectez un fournisseur)",
  "term.banner": "OpenClaude · agent de code en terminal (via OpenRouter & autres API)",
  "term.sessionStarted": "● Session démarrée — modèle : {model}  ·  historique local actif.",
  "term.describeTask": "  Décris une tâche de code. 'help' pour l'aide, 'clear' pour effacer, ↑/↓ pour rappeler.",
  "term.restored": "— session précédente restaurée —",
  "term.help":
    "OpenClaude — tape une tâche de code (ex: « écris un script bash qui sauvegarde /etc »).\n" +
    "  • le modèle répond façon agent CLI (commandes, diffs, statuts) ;\n" +
    "  • il ne PEUT PAS exécuter sur ta machine — il fournit les commandes à lancer ;\n" +
    "  • 'clear' efface · ↑/↓ rappellent tes commandes · Entrée envoie, Maj+Entrée = nouvelle ligne ;\n" +
    "  • le modèle se choisit en haut à droite ; l'historique reste 100% local.",
  "term.noModelConnected": "✗ aucun modèle connecté — connecte un fournisseur (OpenRouter) puis choisis un modèle en haut à droite.",
  "term.interrupted": "■ interrompu",
  "term.modelLine": "● Modèle : {model}",

  "code.title": "Program Generator",
  "code.sub": "Construisez des apps web &amp; mobiles avec l'IA : génération de code, <b>preview live</b>, terminal intégré et <b>Expo Go</b> pour tester sur mobile. Auto-hébergé, il partage la clé OpenRouter de cette sidebar — un seul et même service.",
  "code.open": "🚀 Ouvrir l'atelier dans un nouvel onglet",
  "code.notConfigured": "URL de l'atelier non configurée",
  "code.setUrl": "Renseignez l'URL dans Réglages → Atelier de code.",
  "code.feat1": "⚡ Génération &amp; édition de code par l'IA",
  "code.feat2": "👁 Aperçu en direct (web) dans le navigateur",
  "code.feat3": "📱 QR code Expo Go pour tester sur téléphone",
  "code.feat4": "⌨️ Terminal &amp; gestion de fichiers intégrés",
  "code.sec": "🔒 L'atelier s'ouvre dans un onglet isolé. Il utilise les mêmes fournisseurs que la sidebar — votre clé OpenRouter lui est transmise pour vous, sans la ressaisir. URL configurable dans <b>Réglages → Atelier de code</b>.",

  "confirm.allow": "Autoriser",
  "confirm.deny": "Refuser",
  "chip.thinking": "💭 Réflexion",
  "chip.thinkingTitle": "Afficher le raisonnement du modèle",
  "chip.webTitle": "Recherche web (Perplexity / OpenRouter / Claude) — réglable dans ⚙",
  "chip.pageTitle": "L'IA voit la page consultée",
  "translate.to": "Traduire vers",
  "translate.empty": "vide = la page",
  "improve.style": "Style d'écriture",
  "image.size": "Taille",
  "image.sizeTitle": "Tailles supportées selon le modèle. Le 4K/1440p natif n'existe pas sur les modèles d'image actuels — agrandissez l'image après coup.",
  "model.connect": "🔌 Se connecter à un fournisseur",
  "composer.ph": "Écrivez un message…",
  "send.title": "Envoyer",
  "stop.title": "Stop",

  "rail.chat": "Chat",
  "rail.agent": "Agent",
  "rail.translate": "Traduire",
  "rail.improve": "Améliorer",
  "rail.image": "Image",
  "rail.terminal": "Terminal",
  "rail.code": "Code",
  "rail.chatTitle": "Chat",
  "rail.agentTitle": "Agent — l'IA agit dans le navigateur",
  "rail.translateTitle": "Traduire",
  "rail.improveTitle": "Améliorer un texte",
  "rail.imageTitle": "Générer une image",
  "rail.terminalTitle": "Terminal (agent de code en ligne de commande)",
  "rail.codeTitle": "Atelier de code IA (preview, Expo Go…)",
  "workspace.label": "Espaces de travail",

  "ph.chat": "Écrivez un message…",
  "ph.agent": "Décrivez une tâche à réaliser dans le navigateur…",
  "ph.translate": "Texte à traduire (ou laissez vide pour la page)…",
  "ph.improve": "Texte à améliorer (ou laissez vide pour la sélection)…",
  "ph.image": "Décrivez l'image à générer…",
  "ph.terminal": "Demandez du code, une commande, un script…",

  "cost.free": "gratuit",
  "model.choose": "— Choisir un modèle —",
  "model.current": "✓ Modèle actuel",
  "model.keyMissing": " (clé manquante)",
  "image.connectOpenAI": "— Connectez OpenAI pour générer des images —",
  "image.connectAny": "— Connectez un fournisseur d'images (ex. OpenAI) —",
  "image.tierDefault": "tarif selon le modèle",

  "or.connecting": "Connexion…",
  "or.connected": "✓ Connecté à OpenRouter — choisissez un modèle gratuit ci-dessous.",
  "or.connectErr": "Connexion OpenRouter : {msg}",

  "time.now": "à l'instant",
  "time.min": "{n} min",
  "time.hour": "{n} h",
  "time.day": "{n} j",
  "history.empty": "Aucune conversation enregistrée.",
  "history.untitled": "Conversation",
  "delete.title": "Supprimer",

  "compare.with": "⚖ Comparer avec",
  "compare.btn": "Comparer",
  "err.keyMissingFor": "Clé manquante pour {label}.",
  "msg.interrupted": "■ Interrompu.",
  "err.generic": "Erreur : {msg}",
  "err.image": "Image : {msg}",
  "confirm.prompt": "Autoriser l'action « {name} » ? {input}",
  "err.noKeyModel": "Aucune clé pour ce modèle. Cliquez « Connexion / Ajouter un fournisseur » (⚙).",
  "badge.web": "🌐 Recherche web · {label} · {model}",
  "badge.agent": "🤖 Agent · {label} · {model}",

  "label.translate": "🌐 Traduire",
  "label.translatePage": "🌐 Traduire la page",
  "label.translateSel": "🌐 Traduire la sélection",
  "prompt.translate": "Traduis en {lang}, en gardant la mise en forme :\n\n{text}",
  "err.nothingToTranslateInput": "Rien à traduire (saisissez du texte ou ouvrez une page).",
  "err.nothingToTranslate": "Rien à traduire.",
  "err.typeOrSelect": "Saisissez ou sélectionnez du texte.",
  "improve.only": "Renvoie uniquement le résultat, sans préambule.",
  "improve.textLabel": "Texte :",
  "err.describeImage": "Décrivez l'image à générer.",
  "label.summarizePage": "📝 Résumer la page",
  "prompt.summarizePage": "Résume cette page en points clés (titre, idées principales, conclusion).",
  "err.noReadablePage": "Aucune page lisible à résumer.",
  "label.summarizeSel": "📝 Résumer la sélection",
  "prompt.summarizeSel": "Résume en points clés :\n\n{text}",
  "err.nothingToSummarize": "Rien à résumer.",
  "label.improve": "✨ Améliorer le texte",
  "prompt.improve": "Améliore ce texte (clarté, style, grammaire), garde la langue d'origine, renvoie uniquement le texte réécrit :\n\n{text}",
  "err.selectToImprove": "Sélectionne d'abord du texte à améliorer.",
  "label.explain": "💡 Expliquer",
  "prompt.explain": "Explique simplement et clairement :\n\n{text}",
  "err.nothingToExplain": "Rien à expliquer.",
  "label.reply": "✉️ Brouillon de réponse",
  "prompt.reply": "Rédige une réponse polie et adaptée (en {lang}) au message/email suivant. Propose un brouillon prêt à relire et envoyer (je vérifierai avant l'envoi) :\n\n{text}",
  "err.noMessageToReply": "Aucun message à qui répondre.",
  "err.imageKeyMissing": "Clé manquante pour la génération d'images ({label}).",
  "image.generating": "Génération de l'image…",

  "size.256x256": "Favicon — carré 256² (DALL·E 2)",
  "size.512x512": "Petite icône — carré 512² (DALL·E 2)",
  "size.1024x1024": "Logo / carré HD — 1024² (tous modèles)",
  "size.1536x1024": "Paysage 3:2 — 1536×1024 (gpt-image-1)",
  "size.1024x1536": "Portrait 2:3 — 1024×1536 (gpt-image-1)",
  "size.1792x1024": "Paysage 16:9 « HD » — 1792×1024 (DALL·E 3)",
  "size.1024x1792": "Portrait 9:16 « HD » — 1024×1792 (DALL·E 3)",

  "preset.improve": "Améliorer (clarté & grammaire)",
  "preset.shorten": "Raccourcir",
  "preset.expand": "Développer / détailler",
  "preset.simplify": "Simplifier",
  "preset.formal": "Plus formel",
  "preset.friendly": "Plus amical",
  "preset.marketing": "Marketing / copywriting",
  "preset.newsletter": "Newsletter",
  "preset.email": "Email professionnel",
  "preset.linkedin": "Post LinkedIn",
  "preset.tweet": "Post X / Tweet",
  "preset.blog": "Article de blog",
  "preset.academic": "Académique",
  "preset.storytelling": "Storytelling",
  "presetPrompt.improve": "Améliore ce texte : clarté, style, grammaire et fluidité, en gardant la langue et l'intention d'origine.",
  "presetPrompt.shorten": "Raccourcis ce texte en gardant l'essentiel et le sens.",
  "presetPrompt.expand": "Développe et enrichis ce texte avec plus de détails et d'exemples pertinents.",
  "presetPrompt.simplify": "Reformule ce texte de façon simple et accessible (niveau grand public).",
  "presetPrompt.formal": "Réécris ce texte dans un registre formel et professionnel.",
  "presetPrompt.friendly": "Réécris ce texte sur un ton chaleureux, amical et accessible.",
  "presetPrompt.marketing": "Réécris ce texte comme un copywriter : accrocheur, orienté bénéfices, avec un appel à l'action clair.",
  "presetPrompt.newsletter": "Transforme ce texte en section de newsletter engageante : titre accrocheur, ton conversationnel, et une conclusion incitative.",
  "presetPrompt.email": "Rédige un email professionnel clair et poli à partir de ce contenu (objet + corps + formule de politesse).",
  "presetPrompt.linkedin": "Transforme ce texte en post LinkedIn percutant : accroche forte, paragraphes courts, et quelques hashtags pertinents.",
  "presetPrompt.tweet": "Condense ce texte en un post X percutant (≤ 280 caractères), avec éventuellement 1–2 hashtags.",
  "presetPrompt.blog": "Développe ce texte en article de blog structuré (titre, intertitres, intro, conclusion) au ton informatif.",
  "presetPrompt.academic": "Réécris ce texte dans un style académique, précis et neutre, avec un vocabulaire soutenu.",
  "presetPrompt.storytelling": "Réécris ce texte sous forme de narration immersive (storytelling) qui capte l'attention.",

  "lang.French": "Français",
  "lang.English": "Anglais",
  "lang.Spanish": "Espagnol",
  "lang.German": "Allemand",
  "lang.Italian": "Italien",
  "lang.Portuguese": "Portugais",
  "lang.Dutch": "Néerlandais",
  "lang.Arabic": "Arabe",
  "lang.Chinese": "Chinois",
  "lang.Japanese": "Japonais",
  "lang.Russian": "Russe",
};

const DICT = { en: EN, fr: FR };

export function setLang(l) {
  lang = l === "fr" ? "fr" : "en";
}

export function getLang() {
  return lang;
}

// Translate `key` for the active language, falling back to English then the key
// itself. `vars` fills {name} placeholders.
export function t(key, vars) {
  const table = DICT[lang] || EN;
  let s = table[key];
  if (s == null) s = EN[key];
  if (s == null) s = key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, n) => (vars[n] != null ? vars[n] : m));
  }
  return s;
}

// Fill annotated static markup. Supported attributes:
//   data-i18n        → textContent
//   data-i18n-html   → innerHTML (for strings containing markup)
//   data-i18n-title  → title attribute
//   data-i18n-ph     → placeholder attribute
export function applyDom(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
}
