class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.ws = null;
        this.playerId = null;
        this.players = new Map();
        this.projectiles = new Map();
        this.myPlayer = null;
        this.worldWidth = 1600;
        this.worldHeight = 1200;
        this.cameraX = 0;
        this.cameraY = 0;
        this.joined = false;

        // Input handling
        this.keys = {};
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;
        this.mouseAngle = 0;

        this.setupEventListeners();
        this.init();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.updateMouseAngle();
        });

        this.canvas.addEventListener('click', () => this.shoot());

        document.getElementById('joinBtn').addEventListener('click', () => this.joinGame());
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
    }

    init() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.joined = false;
        };
    }

    handleMessage(message) {
        if (message.type === 'welcome') {
            this.playerId = message.playerId;
            this.worldWidth = message.worldWidth;
            this.worldHeight = message.worldHeight;
            document.getElementById('joinScreen').classList.add('hidden');
            this.joined = true;
        }

        if (message.type === 'gameState') {
            // Update players
            this.players.clear();
            message.players.forEach(playerData => {
                this.players.set(playerData.id, playerData);
                if (playerData.id === this.playerId) {
                    this.myPlayer = playerData;
                    this.updateUI();
                }
            });

            // Update projectiles
            this.projectiles.clear();
            message.projectiles.forEach(projData => {
                this.projectiles.set(projData.id, projData);
            });
        }
    }

    updateUI() {
        if (!this.myPlayer) return;

        document.getElementById('username').textContent = this.myPlayer.username;
        const healthPercent = (this.myPlayer.health / 100) * 100;
        document.getElementById('healthFill').style.width = healthPercent + '%';

        // Update player list
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';
        this.players.forEach((player, id) => {
            if (id === this.playerId) return;
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = `
                <span class="name">${player.username}</span>
                <span class="health"> HP: ${player.health}/100</span>
            `;
            playersList.appendChild(div);
        });
    }

    updateMouseAngle() {
        if (!this.myPlayer) return;
        const playerScreenX = this.myPlayer.x - this.cameraX;
        const playerScreenY = this.myPlayer.y - this.cameraY;
        this.mouseAngle = Math.atan2(this.mouseY - playerScreenY, this.mouseX - playerScreenX);
    }

    joinGame() {
        const username = document.getElementById('usernameInput').value.trim() || 'Player';
        this.ws.send(JSON.stringify({
            type: 'join',
            username: username
        }));
    }

    shoot() {
        if (!this.joined) return;
        this.ws.send(JSON.stringify({
            type: 'shoot',
            angle: this.mouseAngle
        }));
    }

    handleInput() {
        if (!this.joined) return;

        let velocityX = 0;
        let velocityY = 0;

        if (this.keys['w'] || this.keys['arrowup']) velocityY = -1;
        if (this.keys['s'] || this.keys['arrowdown']) velocityY = 1;
        if (this.keys['a'] || this.keys['arrowleft']) velocityX = -1;
        if (this.keys['d'] || this.keys['arrowright']) velocityX = 1;

        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        this.ws.send(JSON.stringify({
            type: 'move',
            velocityX: velocityX,
            velocityY: velocityY
        }));
    }

    updateCamera() {
        if (!this.myPlayer) return;

        this.cameraX = this.myPlayer.x - this.canvas.width / 2;
        this.cameraY = this.myPlayer.y - this.canvas.height / 2;

        // Clamp camera to world bounds
        if (this.cameraX < 0) this.cameraX = 0;
        if (this.cameraY < 0) this.cameraY = 0;
        if (this.cameraX + this.canvas.width > this.worldWidth) {
            this.cameraX = this.worldWidth - this.canvas.width;
        }
        if (this.cameraY + this.canvas.height > this.worldHeight) {
            this.cameraY = this.worldHeight - this.canvas.height;
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f4c75';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw projectiles
        this.projectiles.forEach(projectile => {
            this.drawProjectile(projectile);
        });

        // Draw players
        this.players.forEach((player, id) => {
            this.drawPlayer(player, id === this.playerId);
        });

        // Draw crosshair
        this.drawCrosshair();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(50, 130, 184, 0.3)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;

        const startX = Math.floor(this.cameraX / gridSize) * gridSize;
        const startY = Math.floor(this.cameraY / gridSize) * gridSize;

        for (let x = startX; x < this.cameraX + this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - this.cameraX, 0);
            this.ctx.lineTo(x - this.cameraX, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = startY; y < this.cameraY + this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y - this.cameraY);
            this.ctx.lineTo(this.canvas.width, y - this.cameraY);
            this.ctx.stroke();
        }
    }

    drawPlayer(player, isMe) {
        const x = player.x - this.cameraX;
        const y = player.y - this.cameraY;

        // Draw player body
        this.ctx.fillStyle = isMe ? '#00ff00' : '#ff6b6b';
        this.ctx.fillRect(x, y, 32, 32);

        // Draw health bar
        const healthPercent = player.health / 100;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y - 10, 32, 5);
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : '#ff6b6b';
        this.ctx.fillRect(x, y - 10, 32 * healthPercent, 5);

        // Draw username
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.username, x + 16, y - 15);

        // Draw direction indicator
        const dirX = Math.cos(player.angle || 0);
        const dirY = Math.sin(player.angle || 0);
        this.ctx.strokeStyle = isMe ? '#00ff00' : '#ff6b6b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 16, y + 16);
        this.ctx.lineTo(x + 16 + dirX * 16, y + 16 + dirY * 16);
        this.ctx.stroke();
    }

    drawProjectile(projectile) {
        const x = projectile.x - this.cameraX;
        const y = projectile.y - this.cameraY;

        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x, y, projectile.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawCrosshair() {
        const size = 10;
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(this.mouseX - size, this.mouseY);
        this.ctx.lineTo(this.mouseX + size, this.mouseY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.mouseX, this.mouseY - size);
        this.ctx.lineTo(this.mouseX, this.mouseY + size);
        this.ctx.stroke();
    }

    gameLoop() {
        this.handleInput();
        this.updateCamera();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new GameClient();
    game.start();
});
