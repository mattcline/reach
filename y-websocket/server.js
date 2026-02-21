import 'dotenv/config';

import http from 'http';
import { parse } from 'url';

import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setPersistence, setupWSConnection } from '@y/websocket-server/utils';
import { PostgresqlPersistence } from 'y-postgresql';

const server = http.createServer((request, response) => {
	response.writeHead(200, { 'Content-Type': 'text/plain' });
	response.end('okay');
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const room = url.pathname.slice(1);

  try {
    const decoded = jwt.verify(token, process.env.DJANGO_SECRET_KEY);
    
    if (decoded.document_id !== room) {
      console.log('[Server] Closing connection - document mismatch', { 
        expected: room, 
        got: decoded.document_id 
      });
      ws.close(4403, 'Forbidden');
      return;
    }
    
    console.log('[Server] Connection authorized', { 
      room, 
      user: decoded.user_id // or whatever's in your token 
    });
    setupWSConnection(ws, req);
    
  } catch (error) {
    console.log('[Server] Closing connection - JWT error', { 
      error: error.message,
      name: error.name 
    });
    ws.close(4401, 'Unauthorized');
  }
});

if (
	!process.env.PGHOST ||
	!process.env.PGPORT ||
	!process.env.PGDATABASE ||
	!process.env.PGUSER ||
	!process.env.PGPASSWORD
) {
	throw new Error('Please define the PostgreSQL connection option environment variables');
}
const pgdb = await PostgresqlPersistence.build({
	host: process.env.PGHOST,
	port: parseInt(process.env.PGPORT, 10),
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
});

setPersistence({
  bindState: async (docName, ydoc) => {
    const persistedYdoc = await pgdb.getYDoc(docName);
    if (persistedYdoc) {
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
      persistedYdoc.destroy();
    }
    ydoc.on('update', async update => {
      await pgdb.storeUpdate(docName, update);
    });
  },
  writeState: (docName, ydoc) => {
		return new Promise((resolve) => {
			resolve(true);
		});
	},
});

server.listen(process.env.PORT, () => {
	console.log(`listening on port:${process.env.PORT}`);
});