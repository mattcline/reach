'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { makeRequest, STATUS } from 'lib/utils/request'
import { BACKEND_URL } from 'lib/constants'
import { Skeleton } from 'components/ui/skeleton'

interface UsageInfo {
  used: number
  allowed: number
  remaining: number
  billing_period_end: string
  days_until_reset: number
}

interface UsageDisplayProps {
  className?: string
}

export function UsageDisplay({ className = '' }: UsageDisplayProps) {
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      setLoading(true)
      const response = await makeRequest({
        url: `${BACKEND_URL}/billing/usage/`,
        method: 'GET',
        accept: 'application/json'
      })

      if (response.status === STATUS.HTTP_200_OK) {
        setUsage(response.data as UsageInfo)
        setError(null)
      } else {
        setError('Failed to load usage information')
      }
    } catch (err) {
      setError('Network error loading usage')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="w-full h-3 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    )
  }

  if (error || !usage) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${className}`}>
        {error || 'Failed to load usage'}
      </div>
    )
  }

  const percentage = usage.allowed > 0 ? (usage.used / usage.allowed) * 100 : 0
  const isNearLimit = percentage > 80
  const isAtLimit = usage.used >= usage.allowed

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          Credits Usage
        </span>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>{usage.used} credits used</span>
          <span>{usage.allowed} total credits</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        {usage.remaining > 0 ? (
          <span>{usage.remaining} credits remaining this month (resets in {usage.days_until_reset} day{usage.days_until_reset !== 1 ? 's' : ''})</span>
        ) : (
          <div className="text-red-600 font-medium">
            Credit limit exceeded (resets in {usage.days_until_reset} day{usage.days_until_reset !== 1 ? 's' : ''})
          </div>
        )}
      </div>

      {(isAtLimit || isNearLimit) && (
        <div className="mt-3 pt-3 border-t">
          <Link
            href="/pricing"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Upgrade plan →
          </Link>
        </div>
      )}
    </div>
  )
}