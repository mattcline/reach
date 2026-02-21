export interface Rules {
  required?: string | boolean;
  maxLength?: { value: number, message: string };
}