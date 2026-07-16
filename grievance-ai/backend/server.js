// ------------------------------------------------------------------
// AI-Powered Grievance Lodging & Tracking System — API server
// Express + Prisma(MySQL) + Google OAuth/JWT + Multer + Socket.io + Ollama
// ------------------------------------------------------------------
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initSocket } = require('./socket');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// static complaint attachments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.get('/api/health', (_req,res) => res.json({ok: true, service: 'grievance-ai'}));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dept-admin', require('./routes/deptAdmin'));

// central error handler (multer errors, etc.)
app.use((err, _req, res, _next) => {
  console.log(err);
  res.status(err.status || 400).json({error: err.message || "Something went wrong."});
});

const server = http.createServer(app);
initSocket(server);

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`API + Socket.io running on http://localhost:${port}`);
});
