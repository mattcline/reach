## Build a Collaborative & Persistent Text Editor with Lexical, Yjs, and Postgres

November 19, 2025

Source code: [https://github.com/mattcline/lexical-yjs-demo](https://github.com/mattcline/lexical-yjs-demo)

#### Initialize React App

```
npm create vite@latest
```

#### Create Basic Text Editor

I chose Lexical because it was created by Facebook, the organization also behind React.

Follow the Getting Started with React guide to implement a basic text editor: [https://lexical.dev/docs/getting-started/react](https://lexical.dev/docs/getting-started/react)

#### Add Collaboration

Follow 'Collaboration' docs on Lexical: [https://lexical.dev/docs/collaboration/react](https://lexical.dev/docs/collaboration/react)

Let's make it collaborative!

Install required packages:

```
npm i @lexical/yjs y-websocket yjs @y/websocket-server
```

#### Production-level Persistence

To enable production-level persistence, we'll need to create our own custom server.

```
npm init
```

```
npm i y-postgresql dotenv jsonwebtoken ws @y/websocket-server yjs
```

See this file for the code: [https://github.com/mattcline/lexical-yjs-demo/blob/main/y-websocket-server/server.js](https://github.com/mattcline/lexical-yjs-demo/blob/main/y-websocket-server/server.js)

Note: make sure to implement your own access control so that only authorized users can connect to the websocket server.  I use JWT as seen in the code linked above.