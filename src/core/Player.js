import { GAME_CONFIG } from '../utils/constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Represents a player in the game
 */
export class Player extends EventEmitter {
  constructor(name, id = null) {
    super();
    this.id = id || this.generateId();
    this.name = name;
    this.totalScore = 0;
    this.isOnBoard = false;
    this.turnHistory = [];
    this.isActive = false;
  }

  /**
   * Generate a unique player ID
   * @returns {string} Unique identifier
   */
  generateId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Add points to the player's total score
   * @param {number} points - Points to add
   * @param {boolean} [fromTurn=true] - Whether points are from a turn (affects board status)
   */
  addScore(points, fromTurn = true) {
    if (typeof points !== 'number' || points < 0) {
      throw new Error('Points must be a non-negative number');
    }

    const oldScore = this.totalScore;
    this.totalScore += points;

    // Check if player gets on the board
    if (!this.isOnBoard && this.totalScore >= GAME_CONFIG.MINIMUM_BOARD_SCORE && fromTurn) {
      this.isOnBoard = true;
      this.emit('on_board', { player: this, previousScore: oldScore });
    }

    this.emit('score_changed', {
      player: this,
      oldScore,
      newScore: this.totalScore,
      pointsAdded: points
    });
  }

  /**
   * Record a completed turn
   * @param {object} turnResult - Details of the turn
   */
  recordTurn(turnResult) {
    const turnRecord = {
      turnNumber: this.turnHistory.length + 1,
      pointsScored: turnResult.points || 0,
      result: turnResult.result,
      timestamp: Date.now(),
      rolls: turnResult.rolls || [],
      finalScore: this.totalScore
    };

    this.turnHistory.push(turnRecord);
    this.emit('turn_completed', { player: this, turnRecord });

    // Add points if the turn was successful
    if (turnResult.points > 0) {
      this.addScore(turnResult.points);
    }
  }

  /**
   * Check if player can bank a specific score
   * @param {number} score - Score to potentially bank
   * @returns {boolean} True if score can be banked
   */
  canBankScore(score) {
    if (!this.isOnBoard) {
      return score >= GAME_CONFIG.MINIMUM_BOARD_SCORE;
    }
    return score > 0;
  }

  /**
   * Check if player has reached the winning condition
   * @returns {boolean} True if player has won
   */
  hasWon() {
    return this.totalScore >= GAME_CONFIG.WINNING_SCORE;
  }

  /**
   * Set player as active (their turn)
   */
  setActive() {
    this.isActive = true;
    this.emit('activated', { player: this });
  }

  /**
   * Set player as inactive (not their turn)
   */
  setInactive() {
    this.isActive = false;
    this.emit('deactivated', { player: this });
  }

  /**
   * Get player statistics
   * @returns {object} Player statistics
   */
  getStats() {
    const turns = this.turnHistory;
    const successfulTurns = turns.filter(turn => turn.pointsScored > 0);
    const bustedTurns = turns.filter(turn => turn.result === 'bust');

    return {
      totalScore: this.totalScore,
      isOnBoard: this.isOnBoard,
      totalTurns: turns.length,
      successfulTurns: successfulTurns.length,
      bustedTurns: bustedTurns.length,
      averageScore: successfulTurns.length > 0
        ? Math.round(successfulTurns.reduce((sum, turn) => sum + turn.pointsScored, 0) / successfulTurns.length)
        : 0,
      bestTurn: turns.length > 0
        ? Math.max(...turns.map(turn => turn.pointsScored))
        : 0,
      successRate: turns.length > 0
        ? Math.round((successfulTurns.length / turns.length) * 100)
        : 100
    };
  }

  /**
   * Get the last N turns
   * @param {number} count - Number of recent turns to get
   * @returns {object[]} Array of recent turn records
   */
  getRecentTurns(count = 5) {
    return this.turnHistory.slice(-count);
  }

  /**
   * Check if this is the player's first turn
   * @returns {boolean} True if no turns have been recorded
   */
  isFirstTurn() {
    return this.turnHistory.length === 0;
  }

  /**
   * Get a summary of the player's current state
   * @returns {object} Player state summary
   */
  getState() {
    return {
      id: this.id,
      name: this.name,
      totalScore: this.totalScore,
      isOnBoard: this.isOnBoard,
      isActive: this.isActive,
      turnCount: this.turnHistory.length,
      hasWon: this.hasWon()
    };
  }

  /**
   * Reset player for a new game
   */
  resetForNewGame() {
    this.totalScore = 0;
    this.isOnBoard = false;
    this.turnHistory = [];
    this.isActive = false;
    this.emit('reset', { player: this });
  }

  /**
   * Create a copy of this player (for save/restore purposes)
   * @returns {Player} New player instance with same data
   */
  clone() {
    const clone = new Player(this.name, this.id);
    clone.totalScore = this.totalScore;
    clone.isOnBoard = this.isOnBoard;
    clone.turnHistory = [...this.turnHistory];
    clone.isActive = this.isActive;
    return clone;
  }

  /**
   * Create a player from saved data
   * @param {object} data - Saved player data
   * @returns {Player} Restored player instance
   */
  static fromSaveData(data) {
    const player = new Player(data.name, data.id);
    player.totalScore = data.totalScore || 0;
    player.isOnBoard = data.isOnBoard || false;
    player.turnHistory = data.turnHistory || [];
    player.isActive = data.isActive || false;
    return player;
  }

  /**
   * Get data suitable for saving
   * @returns {object} Serializable player data
   */
  getSaveData() {
    return {
      id: this.id,
      name: this.name,
      totalScore: this.totalScore,
      isOnBoard: this.isOnBoard,
      turnHistory: this.turnHistory,
      isActive: this.isActive
    };
  }

  /**
   * String representation of player
   * @returns {string} Player description
   */
  toString() {
    return `${this.name} (${this.totalScore} pts${this.isOnBoard ? ', on board' : ''})`;
  }
}