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
   * @param {string} mode - 'normal' or 'live_scoring'
   * @returns {string} The unique 5-letter room code
   */
  createRoom(mode = 'normal') {
    const code = this.generateCode();
    const game = new Game();
    game.setMode(mode);
    
    this.rooms.set(code, {
      code,
      game,
      sockets: new Set(),
      createdAt: Date.now(),
      allOfflineSince: null,
      lastActivity: Date.now(),
      isLocked: false,
      hostId: null // Will be set when first player joins
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
   * Update the last activity timestamp for a room
   * @param {string} code - The room code
   */
  updateActivity(code) {
    const room = this.getRoom(code);
    if (room) {
      room.lastActivity = Date.now();
    }
  }

  /**
   * Lock or unlock a room (host only)
   * @param {string} code - The room code
   * @param {string} playerId - The player attempting to lock/unlock
   * @param {boolean} locked - Whether to lock or unlock
   * @returns {boolean} Success status
   */
  setRoomLock(code, playerId, locked) {
    const room = this.getRoom(code);
    if (!room || room.hostId !== playerId) {
      return false; // Room doesn't exist or player is not host
    }

    room.isLocked = locked;
    return true;
  }

  /**
   * Check if a player can join a room
   * @param {string} code - The room code
   * @returns {object} {canJoin: boolean, reason?: string}
   */
  canPlayerJoin(code) {
    const room = this.getRoom(code);
    if (!room) {
      return { canJoin: false, reason: 'Room not found' };
    }

    if (room.game.phase === 'ended') {
      return { canJoin: false, reason: 'Game has ended' };
    }

    if (room.isLocked) {
      return { canJoin: false, reason: 'Game is locked by host' };
    }

    return { canJoin: true };
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
        hostName: room.game.players[0]?.name || 'Unknown',
        isLocked: room.isLocked,
        canJoin: !room.isLocked && room.game.phase !== 'ended'
      }));
  }

  /**
   * Clean up old rooms (e.g., older than 24 hours) or rooms empty for > 5 mins
   */
  cleanup() {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const fiveMinsAgo = now - (5 * 60 * 1000);

    for (const [code, room] of this.rooms.entries()) {
      // Rule 1: Room is older than 24 hours
      if (room.createdAt < dayAgo) {
        console.log(`Cleaning up room ${code} (Expired: >24h)`);
        this.removeRoom(code);
        continue;
      }

      // Rule 2: All players have been offline for more than 5 minutes
      if (room.allOfflineSince && room.allOfflineSince < fiveMinsAgo) {
        console.log(`Cleaning up room ${code} (Inactive: all players offline >5m)`);
        this.removeRoom(code);
        continue;
      }

      // Rule 3: Games in setup mode with no activity for 5+ minutes
      if (room.game.phase === 'setup' && room.lastActivity && room.lastActivity < fiveMinsAgo) {
        console.log(`Cleaning up room ${code} (Setup phase inactive >5m)`);
        this.removeRoom(code);
      }
    }
  }
}
