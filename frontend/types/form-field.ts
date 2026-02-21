export interface FormField {
  name: string;
  title: string;
  type: string;
  placeholder?: string;
  required: boolean;
  required_message?: string;
  description?: string;
  direction?: string; // "row" | "column";
  choices?: any[] | null;
  blank?: boolean;
  max_length?: number;
};