/**
 * Purpose: Server-Sent Events (SSE) manager for broadcasting real-time leaderboard updates
 */

// Active client response connections
const clients = new Set();
let heartbeatInterval = null;

/**
 * Registers an active HTTP response as an SSE subscriber
 * @param {import('express').Response} res
 */
function addClient(res) {
  clients.add(res);

  // Send initial connection event
  res.write('event: connected\ndata: {"status":"connected"}\n\n');

  // Start 25-second heartbeat timer if not already active
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(sendHeartbeat, 25000);
    if (heartbeatInterval.unref) {
      heartbeatInterval.unref();
    }
  }
}

/**
 * Removes a disconnected HTTP response from subscribers
 * @param {import('express').Response} res
 */
function removeClient(res) {
  clients.delete(res);

  if (clients.size === 0 && heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Periodically sends a comment heartbeat to keep SSE connections alive
 */
function sendHeartbeat() {
  for (const client of clients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (err) {
      clients.delete(client);
    }
  }
}

/**
 * Broadcasts an SSE event and JSON data to all connected clients
 * @param {string} event - Event name
 * @param {any} data - Object or payload to serialize to JSON
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch (err) {
      clients.delete(client);
    }
  }
}

/**
 * Returns number of connected clients
 * @returns {number}
 */
function getClientCount() {
  return clients.size;
}

module.exports = {
  addClient,
  removeClient,
  broadcast,
  getClientCount,
  clients,
};
