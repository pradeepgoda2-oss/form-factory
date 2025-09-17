export type QuestionType =
  | 'text' | 'textarea' | 'radio' | 'checkbox'
  | 'select' | 'number' | 'date' | 'file';

export type Option = { id?: string; label: string; value: string };

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string | null;
  fileMultiple?: boolean | null;
  sortOrder?: number | null;
  options?: Option[];
};

export interface FormDef {
  id: string;
  slug: string;
  title: string;
  description?: string;
  questions: Question[];
}
