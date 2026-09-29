const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const TICK_RATE = 60;

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Game state
const players = new Map();
const entities = new Map();
const projectiles = new Map();

class Player {
  constructor(id, x, y, username) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.username = username;
    this.width = 32;
    this.height = 32;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 3;
    this.health = 100;
    this.maxHealth = 100;
    this.angle = 0;
    this.isMoving = false;
  }

  update() {
    // Update position
    this.x += this.velocityX;
    this.y += this.velocityY;

    // World boundaries
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > WORLD_WIDTH) this.x = WORLD_WIDTH - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y + this.height > WORLD_HEIGHT) this.y = WORLD_HEIGHT - this.height;

    // Update movement state
    this.isMoving = this.velocityX !== 0 || this.velocityY !== 0;
  }

  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      username: this.username,
      health: this.health,
      angle: this.angle,
      isMoving: this.isMoving
    };
  }
}

class Projectile {
  constructor(id, x, y, velocityX, velocityY, ownerId) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.ownerId = ownerId;
    this.radius = 5;
    this.speed = 8;
    this.lifetime = 300; // frames
    this.age = 0;
  }

  update() {
    this.x += this.velocityX * this.speed;
    this.y += this.velocityY * this.speed;
    this.age++;
    return this.age < this.lifetime;
  }

  getState() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius
    };
  }
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function checkCollisions() {
  // Check projectile-player collisions
  projectiles.forEach((projectile, projId) => {
    players.forEach((player, playerId) => {
      if (projectile.ownerId === playerId) return; // Don't hit yourself

      const dist = distance(projectile.x, projectile.y, player.x + player.width / 2, player.y + player.height / 2);
      if (dist < projectile.radius + player.width / 2) {
        player.health -= 10;
        if (player.health < 0) player.health = 0;
        projectiles.delete(projId);
      }
    });
  });
}

function updateGameState() {
  // Update players
  players.forEach(player => player.update());

  // Update projectiles
  const deadProjectiles = [];
  projectiles.forEach((projectile, id) => {
    if (!projectile.update()) {
      deadProjectiles.push(id);
    }
  });
  deadProjectiles.forEach(id => projectiles.delete(id));

  checkCollisions();
}

function broadcastGameState() {
  const gameState = {
    type: 'gameState',
    players: Array.from(players.values()).map(p => p.getState()),
    projectiles: Array.from(projectiles.values()).map(p => p.getState())
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(gameState));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  const playerId = uuidv4();
  console.log(`Player connected: ${playerId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'join') {
        const player = new Player(
          playerId,
          Math.random() * (WORLD_WIDTH - 64) + 32,
          Math.random() * (WORLD_HEIGHT - 64) + 32,
          message.username || `Player${playerId.slice(0, 4)}`
        );
        players.set(playerId, player);
        console.log(`${player.username} joined the game`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'welcome',
          playerId: playerId,
          worldWidth: WORLD_WIDTH,
          worldHeight: WORLD_HEIGHT
        }));
      }

      if (message.type === 'move') {
        const player = players.get(playerId);
        if (player) {
          player.velocityX = message.velocityX * player.speed;
          player.velocityY = message.velocityY * player.speed;
        }
      }

      if (message.type === 'shoot') {
        const player = players.get(playerId);
        if (player) {
          const projectileId = uuidv4();
          const proj = new Projectile(
            projectileId,
            player.x + player.width / 2,
            player.y + player.height / 2,
            Math.cos(message.angle),
            Math.sin(message.angle),
            playerId
          );
          projectiles.set(projectileId, proj);
        }
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  ws.on('close', () => {
    players.delete(playerId);
    console.log(`Player disconnected: ${playerId}`);
  });
});

// Game loop
setInterval(() => {
  updateGameState();
  broadcastGameState();
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`🎮 Game server running on http://localhost:${PORT}`);
});
