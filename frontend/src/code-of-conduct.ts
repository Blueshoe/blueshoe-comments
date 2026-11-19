export interface CodeOfConductContent {
  title: string;
  subtitle: string;
  valuesTitle: string;
  values: string;
  behaviorTitle: string;
  behaviors: string[];
  moderationTitle: string;
  removalReasons: string[];
  positiveTitle: string;
  positives: string[];
  contactTitle: string;
  contactText: string;
  closeBtn: string;
}

export const CODE_OF_CONDUCT_I18N: Record<string, CodeOfConductContent> = {
  en: {
    title: "Blueshoe Discussion Platform",
    subtitle: "Code of Conduct & Community Guidelines",
    valuesTitle: "Our Values",
    values:
      "We strive to create an open, inclusive, and respectful space for diverse perspectives and meaningful discussions. This community welcomes people of all backgrounds, identities, and viewpoints, while maintaining standards that ensure productive dialogue.",
    behaviorTitle: "Expected Behavior",
    behaviors: [
      "Express disagreement respectfully and focus on ideas rather than individuals.",
      "Consider different perspectives and engage in good-faith discussions.",
      "Share relevant experiences and knowledge that contribute to the conversation.",
      "Use clear, accessible language and avoid unnecessary jargon.",
      "Acknowledge when you've made a mistake and be open to learning.",
    ],
    moderationTitle: "Content Moderation Guidelines",
    removalReasons: [
      "Hate speech, discrimination, or prejudice based on race, gender, religion, sexual orientation, disability, or age.",
      "Harassment, personal attacks, insults, threats, stalking, or doxxing.",
      "Misinformation, harmful conspiracy theories, or promotion of dangerous/illegal activities.",
      "Spam, commercial solicitation, off-topic derailing, flooding, or trolling.",
      "Plagiarism or intellectual property violations.",
    ],
    positiveTitle: "Encouraging Positive Engagement",
    positives: [
      "Sharing personal and professional engineering experiences.",
      "Asking clarifying questions and providing constructive feedback.",
      "Supporting technical claims with credible sources and documentation.",
      "Helping others understand complex technical concepts.",
    ],
    contactTitle: "Contact & Appeals",
    contactText:
      "All comments are synchronously screened by Gemini 2.5 Flash AI and human moderators. For inquiries or appeals, contact us at blog@blueshoe.io.",
    closeBtn: "Close",
  },
  de: {
    title: "Blueshoe Diskussionsplattform",
    subtitle: "Verhaltenskodex (Code of Conduct) & Community-Richtlinien",
    valuesTitle: "Unsere Werte",
    values:
      "Wir schaffen einen offenen, integrativen und respektvollen Raum für vielfältige Perspektiven und konstruktive Diskussionen. Diese Community heißt alle Hintergründe, Identitäten und Standpunkte willkommen und wahrt gleichzeitig Standards für produktiven Austausch.",
    behaviorTitle: "Erwartetes Verhalten",
    behaviors: [
      "Meinungsverschiedenheiten respektvoll ausdrücken und sich auf Ideen statt Personen fokussieren.",
      "Verschiedene Blickwinkel berücksichtigen und konstruktiv diskutieren.",
      "Relevante Erfahrungen und technisches Wissen teilen.",
      "Verständliche Sprache nutzen und unnötigen Jargon vermeiden.",
      "Fehler eingestehen und offen für Neues bleiben.",
    ],
    moderationTitle: "Moderationsrichtlinien",
    removalReasons: [
      "Hassrede, Diskriminierung oder Vorurteile bzgl. Herkunft, Geschlecht, Religion, sexueller Orientierung, Behinderung oder Alter.",
      "Belästigung, persönliche Angriffe, Beleidigungen, Drohungen oder Doxxing.",
      "Falschinformationen, schädliche Verschwörungserzählungen oder Aufforderung zu gefährlichen/illegalen Handlungen.",
      "Spam, Werbung, Off-Topic-Beiträge, Flooding oder Trolling.",
      "Plagiate oder Urheberrechtsverletzungen.",
    ],
    positiveTitle: "Positives Engagement",
    positives: [
      "Teilen praktischer Erfahrungen aus Software- und Cloud-Projekten.",
      "Konstruktive Fragen stellen und Feedback geben.",
      "Behauptungen mit Quellen und Dokumentationen untermauern.",
      "Anderen beim Verstehen komplexer Themen helfen.",
    ],
    contactTitle: "Kontakt & Einsprüche",
    contactText:
      "Kommentare werden synchron durch Gemini 2.5 Flash KI und Moderatoren geprüft. Bei Fragen oder Einsprüchen erreichst du uns unter blog@blueshoe.io.",
    closeBtn: "Schließen",
  },
};
