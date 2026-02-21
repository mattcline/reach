'use client'

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CircleHelp } from 'lucide-react'

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useUser } from 'context/user';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from 'components/ui/hover-card';

import { UsageExamplesTooltip } from 'components/usage-examples-tooltip';

import { Price } from 'lib/types/billing';

export function PricingCard({ price }: { price: Price }) {
  const router = useRouter();
  const { user, subscription } = useUser();
  const isCurrentPlan = subscription?.data?.product_name === price.name;

  let button = null;

  if (isCurrentPlan) {
    button = (
      <Button className="w-full hover:cursor-not-allowed" variant="outline" disabled>
        Current Plan
      </Button>
    )
  } else if (subscription.data !== null) {
    button = (
      <Button
        className="w-full"
        variant="secondary"
        onClick={async () => {
          router.push(`/account`);
        }}
      >
        Manage in Account
      </Button>
    )
  } else {
    button = (
      <Button
        className="w-full"
        variant="secondary"
        onClick={async () => {
          if (!user) {
            toast.error("Please log in to subscribe to a plan.");
            return;
          }

          const { status, data } = await makeRequest({
            url: `${BACKEND_URL}/payments/create-checkout-session/`,
            method: 'POST',
            body: {
              lookup_key: price.lookupKey
            },
            accept: 'application/json'
          });

          if (status === STATUS.HTTP_200_OK && typeof data === 'object') {
            const { url } = data as { url: string };
            if (url) {
              router.push(url);
            }
          }
        }}
      >
        {`Get ${price.name}`}
      </Button>
    )
  }

  return (
    <Card className={`
      relative transition-all hover:shadow-md
      ${isCurrentPlan ? 'bg-blue-900/10' : ''}
    `}>
      
      <CardHeader className="text-center">
        <CardTitle className="text-lg">
          {price.name}
        </CardTitle>
        
        <div className="mb-2">
          <span className="text-3xl font-bold">
            {price.price}
          </span>
          {price.period && (
            <span className="text-muted-foreground ml-1">
              /{price.period}
            </span>
          )}
        </div>
        
        {/* <CardDescription>
          {price.description}
        </CardDescription> */}
      </CardHeader>
        
      <CardContent>
        <div className="space-y-3">
          {price.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
              <span className="flex-1">{feature}</span>
              {feature.includes('AI credits') && (
                <HoverCard openDelay={200}>
                  <HoverCardTrigger asChild>
                    <CircleHelp className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help ml-1" />
                  </HoverCardTrigger>
                  <HoverCardContent side="right">
                    <UsageExamplesTooltip price={price} />
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {button}
      </CardFooter>
    </Card>
  )
}