export type LegalItem =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "definition"; term: string; definition: string };

export type LegalSection = {
  id: string;
  title: string;
  body: LegalItem[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};
