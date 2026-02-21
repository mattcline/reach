'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useDialog } from 'context/dialog';
import { useUser } from 'context/user';

import { ConfirmDialog } from 'components/confirm-dialog';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';

export function DeleteAccount() {
  const { user, setUser } = useUser();
  const { setDialog } = useDialog();
  const router = useRouter();

  const handleDelete = useCallback(async () => {
    if (!user) return;
    const url = `${BACKEND_URL}/users/delete/`;
    const { data, status } = await makeRequest({ url, method: 'DELETE' });
    if (status === STATUS.HTTP_204_NO_CONTENT) {
      console.log("User deleted");
      setUser(null);
    }

    router.replace(`/`);
  }, [user, setUser, router]);

  const confirmBeforeDelete = async () => {
    setDialog(
      <ConfirmDialog
        action="delete your account"
        toastMessage="Deleted account."
        onConfirm={handleDelete}
        onCancel={async () => {}}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Account</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={confirmBeforeDelete}>Delete your account</Button>
      </CardContent>
    </Card>
  );
}