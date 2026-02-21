## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Run Yjs server in y-websocket:

```bash
node server.js
```

## Test on mobile

- Identify IP address (System Settings -> Network -> Wi-Fi -> Details...)
- Update MOBILE_HOST to that IP address in settings.py in `backend` repo
- Run 'Run Server - Mobile' config
- Update BACKEND_URL in `frontend` repo
- Update Yjs server url
- Add "http://<IP_ADDRESS>:3000" to AllowedOrigins in AWS S3
- Navigate to that IP address on mobile Safari (and desktop if you're using that too)
  - To debug, connect iPhone to Mac via USB
  - Navigate to Safari on Mac
  - Click 'Develop' menu at the top and select device

## Errors

- If you get a type error like 'TypeError: (0 , _context_messages__WEBPACK_IMPORTED_MODULE_1__.useMessages) is not a function',
make sure the file has 'use client' at the top if it's a client component.

- "Error: async/await is not yet supported in Client Components, only Server Components. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server."
  - This error might be caused by an infinite loop in a component
  - Has been caused by returning an async component like 'export default async compName'

- "Error: NextRouter was not mounted. https://nextjs.org/docs/messages/next-router-not-mounted"
  - Fix: make sure to import useRouter from 'next/navigation' instead of 'next/router'

- Error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch
  
  - Fix: wait till client component loads before rendering the component
    - https://nextjs.org/docs/messages/react-hydration-error
    - look at theme-provider.tsx for an example of how to fix this error

  
## Good to know

- GET requests that do not route to DRF Router routes should not end in '/'.
- `import { useRouter } from 'next/navigation';` instead of `import { useRouter } from 'next/router'` since we're using Next.js app router, not pages router.