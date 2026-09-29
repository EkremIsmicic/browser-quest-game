# Browser Quest Game 🎮

Multiplayer browser-based game built with Node.js, Express, WebSocket (ws), and HTML5 Canvas.

## Features

- ✅ Real-time multiplayer gameplay
- ✅ Player movement with WASD/Arrow Keys
- ✅ Shooting mechanics with mouse aim
- ✅ Health system and damage
- ✅ Player list with live health status
- ✅ World boundaries and camera system
- ✅ Collision detection
- ✅ Responsive grid-based world

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EkremIsmicic/browser-quest-game.git
   cd browser-quest-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

## How to Play

- **Join**: Enter your username and click "Join Game"
- **Move**: Use `W`, `A`, `S`, `D` or Arrow Keys
- **Aim**: Move your mouse to aim
- **Shoot**: Click to fire projectiles at other players
- **Health**: Monitor your health bar - at 0 HP you're out!
- **See others**: Check the player list on the left for all connected players

## Game Architecture

### Server (`server/server.js`)
- Express HTTP server
- WebSocket server for real-time communication
- Game state management (players, projectiles, entities)
- 60 FPS game loop with physics and collision detection
- World boundaries enforcement

### Client (`client/`)
- `index.html` - Main game interface
- `styles.css` - UI and visual styling
- `game.js` - Client-side game logic, rendering, and input handling

## Project Structure

```
browser-quest-game/
├── server/
│   └── server.js         # Node.js WebSocket server
├── client/
│   ├── index.html        # HTML game page
│   ├── styles.css        # Game UI styling
│   └── game.js           # Client-side game logic
├── package.json          # Project dependencies
└── README.md            # This file
```

## Technologies

- **Backend**: Node.js, Express, WebSocket (ws)
- **Frontend**: HTML5, CSS3, Canvas API, JavaScript (ES6+)
- **Communication**: WebSocket for real-time multiplayer
- **ID Generation**: UUID for unique player/projectile identification

## Game Mechanics

### Players
- Spawn at random locations
- Move with smooth velocity-based movement
- Health: 100 HP (takes 10 damage per projectile hit)
- Can shoot in any direction

### Projectiles
- Travel in straight lines
- Deal 10 damage on hit
- Auto-despawn after 300 frames (~5 seconds)
- Can't damage the player who fired them

### World
- Size: 1600x1200 pixels
- Grid visualization for spatial awareness
- Camera follows player
- Boundaries prevent going outside

## Collision Detection

- Projectile-to-Player collisions
- World boundary collisions
- Distance-based hit detection

## Networking

Messages sent between client and server:
- `join` - Player joins game with username
- `move` - Player movement input
- `shoot` - Player fires projectile
- `gameState` - Server broadcasts all game state
- `welcome` - Server confirms connection and sends world data

## Performance

- 60 FPS server tick rate
- Optimized drawing with canvas transform (camera system)
- Efficient collision checking
- Automatic projectile cleanup

## Future Enhancements

- [ ] Multiple weapon types
- [ ] Powerups and collectibles
- [ ] Team-based gameplay
- [ ] Chat system
- [ ] Leaderboards
- [ ] Different map layouts
- [ ] Sound effects
- [ ] Animations
- [ ] Mobile touch controls

## Contributing

Feel free to fork and submit pull requests for improvements!

## License

ISC

## Author

Created as a learning project for multiplayer web game development.

---

**Enjoy the game and have fun! 🚀**
