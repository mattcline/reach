'use client';

import React from 'react';

import { PricingCard } from 'components/pricing-card';

const PRICES = [
  {
    name: 'Starter',
    price: '$20',
    period: 'month' as const,
    description: '20 AI credits',
    features: ['20 AI credits', '1 GB of storage'],
    lookupKey: 'starter_monthly',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    usageExamples: [
      { agent: 'Maps', description: '5 image generations' },
      { agent: 'Docs', description: '100 completions' }
    ]
  },
  {
    name: 'Pro',
    price: '$100',
    period: 'month' as const,
    description: '100 AI credits',
    features: ['100 AI credits', '10 GB of storage'],
    lookupKey: 'pro_monthly',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    usageExamples: [
      { agent: 'Maps', description: '25 image generations' },
      { agent: 'Docs', description: '500 messages' }
    ]
  },
  {
    name: 'Max',
    price: '$200',
    period: 'month' as const,
    description: '200 AI credits',
    features: ['200 AI credits', '50 GB of storage'],
    lookupKey: 'max_monthly',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MAX_MONTHLY_PRICE_ID || '',
    usageExamples: [
      { agent: 'Maps', description: '50 image generations' },
      { agent: 'Docs', description: '1000 messages' }
    ]
  }
]

export default function PricingPage() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <div className="mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            All plans include access to all agents.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {PRICES.map((price) => (
            <PricingCard
              key={price.name}
              price={price}
            />
          ))}
        </div>
      </div>
    </div>
  )
}