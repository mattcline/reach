// @ts-ignore
import { IOffer } from './offer';


export interface Action {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  journey: string;
  source?: IOffer | 'Source';
}

export interface ActionsContext {
  actions: Action[] | null;
  setActions: (actions: Action[]) => void;
  getActions: () => void;
}