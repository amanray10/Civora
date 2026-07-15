// Socket.io — live status updates
// Rooms: user:{id} (citizens), dept:{id} (department dashboards)
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || '*' } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, departmentId } = socket.user;
    socket.join(`user:${id}`);
    if (role === 'department' && departmentId) socket.join(`dept:${departmentId}`);
    if (role === 'admin') socket.join('admins');
  });
  return io;
}

module.exports = { initSocket, getIO: () => io };
