import { ButtonType } from './button';

export interface Option {
  text: string;
  onClick: () => void;
  icon?: React.ReactNode;
  buttonType?: ButtonType;
  className?: string;
}