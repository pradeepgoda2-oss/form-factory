export type QuestionType =
  | 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number' | 'date';

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
  required?: boolean;
  options?: Option[];
}

export interface FormDef {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: Question[];
}
