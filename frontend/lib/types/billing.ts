export interface Subscription {
  product_name: string;
  status: string;
}

interface UsageExample {
  agent: string
  description: string
}

export interface Price {
  name: string;
  price: string;
  period?: 'month' | 'year';
  description: string;
  features: string[];
  lookupKey: string;
  stripePriceId: string;
  usageExamples: UsageExample[];
}