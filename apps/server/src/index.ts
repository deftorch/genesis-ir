import express from 'express';
import http from 'http';
import { GenesisSyncServer, InMemorySyncPersistence } from '@genesis/sync';

const app = express();
const server = http.createServer(app);

// Initialize Genesis Sync Server (WebSocket Hub)
// Attaches to the same HTTP server to share the port
const syncServer = new GenesisSyncServer({
  server,
  persistence: new InMemorySyncPersistence(),
  maxClientsPerRoom: 100, // Enterprise scale rooms
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '@genesis/server', version: '1.0.0' });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Genesis Sync Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Hub attached and listening on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  await syncServer.close();
  server.close(() => {
    process.exit(0);
  });
});
