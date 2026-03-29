/**
 * @jest-environment node
 */

import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { RoomManager } from '../../server/RoomManager.js';

describe('RoomManager', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Room creation', () => {
    test('should create rooms with default mode', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);
      expect(room.game.mode).toBe('normal');
    });

    test('should create rooms with specified mode', () => {
      const code = roomManager.createRoom('live_scoring');
      const room = roomManager.getRoom(code);
      expect(room.game.mode).toBe('live_scoring');
    });
  });

  describe('Setup mode cleanup', () => {
    test('should clean up setup rooms inactive for 5+ minutes', () => {
      // Create a room
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Verify room exists and is in setup
      expect(room).toBeTruthy();
      expect(room.game.phase).toBe('setup');

      // Simulate 5+ minutes of inactivity by backdating lastActivity
      const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
      room.lastActivity = sixMinutesAgo;

      // Run cleanup
      roomManager.cleanup();

      // Room should be removed
      expect(roomManager.getRoom(code)).toBeUndefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Cleaning up room ${code} (Setup phase inactive >5m)`)
      );
    });

    test('should not clean up setup rooms that are still active', () => {
      // Create a room
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Room should have recent activity (created just now)
      expect(room.lastActivity).toBeGreaterThan(Date.now() - 1000);

      // Run cleanup
      roomManager.cleanup();

      // Room should still exist
      expect(roomManager.getRoom(code)).toBeTruthy();
    });

    test('should not clean up playing rooms even if inactive', () => {
      // Create a room and start the game
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Add a player and start the game
      room.game.addPlayer('Test Player');
      room.game.startGame();

      // Simulate 5+ minutes of inactivity
      const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
      room.lastActivity = sixMinutesAgo;

      // Run cleanup
      roomManager.cleanup();

      // Room should still exist because it's not in setup phase
      expect(roomManager.getRoom(code)).toBeTruthy();
    });

    test('should update activity timestamp correctly', () => {
      // Create a room
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);
      const originalActivity = room.lastActivity;

      // Wait a bit
      const delay = 10;
      const future = Date.now() + delay;
      jest.spyOn(Date, 'now').mockReturnValue(future);

      // Update activity
      roomManager.updateActivity(code);

      // Activity should be updated
      expect(room.lastActivity).toBe(future);
      expect(room.lastActivity).toBeGreaterThan(originalActivity);
    });

    test('should handle updateActivity for non-existent room gracefully', () => {
      // Should not throw when updating activity for non-existent room
      expect(() => {
        roomManager.updateActivity('NONEX');
      }).not.toThrow();
    });
  });

  describe('Room locking functionality', () => {
    test('should create rooms unlocked by default', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      expect(room.isLocked).toBe(false);
      expect(room.hostId).toBeNull();
    });

    test('should allow host to lock and unlock rooms', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Set a host
      room.hostId = 'host123';

      // Host should be able to lock the room
      const lockResult = roomManager.setRoomLock(code, 'host123', true);
      expect(lockResult).toBe(true);
      expect(room.isLocked).toBe(true);

      // Host should be able to unlock the room
      const unlockResult = roomManager.setRoomLock(code, 'host123', false);
      expect(unlockResult).toBe(true);
      expect(room.isLocked).toBe(false);
    });

    test('should prevent non-hosts from locking rooms', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);
      room.hostId = 'host123';

      // Non-host should not be able to lock the room
      const result = roomManager.setRoomLock(code, 'player456', true);
      expect(result).toBe(false);
      expect(room.isLocked).toBe(false);
    });

    test('should prevent joining locked rooms', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);
      room.hostId = 'host123';
      room.isLocked = true;

      const joinCheck = roomManager.canPlayerJoin(code);
      expect(joinCheck.canJoin).toBe(false);
      expect(joinCheck.reason).toBe('Game is locked by host');
    });

    test('should allow joining unlocked rooms', () => {
      const code = roomManager.createRoom();

      const joinCheck = roomManager.canPlayerJoin(code);
      expect(joinCheck.canJoin).toBe(true);
    });

    test('should prevent joining ended games', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Manually set game phase to ended
      room.game.phase = 'ended';

      const joinCheck = roomManager.canPlayerJoin(code);
      expect(joinCheck.canJoin).toBe(false);
      expect(joinCheck.reason).toBe('Game has ended');
    });

    test('should include lock status in active rooms list', () => {
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);
      room.hostId = 'host123';
      room.isLocked = true;

      const activeRooms = roomManager.getActiveRooms();
      const testRoom = activeRooms.find(r => r.code === code);

      expect(testRoom.isLocked).toBe(true);
      expect(testRoom.canJoin).toBe(false);
    });
  });

  describe('Existing cleanup functionality', () => {
    test('should clean up rooms older than 24 hours', () => {
      // Create a room
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Simulate 24+ hours old
      const dayAndHourAgo = Date.now() - (25 * 60 * 60 * 1000);
      room.createdAt = dayAndHourAgo;

      // Run cleanup
      roomManager.cleanup();

      // Room should be removed
      expect(roomManager.getRoom(code)).toBeUndefined();
    });

    test('should clean up live scoring rooms if host is offline for 5+ minutes', () => {
      // Create a live scoring room
      const code = roomManager.createRoom('live_scoring');
      const room = roomManager.getRoom(code);
      room.hostId = 'host123';

      // Simulate host offline for 5+ minutes
      const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
      room.hostOfflineSince = sixMinutesAgo;

      // Run cleanup
      roomManager.cleanup();

      // Room should be removed
      expect(roomManager.getRoom(code)).toBeUndefined();
    });

    test('should not clean up live scoring rooms if host is still online', () => {
      // Create a live scoring room
      const code = roomManager.createRoom('live_scoring');
      const room = roomManager.getRoom(code);
      room.hostId = 'host123';
      room.hostOfflineSince = null; // Host is online

      // Run cleanup
      roomManager.cleanup();

      // Room should still exist
      expect(roomManager.getRoom(code)).toBeTruthy();
    });

    test('should clean up rooms with all players offline for 5+ minutes', () => {
      // Create a room
      const code = roomManager.createRoom();
      const room = roomManager.getRoom(code);

      // Simulate all players offline for 5+ minutes
      const sixMinutesAgo = Date.now() - (6 * 60 * 1000);
      room.allOfflineSince = sixMinutesAgo;

      // Run cleanup
      roomManager.cleanup();

      // Room should be removed
      expect(roomManager.getRoom(code)).toBeUndefined();
    });
  });
});