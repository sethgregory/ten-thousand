import { Game } from '../../src/core/Game.js';
import { GAME_PHASES } from '../../src/utils/constants.js';
import { jest } from '@jest/globals';

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game();
    // Mock Math.random to always return 0 (which results in rolling a 1)
    // to avoid random busts during tests
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize in SETUP phase', () => {
    expect(game.phase).toBe(GAME_PHASES.SETUP);
    expect(game.players).toHaveLength(0);
  });

  test('should add players', () => {
    const player = game.addPlayer('Alice');
    expect(game.players).toHaveLength(1);
    expect(player.name).toBe('Alice');
  });

  test('should remove players', () => {
    const player = game.addPlayer('Alice');
    game.removePlayer(player.id);
    expect(game.players).toHaveLength(0);
  });

  test('should not start without players', () => {
    expect(() => game.startGame()).toThrow();
  });

  test('should start game and switch to PLAYING phase', () => {
    game.addPlayer('Alice');
    game.addPlayer('Bob');
    game.startGame();
    expect(game.phase).toBe(GAME_PHASES.PLAYING);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.currentTurn).not.toBeNull();
  });

  test('should cycle through players', () => {
    game.addPlayer('Alice');
    game.addPlayer('Bob');
    game.startGame();
    
    const aliceTurn = game.currentTurn;
    expect(game.getCurrentPlayer().name).toBe('Alice');
    
    // Simulate Alice ending turn
    aliceTurn.emit('turn_completed', {
      player: game.getCurrentPlayer(),
      result: 'banked',
      pointsScored: 1000,
      turn: aliceTurn
    });
    
    expect(game.getCurrentPlayer().name).toBe('Bob');
    expect(game.turnCount).toBe(1);
  });

  test('should increment turn count after all players played', () => {
    game.addPlayer('Alice');
    game.addPlayer('Bob');
    game.startGame();
    
    // Alice's turn
    game.currentTurn.emit('turn_completed', {
      player: game.getCurrentPlayer(),
      result: 'banked',
      pointsScored: 1000,
      turn: game.currentTurn
    });
    
    // Bob's turn
    game.currentTurn.emit('turn_completed', {
      player: game.getCurrentPlayer(),
      result: 'banked',
      pointsScored: 1000,
      turn: game.currentTurn
    });
    
    expect(game.getCurrentPlayer().name).toBe('Alice');
    expect(game.turnCount).toBe(2);
  });

  test('should enforce 800-point on-board requirement', () => {
    game.addPlayer('Alice');
    game.startGame();
    
    const turn = game.currentTurn;
    turn.turnScore = 100; // Under 800
    
    expect(() => turn.endTurn()).toThrow(/Need at least 800 to get on the board/);
    
    turn.turnScore = 800; // Exactly 800
    turn.endTurn();
    
    expect(game.players[0].totalScore).toBe(800);
    expect(game.players[0].isOnBoard).toBe(true);
  });
});
