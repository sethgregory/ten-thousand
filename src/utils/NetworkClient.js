import { io } from 'socket.io-client';
import { EventEmitter } from './EventEmitter.js';

/**
 * Handles communication with the multiplayer server
 */
export class NetworkClient extends EventEmitter {
  constructor(serverUrl = window.location.origin) {
    super();
    this.serverUrl = serverUrl;
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.isHost = false;
  }

  /**
   * Connect to the server
   */
  connect() {
    if (this.socket) return;

    console.log(`Connecting to multiplayer server at ${this.serverUrl}...`);
    this.socket = io(this.serverUrl);

    this.socket.on('connect', () => {
      console.log('Connected to multiplayer server successfully');
      this.emit('connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.emit('error', { message: `Cannot connect to server at ${this.serverUrl}` });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from multiplayer server');
      this.emit('disconnected');
    });

    this.socket.on('game_created', (data) => {
      this.roomCode = data.code;
      this.playerId = data.playerId;
      this.isHost = true;
      this.emit('game_created', data);
    });

    this.socket.on('game_joined', (data) => {
      this.roomCode = data.code;
      this.playerId = data.playerId;
      this.isHost = false;
      this.emit('game_joined', data);
    });

    this.socket.on('player_joined', (data) => {
      this.emit('player_joined', data);
    });

    this.socket.on('game_started', (data) => {
      this.emit('game_started', data);
    });

    this.socket.on('state_updated', (data) => {
      this.emit('state_updated', data);
    });

    this.socket.on('rooms_list', (data) => {
      this.emit('rooms_list', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Create a new multiplayer game
   * @param {string} playerName - Name of the host
   */
  createGame(playerName) {
    this.connect();
    console.log(`Emitting create_game for ${playerName}`);
    this.socket.emit('create_game', { playerName });
  }

  /**
   * Join an existing multiplayer game
   * @param {string} code - 5-letter room code
   * @param {string} playerName - Name of the joining player
   */
  joinGame(code, playerName) {
    this.connect();
    console.log(`Emitting join_game for ${playerName} with code ${code}`);
    this.socket.emit('join_game', { code: code.toUpperCase(), playerName });
  }

  /**
   * Start the game (Host only)
   */
  startGame() {
    if (this.socket && this.roomCode) {
      this.socket.emit('start_game', { code: this.roomCode });
    }
  }

  /**
   * Request a list of active multiplayer rooms
   */
  listRooms() {
    this.connect();
    this.socket.emit('list_rooms');
  }

  /**
   * Send a game action to the server
   * @param {string} action - 'roll', 'select', or 'bank'
   * @param {object} [data] - Optional action data (e.g., { index })
   */
  sendAction(action, data = {}) {
    if (this.socket && this.roomCode) {
      this.socket.emit('game_action', {
        code: this.roomCode,
        action,
        data
      });
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
