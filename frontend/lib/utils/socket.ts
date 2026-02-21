import { makeRequest } from 'lib/utils/request';
import { STATUS } from 'lib/utils/request';
import {
  BACKEND_URL,
  WEBSOCKET_URL
} from 'lib/constants';

export function createWebSocket(chatName: string) {
  const webSocket = new WebSocket(
    WEBSOCKET_URL
    + '/ws/chat/'
    + chatName
    + '/'
  );

  webSocket.onerror = function(error) {
    console.log(`Websocket error: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
  };

  return webSocket;
}

export async function getSocketToken() {
  const url = `${BACKEND_URL}/tokens/socket-token/`;
  const { data, status } = await makeRequest({
    url,
    method: 'GET',
    accept: 'application/json'
  });
  if (status === STATUS.HTTP_200_OK && data && typeof data === 'object') {
    const token = (data as { token: string }).token as string;
    return token;
  }
}