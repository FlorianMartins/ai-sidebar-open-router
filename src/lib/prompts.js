// Built-in starter prompts for the Prompt Library. Bilingual (en/fr) and colocated here (not in the
// i18n dict) so the library stays self-contained. User-created prompts live in settings.promptLibrary;
// these are read-only templates that can be inserted and favorited but not edited/deleted.
// Categories drive the filter chips; labels are localized via i18n (plibcat.*).

export const PROMPT_CATEGORIES = ["writing", "code", "cybersec", "marketing", "productivity", "learning", "business", "data"];

export const BUILTIN_PROMPTS = [
  // ----- Writing -----
  { id: "b.write.email", category: "writing",
    title: { en: "Professional email", fr: "E-mail professionnel" },
    text: { en: "Write a clear, professional and friendly email based on the following. Keep it concise and well-structured (subject line, short body, polite sign-off):\n\n", fr: "Rédige un e-mail clair, professionnel et courtois à partir de ce qui suit. Concis et bien structuré (objet, corps court, formule de politesse) :\n\n" } },
  { id: "b.write.rephrase", category: "writing",
    title: { en: "Rewrite more clearly", fr: "Reformuler plus clairement" },
    text: { en: "Rewrite the following text to be clearer, more natural and well-structured, keeping the original language, meaning and tone:\n\n", fr: "Réécris le texte suivant pour qu'il soit plus clair, plus naturel et mieux structuré, en gardant la langue, le sens et le ton d'origine :\n\n" } },
  { id: "b.write.reply", category: "writing",
    title: { en: "Draft a reply", fr: "Rédiger une réponse" },
    text: { en: "Draft a polite, well-judged reply to the message below. Match its tone and address each point:\n\n", fr: "Rédige une réponse polie et bien pensée au message ci-dessous. Adapte le ton et traite chaque point :\n\n" } },

  // ----- Code -----
  { id: "b.code.review", category: "code",
    title: { en: "Review this code", fr: "Relire ce code" },
    text: { en: "Review the following code. Point out bugs, edge cases, security issues and readability problems, then suggest concrete improvements with short examples:\n\n```\n\n```", fr: "Relis le code suivant. Signale les bugs, cas limites, problèmes de sécurité et de lisibilité, puis propose des améliorations concrètes avec de courts exemples :\n\n```\n\n```" } },
  { id: "b.code.explain", category: "code",
    title: { en: "Explain this code", fr: "Expliquer ce code" },
    text: { en: "Explain what the following code does, step by step and in plain language, then note anything surprising or risky:\n\n```\n\n```", fr: "Explique ce que fait le code suivant, étape par étape et en langage simple, puis signale tout ce qui est surprenant ou risqué :\n\n```\n\n```" } },
  { id: "b.code.tests", category: "code",
    title: { en: "Write unit tests", fr: "Écrire des tests unitaires" },
    text: { en: "Write thorough unit tests for the following code, covering the main paths and edge cases. Use the idiomatic testing framework for the language:\n\n```\n\n```", fr: "Écris des tests unitaires complets pour le code suivant, couvrant les cas principaux et limites. Utilise le framework de test idiomatique du langage :\n\n```\n\n```" } },
  { id: "b.code.regex", category: "code",
    title: { en: "Build a regex", fr: "Construire une regex" },
    text: { en: "Write a regular expression that matches the following requirement, explain each part, and give 3 matching and 3 non-matching examples:\n\n", fr: "Écris une expression régulière correspondant au besoin suivant, explique chaque partie, et donne 3 exemples qui correspondent et 3 qui ne correspondent pas :\n\n" } },

  // ----- Defensive cybersecurity -----
  { id: "b.cyber.harden", category: "cybersec",
    title: { en: "Harden a configuration", fr: "Durcir une configuration" },
    text: { en: "Act as a DEFENSIVE security engineer. Review the configuration below and recommend concrete hardening steps (least privilege, secure defaults, headers, patching). Defensive only — no exploitation:\n\n", fr: "Agis comme ingénieur sécurité DÉFENSIVE. Analyse la configuration ci-dessous et recommande des mesures de durcissement concrètes (moindre privilège, valeurs sûres par défaut, en-têtes, correctifs). Défensif uniquement — aucune exploitation :\n\n" } },
  { id: "b.cyber.threatmodel", category: "cybersec",
    title: { en: "Threat-model a feature", fr: "Modéliser les menaces" },
    text: { en: "Threat-model the following feature/system (STRIDE). List assets, trust boundaries, plausible threats and defensive mitigations. Defensive scope only:\n\n", fr: "Modélise les menaces de la fonctionnalité/du système suivant (STRIDE). Liste les actifs, les frontières de confiance, les menaces plausibles et les mitigations défensives. Périmètre défensif uniquement :\n\n" } },
  { id: "b.cyber.logs", category: "cybersec",
    title: { en: "Triage suspicious logs", fr: "Trier des logs suspects" },
    text: { en: "Analyze the following logs for signs of misconfiguration or malicious activity. Explain what stands out, the likely cause, and defensive next steps. Defensive only:\n\n", fr: "Analyse les logs suivants pour repérer des signes de mauvaise configuration ou d'activité malveillante. Explique ce qui ressort, la cause probable et les mesures défensives à prendre. Défensif uniquement :\n\n" } },

  // ----- Marketing -----
  { id: "b.mkt.landing", category: "marketing",
    title: { en: "Landing page copy", fr: "Texte de landing page" },
    text: { en: "Write conversion-focused landing-page copy for the product below: a strong headline, subheadline, 3 benefit bullets and a clear call to action. Benefit-driven, no fluff:\n\n", fr: "Rédige un texte de landing page orienté conversion pour le produit ci-dessous : un titre fort, un sous-titre, 3 puces bénéfices et un appel à l'action clair. Orienté bénéfices, sans blabla :\n\n" } },
  { id: "b.mkt.social", category: "marketing",
    title: { en: "Social posts (5 variants)", fr: "Posts réseaux (5 variantes)" },
    text: { en: "Write 5 short, scroll-stopping social posts about the following, each with a different angle (hook-driven, benefit, story, question, bold claim). Add 2-3 relevant hashtags each:\n\n", fr: "Rédige 5 posts courts et accrocheurs sur le sujet suivant, chacun avec un angle différent (accroche, bénéfice, histoire, question, affirmation forte). Ajoute 2-3 hashtags pertinents à chacun :\n\n" } },
  { id: "b.mkt.subject", category: "marketing",
    title: { en: "Email subject lines", fr: "Objets d'e-mail" },
    text: { en: "Write 10 high-open-rate email subject lines for the following campaign, mixing curiosity, urgency and value. Keep them under 60 characters:\n\n", fr: "Rédige 10 objets d'e-mail à fort taux d'ouverture pour la campagne suivante, mêlant curiosité, urgence et valeur. Moins de 60 caractères chacun :\n\n" } },

  // ----- Productivity -----
  { id: "b.prod.summarize", category: "productivity",
    title: { en: "Summarize + action items", fr: "Résumé + actions" },
    text: { en: "Summarize the following into a one-line TL;DR, key points as bullets, and a list of concrete action items with owners if mentioned:\n\n", fr: "Résume ce qui suit en un TL;DR d'une ligne, des points clés en puces, et une liste d'actions concrètes avec les responsables si mentionnés :\n\n" } },
  { id: "b.prod.plan", category: "productivity",
    title: { en: "Break down into a plan", fr: "Découper en plan d'action" },
    text: { en: "Break the following goal into a clear, prioritized step-by-step plan with milestones and a rough time estimate per step:\n\n", fr: "Découpe l'objectif suivant en un plan d'action clair et priorisé, étape par étape, avec jalons et estimation de temps par étape :\n\n" } },

  // ----- Learning -----
  { id: "b.learn.eli", category: "learning",
    title: { en: "Explain simply (ELI5→expert)", fr: "Expliquer simplement" },
    text: { en: "Explain the following concept at three levels: to a curious 12-year-old, to a smart beginner, and to a practitioner. Use a concrete analogy for each:\n\n", fr: "Explique le concept suivant à trois niveaux : à un enfant curieux de 12 ans, à un débutant motivé, et à un praticien. Utilise une analogie concrète à chaque niveau :\n\n" } },
  { id: "b.learn.quiz", category: "learning",
    title: { en: "Quiz me on a topic", fr: "Quiz sur un sujet" },
    text: { en: "Quiz me on the following topic: ask 5 progressively harder questions ONE AT A TIME, wait for my answer, then give feedback before the next one:\n\n", fr: "Interroge-moi sur le sujet suivant : pose 5 questions de difficulté croissante UNE À LA FOIS, attends ma réponse, puis donne un retour avant la suivante :\n\n" } },

  // ----- Writing (more) -----
  { id: "b.write.cover", category: "writing",
    title: { en: "Cover letter", fr: "Lettre de motivation" },
    text: { en: "Write a compelling, tailored cover letter for the role and background below. Confident but not arrogant, concrete, one page:\n\n", fr: "Rédige une lettre de motivation percutante et sur-mesure pour le poste et le profil ci-dessous. Assurée sans arrogance, concrète, une page :\n\n" } },
  { id: "b.write.notes", category: "writing",
    title: { en: "Clean up meeting notes", fr: "Mettre au propre des notes de réunion" },
    text: { en: "Turn the following raw meeting notes into a clean summary: decisions, action items (with owners), and open questions:\n\n", fr: "Transforme les notes de réunion brutes suivantes en compte-rendu clair : décisions, actions (avec responsables) et questions ouvertes :\n\n" } },

  // ----- Code (more) -----
  { id: "b.code.debug", category: "code",
    title: { en: "Debug an error", fr: "Déboguer une erreur" },
    text: { en: "Help me debug this. Here is the error and the relevant code. Explain the likely root cause and give the smallest fix:\n\n[Error]\n\n\n[Code]\n```\n\n```", fr: "Aide-moi à déboguer ceci. Voici l'erreur et le code concerné. Explique la cause racine probable et donne le correctif minimal :\n\n[Erreur]\n\n\n[Code]\n```\n\n```" } },
  { id: "b.code.refactor", category: "code",
    title: { en: "Refactor for readability", fr: "Refactoriser pour la lisibilité" },
    text: { en: "Refactor the following code for readability and maintainability WITHOUT changing behavior. Explain each change briefly:\n\n```\n\n```", fr: "Refactorise le code suivant pour la lisibilité et la maintenabilité SANS changer le comportement. Explique brièvement chaque changement :\n\n```\n\n```" } },
  { id: "b.code.sql", category: "code",
    title: { en: "Write an SQL query", fr: "Écrire une requête SQL" },
    text: { en: "Write an SQL query for the following requirement. Assume a sensible schema (state your assumptions), keep it readable, and explain it:\n\n", fr: "Écris une requête SQL pour le besoin suivant. Suppose un schéma raisonnable (précise tes hypothèses), garde-la lisible et explique-la :\n\n" } },
  { id: "b.code.commit", category: "code",
    title: { en: "Write a commit message", fr: "Rédiger un message de commit" },
    text: { en: "Write a clear conventional-commits message (and a short body if useful) for the following diff/change:\n\n", fr: "Rédige un message de commit clair (format conventional-commits, avec un court corps si utile) pour le diff/changement suivant :\n\n" } },

  // ----- Cybersecurity (more) -----
  { id: "b.cyber.incident", category: "cybersec",
    title: { en: "Incident response plan", fr: "Plan de réponse à incident" },
    text: { en: "Draft a defensive incident-response checklist for the following scenario: containment, eradication, recovery, and lessons learned. Defensive only:\n\n", fr: "Rédige une checklist défensive de réponse à incident pour le scénario suivant : confinement, éradication, rétablissement et retour d'expérience. Défensif uniquement :\n\n" } },
  { id: "b.cyber.phish", category: "cybersec",
    title: { en: "Is this a phishing attempt?", fr: "Est-ce du phishing ?" },
    text: { en: "Assess whether the following email/message is a phishing attempt. List the red flags, the likely intent, and safe next steps. Defensive only:\n\n", fr: "Évalue si l'e-mail/message suivant est une tentative de phishing. Liste les signaux d'alerte, l'intention probable et les actions sûres à prendre. Défensif uniquement :\n\n" } },

  // ----- Marketing (more) -----
  { id: "b.mkt.product", category: "marketing",
    title: { en: "Product description", fr: "Fiche produit" },
    text: { en: "Write a persuasive product description for the following, highlighting benefits over features, with a scannable structure:\n\n", fr: "Rédige une description produit persuasive pour ce qui suit, en mettant les bénéfices avant les caractéristiques, avec une structure lisible en diagonale :\n\n" } },
  { id: "b.mkt.seo", category: "marketing",
    title: { en: "SEO outline", fr: "Plan SEO" },
    text: { en: "Create an SEO-optimized article outline for the following topic: title options, H2/H3 structure, target keywords and a meta description:\n\n", fr: "Crée un plan d'article optimisé SEO pour le sujet suivant : options de titre, structure H2/H3, mots-clés cibles et une meta description :\n\n" } },

  // ----- Business -----
  { id: "b.biz.swot", category: "business",
    title: { en: "SWOT analysis", fr: "Analyse SWOT" },
    text: { en: "Produce a concise SWOT analysis (strengths, weaknesses, opportunities, threats) for the following, then 3 concrete recommendations:\n\n", fr: "Produis une analyse SWOT concise (forces, faiblesses, opportunités, menaces) pour ce qui suit, puis 3 recommandations concrètes :\n\n" } },
  { id: "b.biz.pitch", category: "business",
    title: { en: "Elevator pitch", fr: "Pitch express" },
    text: { en: "Write a crisp 30-second elevator pitch for the following idea/product: the problem, the solution, why now, and the ask:\n\n", fr: "Rédige un pitch express de 30 secondes pour l'idée/le produit suivant : le problème, la solution, pourquoi maintenant, et la demande :\n\n" } },
  { id: "b.biz.email2", category: "business",
    title: { en: "Follow-up email", fr: "E-mail de relance" },
    text: { en: "Write a polite, effective follow-up email for the situation below. Short, with a clear next step and no guilt-tripping:\n\n", fr: "Rédige un e-mail de relance poli et efficace pour la situation ci-dessous. Court, avec une étape suivante claire et sans culpabiliser :\n\n" } },

  // ----- Data -----
  { id: "b.data.analyze", category: "data",
    title: { en: "Analyze this dataset", fr: "Analyser ce jeu de données" },
    text: { en: "Analyze the following data. Describe the main trends, notable outliers and correlations, and suggest 3 useful charts. State your assumptions:\n\n", fr: "Analyse les données suivantes. Décris les grandes tendances, les valeurs aberrantes notables et les corrélations, et propose 3 graphiques utiles. Précise tes hypothèses :\n\n" } },
  { id: "b.data.explain", category: "data",
    title: { en: "Explain a formula/query", fr: "Expliquer une formule/requête" },
    text: { en: "Explain what the following spreadsheet formula or query does, step by step, and suggest a simpler or more robust version:\n\n", fr: "Explique ce que fait la formule de tableur ou la requête suivante, étape par étape, et propose une version plus simple ou plus robuste :\n\n" } },
];

// Resolve a built-in's localized title/text for the given UI lang (fallback to en).
export function builtinText(p, lang) { return (p.text && (p.text[lang] || p.text.en)) || ""; }
export function builtinTitle(p, lang) { return (p.title && (p.title[lang] || p.title.en)) || ""; }
