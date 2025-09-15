export type QuestionType =
  | 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number' | 'date' | 'file';

export interface Option {
  id: string;
  label: string;
  value: string;
}

export interface Question {
  id: string;
  label: string;
  helpText?: string;
  type: QuestionType;
  sortOrder: number;
  required?: boolean;
  options?: Option[];
  fileMultiple?: boolean;
}

export interface FormDef {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: Question[];
}
