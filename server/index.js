import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './RoomManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Serve static files from the 'dist' directory (Vite build output)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get(/^(?!\/socket\.io).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();
const socketToPlayer = new Map(); // socket.id -> { code, playerId }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // List active rooms
  socket.on('list_rooms', () => {
    socket.emit('rooms_list', { rooms: roomManager.getActiveRooms() });
  });

  // Create a new game
  socket.on('create_game', ({ playerName }) => {
    handleCreateGame(socket, playerName, 'normal');
  });

  // Create a new live scoring session
  socket.on('create_live_game', ({ playerName }) => {
    handleCreateGame(socket, playerName, 'live_scoring');
  });

  function handleCreateGame(socket, playerName, mode) {
    console.log(`Received create_game (${mode}) from ${socket.id} for player ${playerName}`);
    try {
      const code = roomManager.createRoom(mode);
      const room = roomManager.getRoom(code);
      
      const player = room.game.addPlayer(playerName);
      player.isOnline = true; // Track online status
      room.allOfflineSince = null; // Reset inactive timer
      room.hostId = player.id; // Set the host
      roomManager.updateActivity(code); // Track activity
      
      socket.join(code);
      room.sockets.add(socket.id);
      socketToPlayer.set(socket.id, { code, playerId: player.id });
      
      socket.emit('game_created', {
        code,
        playerId: player.id,
        gameState: room.game.getState(),
        hostId: room.hostId,
        isLocked: room.isLocked
      });
      
      // Notify all clients about the new room
      io.emit('rooms_list', { rooms: roomManager.getActiveRooms() });
      
      console.log(`Game created (${mode}): ${code} by ${playerName}`);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', { message: error.message });
    }
  }

  // Join an existing game
  socket.on('join_game', ({ code, playerName }) => {
    console.log(`Received join_game from ${socket.id} for code ${code}, player ${playerName}`);
    const room = roomManager.getRoom(code);

    if (!room) {
      console.warn(`Join failed: Code ${code} not found`);
      socket.emit('error', { message: 'Game code not found.' });
      return;
    }

    // Check if player can join this room
    const joinCheck = roomManager.canPlayerJoin(code);
    if (!joinCheck.canJoin) {
      console.warn(`Join failed: ${joinCheck.reason}`);
      socket.emit('error', { message: joinCheck.reason });
      return;
    }

    try {
      // Check if player is rejoining (same name)
      let player = room.game.players.find(p => p.name === playerName);

      if (player) {
        player.isOnline = true;
        
        // Reset host offline timer if host reconnected
        if (player.id === room.hostId) {
          room.hostOfflineSince = null;
          console.log(`Host reconnected to room ${code}. Host cleanup timer reset.`);
        }
      } else if (room.game.mode !== 'live_scoring') {
        // Normal mode: auto-add the player
        player = room.game.addPlayer(playerName);
        player.isOnline = true;
      }
      // Live scoring mode: if not found, player remains undefined (spectator)

      room.allOfflineSince = null; // Reset inactive timer
      roomManager.updateActivity(code); // Track activity

      socket.join(code);
      room.sockets.add(socket.id);
      socketToPlayer.set(socket.id, { code, playerId: player ? player.id : null });

      // Notify the joining player
      socket.emit('game_joined', {
        code,
        playerId: player ? player.id : null,
        gameState: room.game.getState(),
        hostId: room.hostId,
        isLocked: room.isLocked
      });

      // Notify others in the room
      io.to(code).emit('player_joined', {
        playerName,
        isSpectator: !player,
        gameState: room.game.getState()
      });

      // Also send a general state update just in case
      io.to(code).emit('state_updated', {
        gameState: room.game.getState()
      });

      // Notify all clients about player count update
      io.emit('rooms_list', { rooms: roomManager.getActiveRooms() });

      console.log(`${playerName} joined game: ${code}`);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Start the game (host only)
  socket.on('start_game', ({ code }) => {
    handleStartGame(code, socket);
  });

  socket.on('start_live_game', ({ code }) => {
    handleStartGame(code, socket);
  });

  function handleStartGame(code, socket) {
    const room = roomManager.getRoom(code);
    if (!room) return;

    try {
      room.game.startGame();
      roomManager.updateActivity(code); // Track activity
      io.to(code).emit('game_started', {
        gameState: room.game.getState()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  // Lock/unlock game (host only)
  socket.on('toggle_room_lock', ({ code, locked }) => {
    const mapping = socketToPlayer.get(socket.id);
    if (!mapping || mapping.code !== code) {
      socket.emit('error', { message: 'You are not in this game.' });
      return;
    }

    const success = roomManager.setRoomLock(code, mapping.playerId, locked);
    if (!success) {
      socket.emit('error', { message: 'Only the host can lock/unlock the game.' });
      return;
    }

    // Notify all players in the room about lock status change
    io.to(code).emit('room_lock_changed', {
      isLocked: locked,
      hostId: roomManager.getRoom(code).hostId
    });

    // Update room list for all clients
    io.emit('rooms_list', { rooms: roomManager.getActiveRooms() });

    console.log(`Room ${code} ${locked ? 'locked' : 'unlocked'} by host`);
  });

  // Perform a game action
  socket.on('game_action', ({ code, action, data }) => {
    const room = roomManager.getRoom(code);
    if (!room) return;

    const game = room.game;
    
    // Actions that don't require an active turn
    if (action === 'add_player' || action === 'remove_player' || action === 'switch_player' || action === 'adjust_total_score') {
      try {
        let result;
        if (action === 'add_player') {
          result = game.addPlayer(data.name);
          console.log(`[Server] Player ${data.name} added to room ${code}`);
        } else if (action === 'remove_player') {
          game.removePlayer(data.id);
          result = { id: data.id };
          console.log(`[Server] Player ${data.id} removed from room ${code}`);
        } else if (action === 'switch_player') {
          game.jumpToPlayer(data.playerId);
          result = { playerId: data.playerId };
          console.log(`[Server] Switched to player ${data.playerId} in room ${code}`);
        } else if (action === 'adjust_total_score') {
          game.adjustPlayerScore(data.playerId, data.newTotal);
          result = { playerId: data.playerId, newTotal: data.newTotal };
          console.log(`[Server] Adjusted score for ${data.playerId} to ${data.newTotal} in room ${code}`);
        }

        roomManager.updateActivity(code);
        io.to(code).emit('state_updated', {
          gameState: game.getState(),
          lastAction: { 
            action, 
            data, 
            result, 
            playerId: data.playerId || (result && (result.id || result.playerId)) 
          }
        });
        
        // Also notify via rooms_list for player count
        io.emit('rooms_list', { rooms: roomManager.getActiveRooms() });
        return;
      } catch (error) {
        socket.emit('error', { message: error.message });
        return;
      }
    }

    const turn = game.currentTurn;
    if (!turn) return;

    const actorId = turn.player.id;

    try {
      let result;
      switch (action) {
        case 'roll':
          // If they have selections, bank them first before rolling
          if (turn.dice.getSelectedCount() > 0) {
            turn.bankSelectedDice();
          }
          result = turn.rollDice();
          break;
        case 'select':
          result = turn.toggleDieSelection(data.index);
          break;
        case 'bank':
          // If they have selections, bank them first before ending turn
          if (turn.dice.getSelectedCount() > 0) {
            turn.bankSelectedDice();
          }
          result = turn.endTurn();
          break;
        case 'record_score':
          game.recordLiveScore(data.points);
          result = { points: data.points };
          break;
      }

      // Track activity and broadcast updated state to everyone in the room
      roomManager.updateActivity(code);
      io.to(code).emit('state_updated', {
        gameState: game.getState(),
        lastAction: { action, data, result, playerId: actorId }
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const mapping = socketToPlayer.get(socket.id);

    if (mapping) {
      const { code, playerId } = mapping;
      const room = roomManager.getRoom(code);

      if (room) {
        if (playerId) {
          const player = room.game.players.find(p => p.id === playerId);
          if (player) {
            player.isOnline = false;
            console.log(`Player ${player.name} went offline in room ${code}`);

            // If this was the host, track when they went offline
            if (playerId === room.hostId) {
              room.hostOfflineSince = Date.now();
              console.log(`Host went offline in room ${code}. Host cleanup timer started.`);
            }

            // Check if ALL players are now offline
            const anyOnline = room.game.players.some(p => p.isOnline);
            if (!anyOnline) {
              room.allOfflineSince = Date.now();
              console.log(`Room ${code} is now completely offline. Cleanup timer started.`);
            }

            // Broadcast update to the room
            io.to(code).emit('state_updated', {
              gameState: room.game.getState()
            });

            // If still in setup, also notify via player_joined to refresh lobby UI
            if (room.game.phase === 'setup') {
              io.to(code).emit('player_joined', {
                gameState: room.game.getState()
              });
            }
          }
        }
        room.sockets.delete(socket.id);
      }
      socketToPlayer.delete(socket.id);
    }
  });
});

// Run room cleanup every minute
setInterval(() => {
  roomManager.cleanup();
}, 60 * 1000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Multiplayer server running on port ${PORT}`);
});
