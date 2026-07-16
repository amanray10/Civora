import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
