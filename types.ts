
export enum Priority {
  LOW = 'Thấp',
  MEDIUM = 'Trung bình',
  HIGH = 'Cao'
}

/* Add BookStatus enum */
export enum BookStatus {
  UNREAD = 'Chưa đọc',
  READING = 'Đang đọc',
  SUMMARIZED = 'Đã tóm tắt'
}

export interface DeepKnowledgePart {
  partTitle: string;
  content: string;
}

export interface ExtendedKeyIdea {
  name: string;
  description: string;
  protocol: string;
}

export interface DetailedBookAnalysis {
  bookMeta: {
    estimatedReadingTime: number;
    difficultyLevel: string;
    bookType: string;
  };
  centralThesis: {
    oneLiner: string;
    expanded: string;
    authorPerspective?: string;
  };
  knowledgeArchitecture: DeepKnowledgePart[];
  ideaSystem: ExtendedKeyIdea[];
  criticalAnalysis: {
    strengths: string[];
    weaknesses: string[];
    counterArguments: string[];
  };
  personalizedInsights: {
    relevanceScore: number;
    relevanceExplanation: string;
    customActionPlan: { timeframe: string; action: string; expectedOutcome: string; completed?: boolean }[];
  };
  executiveSummary: {
    forBusy: string;
    ifOnlyOneThing: string;
  };
  _metadata?: any;
}

export interface KeyIdea {
  id: string;
  description: string;
  importance: 1 | 2 | 3;
  quote?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isSummarized: boolean;
  /* Add missing fields to Book interface */
  isReading: boolean;
  readingTimeMinutes?: number;
  user_ids: string[];
  tags: string[];
  priority: Priority;
  addedAt: number;
  centralThesis?: string;
  toc?: string[];
  analysis?: DetailedBookAnalysis;
  keyIdeas: KeyIdea[];
  models: string[];
  checklist: (string | { task: string; completed: boolean })[];
  coverImage?: string;
  savesCount?: number;
  finalSummary?: any;
}
