'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner';

import { useUser } from 'context/user'
import { makeRequest, STATUS } from 'lib/utils/request'
import { BACKEND_URL } from 'lib/constants'

import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import { Skeleton } from 'components/ui/skeleton'

import { UsageDisplay } from 'components/usage-display'

export function SubscriptionManager() {
  const { subscription } = useUser();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const response = await makeRequest({
        url: `${BACKEND_URL}/billing/create-portal-session/`,
        method: 'POST',
        accept: 'application/json'
      })

      if (response.status === STATUS.HTTP_200_OK) {
        window.location.href = (response.data as { url: string }).url
      }
    } catch (err) {
      console.error('Error creating portal session:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  if (subscription.loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-6 w-40 mb-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-20" />
        </CardContent>
      </Card>
    )
  }

  if (subscription.error) {
    toast(subscription.error.message)
  }

  const renderNoSubscriptionState = () => (
    <Card>
      <CardHeader>
        <CardTitle>No Active Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          You don&apos;t have an active subscription yet. Choose a plan to get started with agents.
        </p>
        <Link
          href="/pricing"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Choose a plan
        </Link>
      </CardContent>
    </Card>
  )

  const renderActiveSubscriptionCard = () => {
    if (!subscription.data) {
      return null
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-row gap-2">
            <CardTitle className="text-xl font-semibold mb-1">
              {subscription.data.product_name} Plan
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-green-600 border-green-200">
                {subscription.data.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subscription.data && (
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleManageBilling}
                disabled={portalLoading}
              >
                {portalLoading ? 'Loading...' : 'Manage'}
              </Button>
              <UsageDisplay />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {!subscription.data ? renderNoSubscriptionState() : renderActiveSubscriptionCard()}
    </div>
  )
}