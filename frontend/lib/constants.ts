export const prod = process.env.NODE_ENV === 'production';
export const BACKEND_URL = prod ? 'https://api.reachagreements.com' : 'http://localhost:8000'; // needs to be 'localhost' and not '127.0.0.1' for the CSRF token cookie to be set in the browser
export const WEBSOCKET_URL = prod ? 'wss://api.reachagreements.com' : 'ws://localhost:8000';
export const Y_WEBSOCKET_URL = prod ? 'wss://yjs.reachagreements.com' : 'ws://localhost:1234';
export const HOMEPAGE_URL = prod ? 'https://reachagreements.com' : 'http://localhost:3000';