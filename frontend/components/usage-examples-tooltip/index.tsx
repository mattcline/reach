'use client'

import React from 'react';

import { Price } from 'lib/types/billing';

export function UsageExamplesTooltip({ price }: { price: Price }) {
  const examples = price.usageExamples;

  return (
    <div>
      <div className="grid gap-4 text-sm font-bold mb-2 text-white border-b pb-2" style={{gridTemplateColumns: 'auto 1fr'}}>
        <span>Agent</span>
        <span className="text-right">Example Usage</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 italic">Mix & match credits across any agents</p>
      <div className="space-y-2">
        {examples.map((example, index) => (
          <div key={index} className="grid gap-4 text-sm" style={{gridTemplateColumns: 'auto 1fr'}}>
            <span className="text-muted-foreground">{example.agent}</span>
            <span className="text-muted-foreground text-right">~{example.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}