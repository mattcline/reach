export interface JourneyStep {
  completed: boolean;
  started: boolean;
  slug: string;
  step: {
    id: string;
    title: string;
  }
  children: JourneyStep[];
}