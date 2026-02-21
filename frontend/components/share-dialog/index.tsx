
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { BACKEND_URL } from 'lib/constants';
import { makeRequest, STATUS } from 'lib/utils/request';

import { useUser } from 'context/user';
import { useDialog } from 'context/dialog';

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Button } from 'components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from 'components/ui/select';
import { Avatar } from 'components/avatar';

export function ShareDialog({ documentId }: { documentId: string }) {
  const { user } = useUser();
  const { setOpen } = useDialog();

  const [email, setEmail] = useState<string>("");

  const s = (
    <Select>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* <SelectGroup> */}
          {/* <SelectLabel>June 13, 2025</SelectLabel> */}
        <SelectItem value="estts">Owner</SelectItem>
        <SelectItem value="estt">Can edit</SelectItem>
        {/* </SelectGroup> */}
        <SelectItem value="esttz">Can view</SelectItem>

      </SelectContent>
    </Select>
  );

  const inviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const url = `${BACKEND_URL}/documents/${documentId}/share/`;
      const { data, status } = await makeRequest({
        url,
        method: 'POST',
        body: { email },
        accept: 'application/json'
      });
      if (status === STATUS.HTTP_200_OK) {
        toast.success(`Invitation sent to ${email}.`);
      }
    } catch (error) {
      toast.error(`Could not send invite.`);
    } finally {
      setOpen(false);
    }
  }

  return (
    <DialogContent 
      className="flex flex-col"
    >
      <DialogHeader>
        <DialogTitle>Share</DialogTitle>
        {/* <DialogDescription>
          Add new user or edit existing user permissions.
          To add a reviewer, click &quot;Start a Review&quot; instead.
        </DialogDescription> */}
      </DialogHeader>
      <form onSubmit={inviteUser} className="flex flex-col gap-3">
        <Label htmlFor="email">Invite user</Label>
        <div className="flex flex-row gap-3">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {/* { s } */}
          <Button type="submit">Send</Button>
        </div>
      </form>
      {/* <div className="flex flex-col gap-3">
        <Label>All users</Label>
        <div className="flex justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Avatar user={user}/>
            {user?.email} (You)
          </div>
          { s }
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Avatar user={{
            first_name: 'Example',
            last_name: 'User',
            color: 'purple'
          }}/>
          Example User
        </div>
      </div> */}
      {/* <DialogFooter> */}
        {/* <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose> */}
        {/* <Button type="submit">Send</Button> */}
      {/* </DialogFooter> */}
    </DialogContent>
  );
}