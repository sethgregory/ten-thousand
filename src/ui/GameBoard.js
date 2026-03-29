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
   * @param {NetworkClient} [networkClient] - Optional network client for multiplayer
   */
  constructor(container, game, networkClient = null) {
    super();
    this.container = container;
    this.game = game;
    this.networkClient = networkClient;
    this.isRemote = !!networkClient;
    this.isHost = false; // Will be set by main.js
    this.roomLocked = false; // Track lock status
    
    this.initLayout();
    this.initComponents();
    this.setupListeners();
    
    // Render initial state if game is already in progress
    if (this.game.phase !== 'setup') {
      this.renderCurrentState();
    }
  }

  /**
   * Render the current game state (used for initial render when joining)
   */
  renderCurrentState() {
    const players = this.game.players.map(p => p.getState());
    const currentPlayer = this.game.getCurrentPlayer();
    
    this.scoreBoard.update(players, currentPlayer?.id);
    
    if (this.isRemote) {
      this.gameLog.log(`Connected to room: ${this.networkClient.roomCode}`, 'system');
    }

    if (this.game.currentTurn) {
      const turn = this.game.currentTurn;
      this.diceRenderer.setTurn(turn);
      this.diceRenderer.render(turn.dice.getAllStates());
      this.scoreBoard.updateTurnScore(turn.turnScore);
      this.updateControlStates();
    }
  }

  /**
   * Handle an action performed by a remote player (for logging/animations)
   * @param {object} lastAction - Action data from the server
   */
  handleRemoteAction(lastAction) {
    const { action, result, playerId } = lastAction;
    const actor = this.game.players.find(p => p.id === playerId);
    if (!actor) return;

    switch (action) {
      case 'roll':
        if (result && result.availableValues) {
          const rollStr = result.availableValues.join(', ');
          this.gameLog.log(`${actor.name} rolled: [${rollStr}]`);
          this.diceRenderer.animateRolling();
          
          if (result.result === 'bust') {
            this.gameLog.log(`!!! BUST !!! ${actor.name} rolled no scoring dice.`, 'bust');
            this.triggerBustFlash();
          }
        }
        break;
        
      case 'bank':
        if (result && result.pointsScored !== undefined) {
          this.gameLog.log(`${actor.name} ended turn and banked ${result.pointsScored} points. Total: ${actor.totalScore}.`, 'success');
        }
        break;
        
      case 'select':
        // 'select' actions are usually too noisy to log individually
        break;
    }
  }

  /**
   * Temporarily flash the background red to indicate a bust
   */
  triggerBustFlash() {
    const overlay = document.getElementById('bust-flash-overlay');
    if (overlay) {
      overlay.classList.add('flash-active');
      setTimeout(() => {
        overlay.classList.remove('flash-active');
      }, 800);
    }
  }

  /**
   * Initialize the DOM structure for the game board
   */
  initLayout() {
    const isLiveScoring = this.game.mode === 'live_scoring';
    
    this.container.innerHTML = `
      <div class="game-board-grid">
        <aside id="scoreboard-container" class="scoreboard-container"></aside>
        <section class="game-play-area">
          <div class="game-info-bar">
            ${this.isRemote ? `<div class="room-indicator">Room: <strong>${this.networkClient.roomCode}</strong></div>` : ''}
            ${this.isRemote ? `<div class="lock-controls" style="display: none;">
              <button id="lock-toggle-btn" class="btn-link lock-btn" title="Lock/unlock game">
                <span id="lock-icon">🔓</span> <span id="lock-text">Open</span>
              </button>
            </div>` : ''}
          </div>
          
          ${isLiveScoring ? `
            <div id="live-scoring-input" class="live-scoring-input" style="display: none;">
              <div class="manual-score-card">
                <h3>Manual Score Entry</h3>
                <p>Enter the total points scored this turn using real dice.</p>
                <div class="score-input-group">
                  <input type="number" id="manual-score-input" placeholder="Points (e.g. 750)" step="50" min="0">
                  <button id="submit-score-btn" class="btn btn-primary">Record Score</button>
                </div>
                <div class="score-quick-buttons">
                  <button class="btn btn-secondary quick-score-btn" data-points="0">BUST (0)</button>
                  <button class="btn btn-secondary quick-score-btn" data-points="500">500</button>
                  <button class="btn btn-secondary quick-score-btn" data-points="1000">1000</button>
                  <button class="btn btn-secondary quick-score-btn" data-points="1500">1500</button>
                  <button class="btn btn-secondary quick-score-btn" data-points="2000">2000</button>
                </div>
              </div>
            </div>
          ` : ''}
          
          <div id="dice-container" class="dice-container-wrapper" ${isLiveScoring ? 'style="display: none;"' : ''}></div>
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
    this.diceRenderer.on('die_clicked', (data) => {
      if (this.isRemote) {
        // Only allow clicking if it's our turn
        if (this.game.getCurrentPlayer().id === this.networkClient.playerId) {
          this.networkClient.sendAction('select', { index: data.index });
        }
      } else {
        this.updateControlStates();
      }
    });
  }

  /**
   * Handle game start event
   */
  onGameStarted({ players, currentPlayer }) {
    this.scoreBoard.update(players.map(p => p.getState()), currentPlayer.id);
    this.controls.setStatusMessage(`Game started! ${currentPlayer.name}'s turn.`);
    this.gameLog.log(`Game started with ${players.length} players.`, 'system');
    
    if (this.isRemote) {
      this.gameLog.log(`Your name: ${players.find(p => p.id === this.networkClient.playerId)?.name}`, 'info');
    }
  }

  /**
   * Handle turn start event
   */
  onTurnStarted({ player, turn }) {
    if (this.game.mode === 'live_scoring') {
      this.scoreBoard.update(this.game.players.map(p => p.getState()), player.id);
      this.scoreBoard.updateTurnScore(0);
      this.updateControlStates();
      this.gameLog.log(`--- ${player.name}'s Turn ---`, 'system');
      return;
    }

    this.diceRenderer.setTurn(turn);
    this.diceRenderer.render(turn.dice.getAllStates());
    this.scoreBoard.update(this.game.players.map(p => p.getState()), player.id);
    this.scoreBoard.updateTurnScore(0);
    this.controls.reset();
    
    const isOurTurn = this.isRemote ? player.id === this.networkClient.playerId : true;
    
    if (isOurTurn) {
      this.controls.setStatusMessage(`It's YOUR turn! Roll the dice!`, 'success');
      this.controls.setRollEnabled(true);
    } else {
      this.controls.setStatusMessage(`Waiting for ${player.name}...`, 'info');
      this.controls.setRollEnabled(false);
    }
    
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

    const isOurTurn = this.isRemote ? turn.player.id === this.networkClient.playerId : true;

    if (scoringOptions.length === 0) {
      this.controls.setStatusMessage('BUST! No scoring dice.', 'error');
      this.controls.setRollEnabled(false);
      this.controls.setBankEnabled(false);
      this.gameLog.log(`!!! BUST !!! ${turn.player.name} rolled no scoring dice.`, 'bust');
      this.triggerBustFlash();
    } else {
      if (isOurTurn) {
        this.controls.setStatusMessage('Select scoring dice to continue or bank.');
        this.updateControlStates();
      } else {
        this.controls.setStatusMessage(`${turn.player.name} is selecting dice...`);
      }
    }
  }

  /**
   * Handle dice selection event
   */
  onDiceSelected({ selectedValues, score }) {
    const turn = this.game.currentTurn;
    const isOurTurn = this.isRemote ? turn.player.id === this.networkClient.playerId : true;
    
    if (isOurTurn) {
      this.updateControlStates();
    } else {
      // Just re-render to show selection
      this.diceRenderer.render(turn.dice.getAllStates());
    }
  }

  /**
   * Handle dice banked event
   */
  onDiceBanked({ pointsScored, totalTurnScore, remainingDiceCount }) {
    const turn = this.game.currentTurn;
    const isOurTurn = this.isRemote ? turn.player.id === this.networkClient.playerId : true;

    this.scoreBoard.updateTurnScore(totalTurnScore);
    this.diceRenderer.render(turn.dice.getAllStates());
    
    if (isOurTurn) {
      this.controls.setStatusMessage(`Banked ${pointsScored} pts. ${remainingDiceCount} dice remaining.`);
      this.updateControlStates();
    } else {
      this.controls.setStatusMessage(`${turn.player.name} banked ${pointsScored} pts.`);
    }
    
    this.gameLog.log(`${turn.player.name} kept scoring dice and banked ${pointsScored} points (Turn total: ${totalTurnScore}).`, 'success');
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
      this.triggerBustFlash();
    }
  }

  /**
   * Handle hot dice event
   */
  onHotDice({ pointsScored, totalTurnScore }) {
    const turn = this.game.currentTurn;
    const isOurTurn = this.isRemote ? turn.player.id === this.networkClient.playerId : true;

    this.scoreBoard.updateTurnScore(totalTurnScore);
    this.diceRenderer.render(turn.dice.getAllStates());
    
    if (isOurTurn) {
      this.controls.setStatusMessage('HOT DICE! All dice scored. Roll again!', 'success');
      this.controls.setRollEnabled(true);
      this.controls.setBankEnabled(false);
    } else {
      this.controls.setStatusMessage(`HOT DICE! ${turn.player.name} must roll again.`);
    }
    
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
    const isLiveScoring = this.game.mode === 'live_scoring';

    if (isLiveScoring) {
      const liveInput = this.container.querySelector('#live-scoring-input');
      
      if (!turn || turn.isComplete) {
        if (liveInput) liveInput.style.display = 'none';
        return;
      }

      this.controls.hideButtons();
      
      if (liveInput) {
        liveInput.style.display = this.isHost ? 'block' : 'none';
      }

      const currentPlayer = this.game.getCurrentPlayer();
      if (this.isHost) {
        this.controls.setStatusMessage(`Recording score for ${currentPlayer.name}...`);
      } else {
        this.controls.setStatusMessage(`Waiting for ${currentPlayer.name} to roll real dice...`);
      }
      return;
    }

    if (!turn || turn.isComplete) {
      this.controls.setRollEnabled(false);
      this.controls.setBankEnabled(false);
      this.controls.updateRollButton('Roll Dice');
      return;
    }

    const currentSelectedScore = turn.getSelectedScore();
    const totalPotentialScore = turn.turnScore + currentSelectedScore;
    const hasValidSelection = turn.hasValidSelection();

    // Update Roll button text for Hot Dice (Common for all players)
    let totalScoringCount = 0;
    if (this.isRemote) {
      const diceStates = turn.dice.getAllStates();
      totalScoringCount = diceStates.filter(d => d.state === 'locked' || d.state === 'selected').length;
    } else {
      totalScoringCount = turn.dice.dice.filter(d => d.state === 'locked' || d.state === 'selected').length;
    }

    if (totalScoringCount === 6 && hasValidSelection) {
      this.controls.updateRollButton('HOT DICE!');
    } else {
      this.controls.updateRollButton('Roll Dice');
    }

    // In remote mode, we only enable controls if it's our turn
    if (this.isRemote && turn.player && turn.player.id !== this.networkClient.playerId) {
      this.controls.setRollEnabled(false);
      this.controls.setBankEnabled(false);
      this.controls.updateBankButton(totalPotentialScore);
      return;
    }

    const selectedCount = turn.dice.getSelectedCount();
    
    console.log(`[UI] updateControlStates: selectedCount=${selectedCount}, hasValidSelection=${hasValidSelection}`);
    
    // Provide feedback if they have selected dice that don't all score
    if (selectedCount > 0 && !hasValidSelection) {
      this.controls.setStatusMessage('Selected dice include non-scoring values.', 'warning');
    } else if (selectedCount > 0) {
      this.controls.setStatusMessage('You can roll again or bank these points.');
    }
    
    // Can bank if they have points AND are either already on board OR would reach 750
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
    if (this.isRemote) {
      this.networkClient.sendAction('roll');
      return;
    }

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
    if (this.isRemote) {
      this.networkClient.sendAction('bank');
      return;
    }

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

  /**
   * Set whether this player is the host (shows lock controls)
   */
  setIsHost(isHost) {
    this.isHost = isHost;
    const lockControls = this.container.querySelector('.lock-controls');
    if (lockControls) {
      lockControls.style.display = isHost ? 'block' : 'none';

      // Add click listener if not already added
      if (isHost && !this.lockListenerAdded) {
        const lockBtn = this.container.querySelector('#lock-toggle-btn');
        if (lockBtn) {
          lockBtn.addEventListener('click', () => this.toggleRoomLock());
          this.lockListenerAdded = true;
        }
      }
    }

    // Attach live scoring listeners if host
    if (isHost && this.game.mode === 'live_scoring' && !this.liveScoringListenersAdded) {
      const submitBtn = this.container.querySelector('#submit-score-btn');
      const scoreInput = this.container.querySelector('#manual-score-input');
      const quickBtns = this.container.querySelectorAll('.quick-score-btn');

      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const points = parseInt(scoreInput.value);
          if (!isNaN(points)) {
            this.submitManualScore(points);
            scoreInput.value = '';
          }
        });

        scoreInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const points = parseInt(scoreInput.value);
            if (!isNaN(points)) {
              this.submitManualScore(points);
              scoreInput.value = '';
            }
          }
        });

        quickBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const points = parseInt(btn.dataset.points);
            this.submitManualScore(points);
          });
        });

        this.liveScoringListenersAdded = true;
      }
    }

    // Important: Refresh UI state now that host status is known
    this.updateControlStates();
  }

  /**
   * Submit a manual score for the current turn
   * @param {number} points - Score to record
   */
  submitManualScore(points) {
    if (!this.isHost) return;

    if (this.isRemote) {
      this.networkClient.sendAction('record_score', { points });
    } else {
      this.game.recordLiveScore(points);
    }
  }

  /**
   * Toggle room lock status
   */
  toggleRoomLock() {
    if (!this.isHost || !this.isRemote) return;

    const newLockState = !this.roomLocked;
    this.networkClient.socket.emit('toggle_room_lock', {
      code: this.networkClient.roomCode,
      locked: newLockState
    });
  }

  /**
   * Update lock status display
   */
  updateLockStatus(isLocked) {
    this.roomLocked = isLocked;
    const lockIcon = this.container.querySelector('#lock-icon');
    const lockText = this.container.querySelector('#lock-text');

    if (lockIcon && lockText) {
      lockIcon.textContent = isLocked ? '🔒' : '🔓';
      lockText.textContent = isLocked ? 'Locked' : 'Open';

      // Update button title
      const lockBtn = this.container.querySelector('#lock-toggle-btn');
      if (lockBtn) {
        lockBtn.title = isLocked ? 'Unlock game (allow new players)' : 'Lock game (prevent new players)';
      }
    }
  }
}
