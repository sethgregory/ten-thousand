import { Game } from '../src/core/Game.js';

/**
 * Manages multiple game rooms and their associated states
 */
export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  /**
   * Create a new game room
   * @returns {string} The unique 5-letter room code
   */
  createRoom() {
    const code = this.generateCode();
    const game = new Game();
    
    this.rooms.set(code, {
      code,
      game,
      sockets: new Set(),
      createdAt: Date.now()
    });

    return code;
  }

  /**
   * Get a room by its code
   * @param {string} code - The room code
   * @returns {object|null} The room object
   */
  getRoom(code) {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Remove a room
   * @param {string} code - The room code
   */
  removeRoom(code) {
    this.rooms.delete(code.toUpperCase());
  }

  /**
   * Generate a random 5-letter uppercase code
   * @returns {string} 5-letter code
   */
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I, O to avoid confusion
    let code;
    
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Get a list of all active rooms that haven't ended yet
   * @returns {object[]} List of room summaries
   */
  getActiveRooms() {
    return Array.from(this.rooms.values())
      .filter(room => room.game.phase !== 'ended')
      .map(room => ({
        code: room.code,
        playerCount: room.game.players.length,
        phase: room.game.phase,
        hostName: room.game.players[0]?.name || 'Unknown'
      }));
  }

  /**
   * Clean up old rooms (e.g., older than 24 hours)
   */
  cleanup() {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [code, room] of this.rooms.entries()) {
      if (room.createdAt < dayAgo) {
        this.removeRoom(code);
      }
    }
  }
}
