import { EventEmitter } from '../utils/EventEmitter.js';
import { DiceRenderer } from './DiceRenderer.js';
import { ScoreBoard } from './ScoreBoard.js';
import { Controls } from './Controls.js';
import { GameLog } from './GameLog.js';
import { TURN_RESULTS } from '../utils/constants.js';

/**
 * Main game interface coordinator
 */
export class GameBoard extends EventEmitter {
  /**
   * @param {HTMLElement} container - The main game board container
   * @param {object} game - The Game instance
   */
  constructor(container, game) {
    super();
    this.container = container;
    this.game = game;
    
    this.initLayout();
    this.initComponents();
    this.setupListeners();
  }

  /**
   * Initialize the DOM structure for the game board
   */
  initLayout() {
    this.container.innerHTML = `
      <div class="game-board-grid">
        <aside id="scoreboard-container" class="scoreboard-container"></aside>
        <section class="game-play-area">
          <div id="dice-container" class="dice-container-wrapper"></div>
          <div id="controls-container" class="controls-container"></div>
          <div id="game-log-container" class="game-log-container"></div>
        </section>
      </div>
    `;
  }

  /**
   * Initialize UI components
   */
  initComponents() {
    this.scoreBoard = new ScoreBoard(this.container.querySelector('#scoreboard-container'));
    this.diceRenderer = new DiceRenderer(this.container.querySelector('#dice-container'));
    this.controls = new Controls(this.container.querySelector('#controls-container'));
    this.gameLog = new GameLog(this.container.querySelector('#game-log-container'));
  }

  /**
   * Set up event listeners for game and UI events
   */
  setupListeners() {
    // Game events
    this.game.on('game_started', (data) => this.onGameStarted(data));
    this.game.on('turn_started', (data) => this.onTurnStarted(data));
    this.game.on('dice_rolled', (data) => this.onDiceRolled(data));
    this.game.on('dice_selected', (data) => this.onDiceSelected(data));
    this.game.on('dice_banked', (data) => this.onDiceBanked(data));
    this.game.on('turn_ended', (data) => this.onTurnEnded(data));
    this.game.on('hot_dice', (data) => this.onHotDice(data));
    this.game.on('game_ended', (data) => this.onGameEnded(data));

    // UI events
    this.controls.on('roll_clicked', () => this.onRollClicked());
    this.controls.on('bank_clicked', () => this.onBankClicked());
    this.diceRenderer.on('die_clicked', () => this.updateControlStates());
  }

  /**
   * Handle game start event
   */
  onGameStarted({ players, currentPlayer }) {
    this.scoreBoard.update(players.map(p => p.getState()), currentPlayer.id);
    this.controls.setStatusMessage(`Game started! ${currentPlayer.name}'s turn.`);
    this.gameLog.log(`Game started with ${players.length} players.`, 'system');
  }

  /**
   * Handle turn start event
   */
  onTurnStarted({ player, turn }) {
    this.diceRenderer.setTurn(turn);
    this.diceRenderer.render(turn.dice.getAllStates());
    this.scoreBoard.update(this.game.players.map(p => p.getState()), player.id);
    this.scoreBoard.updateTurnScore(0);
    this.controls.reset();
    this.controls.setStatusMessage(`${player.name}'s turn. Roll the dice!`);
    this.controls.setRollEnabled(true);
    this.gameLog.log(`--- ${player.name}'s Turn ---`, 'system');
  }

  /**
   * Handle dice roll event
   */
  onDiceRolled({ diceValues, availableValues, turn, scoringOptions }) {
    this.diceRenderer.render(turn.dice.getAllStates());
    this.diceRenderer.animateRolling();
    
    const rollStr = availableValues.join(', ');
    this.gameLog.log(`${turn.player.name} rolled: [${rollStr}]`);

    if (scoringOptions.length === 0) {
      this.controls.setStatusMessage('BUST! No scoring dice.', 'error');
      this.controls.setRollEnabled(false);
      this.controls.setBankEnabled(false);
      this.gameLog.log(`!!! BUST !!! ${turn.player.name} rolled no scoring dice.`, 'bust');
    } else {
      this.controls.setStatusMessage('Select scoring dice to continue or bank.');
      this.updateControlStates();
    }
  }

