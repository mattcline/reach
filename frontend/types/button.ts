export type ButtonType = 'approve' | 'reject' | 'secondary'

export interface ButtonProps {
  children?: React.ReactNode;
  pathname: string;
  type?: ButtonType;
  query?: object;
  className?: string;
  replace?: boolean;
  onClick?: () => void;
}