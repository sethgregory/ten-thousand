import { GAME_CONFIG, GAME_PHASES, TURN_RESULTS, ERROR_MESSAGES } from '../utils/constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { Player } from './Player.js';
import { Turn } from './Turn.js';
import { validateGameConfig } from '../utils/validators.js';

/**
 * Main game controller that coordinates players, turns, and game state
 */
export class Game extends EventEmitter {
  constructor() {
    super();
    this.players = [];
    this.currentPlayerIndex = -1;
    this.currentTurn = null;
    this.phase = GAME_PHASES.SETUP;
    this.winner = null;
    this.finalRoundStarter = null;
    this.turnCount = 0;
  }

  /**
   * Add a player to the game
   * @param {string} name - Name of the player
   * @returns {Player} The newly created player
   */
  addPlayer(name) {
    if (this.phase !== GAME_PHASES.SETUP) {
      throw new Error('Cannot add players after game has started');
    }

    if (this.players.length >= 8) {
      throw new Error('Maximum 8 players allowed');
    }

    const player = new Player(name);
    this.players.push(player);
    this.emit('player_added', { player, players: this.players });
    return player;
  }

  /**
   * Remove a player from the game
   * @param {string} id - ID of the player to remove
   */
  removePlayer(id) {
    if (this.phase !== GAME_PHASES.SETUP) {
      throw new Error('Cannot remove players after game has started');
    }

    const index = this.players.findIndex(p => p.id === id);
    if (index !== -1) {
      const removedPlayer = this.players.splice(index, 1)[0];
      this.emit('player_removed', { player: removedPlayer, players: this.players });
    }
  }

  /**
   * Start the game
   */
  startGame() {
    if (this.phase !== GAME_PHASES.SETUP) {
      throw new Error('Game has already started');
    }

    if (this.players.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_PLAYERS);
    }

    this.phase = GAME_PHASES.PLAYING;
    this.currentPlayerIndex = 0;
    this.turnCount = 1;

    this.emit('game_started', {
      players: this.players,
      currentPlayer: this.getCurrentPlayer()
    });

    this.startNewTurn();
  }

  /**
   * Start a new turn for the current player
   */
  startNewTurn() {
    if (this.phase === GAME_PHASES.ENDED) {
      throw new Error(ERROR_MESSAGES.GAME_ENDED);
    }

    const player = this.getCurrentPlayer();
    player.setActive();

    this.currentTurn = new Turn(player);

    // Forward important turn events
    this.currentTurn.on('dice_rolled', (data) => this.emit('dice_rolled', data));
    this.currentTurn.on('dice_selected', (data) => this.emit('dice_selected', data));
    this.currentTurn.on('dice_banked', (data) => this.emit('dice_banked', data));
    this.currentTurn.on('hot_dice', (data) => this.emit('hot_dice', data));
    this.currentTurn.on('turn_completed', (data) => this.handleTurnCompleted(data));

    this.emit('turn_started', {
      player,
      turnNumber: this.turnCount,
      turn: this.currentTurn
    });

    // Auto-start the first roll
    this.currentTurn.startTurn();
  }

  /**
   * Handle turn completion logic
   * @param {object} data - Turn completion data
   */
  handleTurnCompleted(data) {
    const { player, turnRecord } = data;
    const currentPlayer = this.getCurrentPlayer();

    // Record the turn for the player
    currentPlayer.recordTurn({
      points: data.pointsScored,
      result: data.result,
      rolls: data.turn.rolls
    });

    this.emit('turn_ended', {
      player: currentPlayer,
      result: data.result,
      pointsScored: data.pointsScored,
      totalScore: currentPlayer.totalScore
    });

    // Check for win condition / final round trigger
    if (this.phase === GAME_PHASES.PLAYING && currentPlayer.hasWon()) {
      this.triggerFinalRound(currentPlayer);
    }

    // Move to next player or end game
    this.nextPlayer();
  }

  /**
   * Trigger the final round of the game
   * @param {Player} starter - The player who reached 10,000+ points
   */
  triggerFinalRound(starter) {
    this.phase = GAME_PHASES.FINAL_ROUND;
    this.finalRoundStarter = starter;
    this.emit('final_round_started', { starter });
  }

  /**
   * Sync game state with external data (used for multiplayer)
   * @param {object} state - Game state data
   */
  syncState(state) {
    if (state.players) {
      this.players = state.players.map(p => {
        const player = Player.fromSaveData(p);
        // isOnline is already handled by fromSaveData
        return player;
      });
    }
    
    this.phase = state.phase;
    this.turnCount = state.turnCount;
    this.finalRoundStarter = state.finalRoundStarter ? Player.fromSaveData(state.finalRoundStarter) : null;
    this.winner = state.winner ? Player.fromSaveData(state.winner) : null;
    
    if (state.currentPlayer) {
      this.currentPlayerIndex = this.players.findIndex(p => p.id === state.currentPlayer.id);
    }
  }

  /**
   * Advance to the next player
   */
  nextPlayer() {
    this.currentPlayerIndex++;

    // Check if we've cycled through all players
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
      this.turnCount++;
    }

    const nextPlayer = this.getCurrentPlayer();

    // Check if the final round is complete
    if (this.phase === GAME_PHASES.FINAL_ROUND && nextPlayer === this.finalRoundStarter) {
      this.endGame();
      return;
    }

    if (this.phase !== GAME_PHASES.ENDED) {
      this.startNewTurn();
    }
  }

  /**
   * End the game and determine the winner
   */
  endGame() {
    this.phase = GAME_PHASES.ENDED;

    // Winner is the player with the highest score
    this.winner = [...this.players].sort((a, b) => b.totalScore - a.score)[0];

    // Wait, Player.js uses totalScore. Let me double check Player.js
    // Re-sorting to be safe
    this.winner = [...this.players].sort((a, b) => b.totalScore - a.totalScore)[0];

    this.emit('game_ended', {
      winner: this.winner,
      finalScores: this.players.map(p => ({
        name: p.name,
        score: p.totalScore
      }))
    });
  }

  /**
   * Get the current player
   * @returns {Player} Current player instance
   */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Get current game state
   * @returns {object} Game state object
   */
  getState() {
    return {
      phase: this.phase,
      currentPlayer: this.getCurrentPlayer()?.getState(),
      players: this.players.map(p => p.getState()),
      turnCount: this.turnCount,
      winner: this.winner?.getState(),
      currentTurn: this.currentTurn?.getState()
    };
  }

  /**
   * Reset game for a new session
   */
  resetGame() {
    this.players.forEach(p => p.resetForNewGame());
    this.currentPlayerIndex = -1;
    this.currentTurn = null;
    this.phase = GAME_PHASES.SETUP;
    this.winner = null;
    this.finalRoundStarter = null;
    this.turnCount = 0;
    this.emit('game_reset');
  }
}