  /**
   * Handle dice selection event
   */
  onDiceSelected({ selectedValues, score }) {
    this.updateControlStates();
  }

  /**
   * Handle dice banked event
   */
  onDiceBanked({ pointsScored, totalTurnScore, remainingDiceCount }) {
    const turn = this.game.currentTurn;
    this.scoreBoard.updateTurnScore(totalTurnScore);
    this.diceRenderer.render(turn.dice.getAllStates());
    this.controls.setStatusMessage(`Banked ${pointsScored} pts. ${remainingDiceCount} dice remaining.`);
    this.gameLog.log(`${turn.player.name} kept scoring dice and banked ${pointsScored} points (Turn total: ${totalTurnScore}).`, 'success');
    this.updateControlStates();
  }

  /**
   * Handle turn end event
   */
  onTurnEnded({ player, result, pointsScored, totalScore }) {
    const resultMsg = result === TURN_RESULTS.BUST ? 
      'Busted! No points this turn.' : 
      `Turn complete. Banked ${pointsScored} points.`;
    
    this.controls.setStatusMessage(resultMsg, result === TURN_RESULTS.BUST ? 'error' : 'success');
    this.scoreBoard.update(this.game.players.map(p => p.getState()));
    this.scoreBoard.updateTurnScore(0);
    
    if (result === TURN_RESULTS.BANKED) {
      this.gameLog.log(`${player.name} ended turn and banked ${pointsScored} points. Total: ${totalScore}.`, 'success');
    } else if (result === TURN_RESULTS.BUST) {
      this.gameLog.log(`${player.name}'s turn ended in a bust.`, 'error');
    }
  }

  /**
   * Handle hot dice event
   */
  onHotDice({ pointsScored, totalTurnScore }) {
    const turn = this.game.currentTurn;
    this.scoreBoard.updateTurnScore(totalTurnScore);
    this.diceRenderer.render(turn.dice.getAllStates());
    this.controls.setStatusMessage('HOT DICE! All dice scored. Roll again!', 'success');
    this.controls.setRollEnabled(true);
    this.controls.setBankEnabled(false);
    this.gameLog.log(`HOT DICE! ${turn.player.name} scored with all 6 dice! Must roll again.`, 'success');
  }

  /**
   * Handle game end event
   */
  onGameEnded({ winner, finalScores }) {
    this.controls.setStatusMessage(`GAME OVER! ${winner.name} wins with ${winner.totalScore} points!`, 'success');
    this.controls.setRollEnabled(false);
    this.controls.setBankEnabled(false);
    this.gameLog.log(`GAME OVER! ${winner.name} wins!`, 'system');
  }

  /**
   * Update the states of Roll and Bank buttons based on current turn state
   */
  updateControlStates() {
    const turn = this.game.currentTurn;
    if (!turn || turn.isComplete) return;

    const hasValidSelection = turn.hasValidSelection();
    const currentSelectedScore = turn.getSelectedScore();
    const totalPotentialScore = turn.turnScore + currentSelectedScore;
    
    // Can bank if they have points AND are either already on board OR would reach 800
    const canBank = turn.player.canBankScore(totalPotentialScore) && hasValidSelection;
    
    this.controls.setBankEnabled(canBank);
    this.controls.updateBankButton(totalPotentialScore);
    
    // Can only roll if they have a valid selection
    this.controls.setRollEnabled(hasValidSelection);
  }

  /**
   * Handle roll button click
   */
  onRollClicked() {
    const turn = this.game.currentTurn;
    if (turn && !turn.isComplete) {
      try {
        // If they have selected dice, bank them first before rolling again
        if (turn.dice.getSelectedCount() > 0) {
          turn.bankSelectedDice();
        }
        turn.rollDice();
      } catch (error) {
        this.controls.setStatusMessage(error.message, 'warning');
      }
    }
  }

  /**
   * Handle bank button click
   */
  onBankClicked() {
    const turn = this.game.currentTurn;
    if (turn && !turn.isComplete) {
      try {
        // Bank currently selected dice first
        if (turn.dice.getSelectedCount() > 0) {
          turn.bankSelectedDice();
        }
        turn.endTurn();
      } catch (error) {
        this.controls.setStatusMessage(error.message, 'warning');
      }
    }
  }
}
