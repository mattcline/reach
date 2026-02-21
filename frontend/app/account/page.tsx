'use client';

import React from 'react';

import { useUser } from 'context/user';

import { AuthenticationRequired } from 'components/auth-required';
import { DeleteAccount } from 'components/delete-account';
import { EmailPreferences } from 'components/settings/email-preferences';
import { SubscriptionManager } from 'components/subscription-manager';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { AccountInformation } from 'components/account-information';

export default function AccountPage() {
  const { user } = useUser()

  if (!user) {
    return <AuthenticationRequired message="Please log in to access your account." />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Account</h1>
        <p className="text-gray-600">Manage your subscriptions and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex flex-col lg:flex-1 gap-4">
          <SubscriptionManager />
          <DeleteAccount />
        </div>

        <div className="flex flex-col space-y-6 lg:w-80">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gap-3">
                <label>Email</label>
                <p className="text-sm">{user.email}</p>
              </div>
              <AccountInformation />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Email Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailPreferences />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}