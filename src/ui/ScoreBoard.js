import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles rendering the player scores and current game status
 */
export class ScoreBoard extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where the scoreboard will be rendered
   */
  constructor(container) {
    super();
    this.container = container;
    
    // Create scoreboard structure
    this.container.classList.add('score-board');
    this.renderHeader();
  }

  /**
   * Render the initial header
   */
  renderHeader() {
    this.container.innerHTML = `
      <div class="score-header">
        <h3>Scores</h3>
      </div>
      <div class="score-list" id="score-list">
        <!-- Players will be rendered here -->
      </div>
    `;
  }

  /**
   * Update the scoreboard with current player states
   * @param {object[]} players - Array of player state objects
   * @param {string} currentPlayerId - ID of the player whose turn it is
   */
  update(players, currentPlayerId = null) {
    const list = this.container.querySelector('#score-list');
    if (!list) return;

    list.innerHTML = players.map(player => `
      <div class="player-score-item ${player.id === currentPlayerId ? 'current-player-item' : ''} ${player.isOnBoard ? 'on-board' : ''} ${player.isOnline === false ? 'is-offline' : ''}">
        <span class="player-name">
          ${player.name}${player.id === currentPlayerId ? ' 🎲' : ''}
          ${player.isOnline === false ? '<small>(Offline)</small>' : ''}
        </span>
        <span class="player-points">${player.totalScore.toLocaleString()}</span>
        ${!player.isOnBoard ? '<span class="off-board-badge">Off Board</span>' : ''}
      </div>
    `).join('');
  }

  /**
   * Update the current turn score display
   * @param {number} turnScore - The score accumulated in the current turn
   */
  updateTurnScore(turnScore) {
    let turnScoreEl = this.container.querySelector('.current-turn-score');
    
    if (!turnScoreEl) {
      turnScoreEl = document.createElement('div');
      turnScoreEl.className = 'current-turn-score';
      this.container.appendChild(turnScoreEl);
    }

    turnScoreEl.innerHTML = `
      <span class="turn-score-label">Current Turn:</span>
      <span class="turn-score-value">${turnScore.toLocaleString()}</span>
    `;
    
    if (turnScore > 0) {
      turnScoreEl.classList.add('has-points');
    } else {
      turnScoreEl.classList.remove('has-points');
    }
  }
}
