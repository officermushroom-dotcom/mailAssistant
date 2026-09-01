export type Mode = "understand" | "reply";
export type Formality = "formal" | "standard" | "casual";
export type Urgency = "normal" | "caution" | "urgent";

export interface EmailHistory {
  id: string;
  createdAt: string;
  userId: string;
  subject: string;
  sender: string;
  body: string;
  quotedEmails: QuotedEmail[];
  mode: Mode;
  result: string;   
}

export interface Todo {
  id: string;
  createdAt: string;
  userId: string;
  content: string;
  completed: boolean;
  sourceEmailId: string | null;
  sourceSubject?: string;
  sourceSender?: string;
  type?: "received" | "user"; // "received" = extracted from email, "user" = manually added
}

export interface GlossaryItem {
  id: string;
  createdAt: string;
  userId: string;
  term: string;
  definition: string;
}

export interface EmailTemplate {
  id: string;
  createdAt: string;
  userId: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

export interface ParsedEmail {
  subject: string;
  sender: string;
  body: string;
}

export interface QuotedEmail {
  id: string;
  date: string;
  sender: string;
  body: string;
  isOpen: boolean;
}

export interface SubPanelTodo {
  id: string;
  text: string;
  checked: boolean;
}

export interface SubPanelData {
  summary: string;
  todos: SubPanelTodo[];
  urgency: Urgency;
  sentiment: string;
  todoMissCheck: string[];
  alternatives: string[];
}

export interface AppState {
  mode: Mode;
  rawInput: string;
  isParsed: boolean;
  newEmail: ParsedEmail;
  quotedEmails: QuotedEmail[];
  includeQuoted: boolean;
  scene: string;
  formality: Formality;
  stylePreset: string;
  outputText: string;
  isLoading: boolean;
  activeAction: string | null;
}
