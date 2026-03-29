import { Game } from '../../src/core/Game.js';
import { GAME_PHASES } from '../../src/utils/constants.js';
import { jest } from '@jest/globals';

describe('Live Scoring', () => {
  let game;

  beforeEach(() => {
    game = new Game();
    game.setMode('live_scoring');
  });

  test('should initialize in live_scoring mode', () => {
    expect(game.mode).toBe('live_scoring');
  });

  test('should not auto-roll when turn starts in live_scoring mode', () => {
    game.addPlayer('Alice');
    game.startGame();
    
    expect(game.currentTurn).not.toBeNull();
    expect(game.currentTurn.rollCount).toBe(0);
    expect(game.currentTurn.dice.dice[0].value).toBeNull();
  });

  test('should record manual scores', () => {
    game.addPlayer('Alice');
    game.addPlayer('Bob');
    game.startGame();
    
    const alice = game.players[0];
    
    // Alice scores 1000 manually
    game.recordLiveScore(1000);
    
    expect(alice.totalScore).toBe(1000);
    expect(game.getCurrentPlayer().name).toBe('Bob');
  });

  test('should handle busts in live_scoring mode', () => {
    game.addPlayer('Alice');
    game.addPlayer('Bob');
    game.startGame();
    
    const alice = game.players[0];
    
    // Alice scores 0 (bust)
    game.recordLiveScore(0);
    
    expect(alice.totalScore).toBe(0);
    expect(game.getCurrentPlayer().name).toBe('Bob');
  });

  test('should throw error if recording score without active turn', () => {
    expect(() => game.recordLiveScore(1000)).toThrow('No active turn');
  });

  test('should throw error if recording score in normal mode', () => {
    game.setMode('normal');
    game.addPlayer('Alice');
    game.startGame();
    
    expect(() => game.recordLiveScore(1000)).toThrow('Can only record live scores in live_scoring mode');
  });
});
