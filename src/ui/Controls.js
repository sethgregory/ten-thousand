import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles the game controls (Roll, Bank buttons)
 */
export class Controls extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where controls will be rendered
   */
  constructor(container) {
    super();
    this.container = container;
    this.render();
    
    this.rollBtn = this.container.querySelector('#roll-btn');
    this.bankBtn = this.container.querySelector('#bank-btn');
    this.statusMsg = this.container.querySelector('#turn-status-msg');
    
    this.setupListeners();
  }

  /**
   * Initial render of controls
   */
  render() {
    this.container.innerHTML = `
      <div class="game-controls-container">
        <div id="turn-status-msg" class="turn-status-msg">Welcome!</div>
        <div class="control-buttons">
          <button id="roll-btn" class="btn btn-primary" disabled>Roll Dice</button>
          <button id="bank-btn" class="btn btn-accent" disabled>Bank Points</button>
        </div>
      </div>
    `;
  }

  /**
   * Set up internal event listeners
   */
  setupListeners() {
    this.rollBtn.addEventListener('click', () => this.emit('roll_clicked'));
    this.bankBtn.addEventListener('click', () => this.emit('bank_clicked'));
  }

  /**
   * Enable/disable the roll button
   * @param {boolean} enabled - True to enable, false to disable
   */
  setRollEnabled(enabled) {
    this.rollBtn.disabled = !enabled;
  }

  /**
   * Enable/disable the bank button
   * @param {boolean} enabled - True to enable, false to disable
   */
  setBankEnabled(enabled) {
    this.bankBtn.disabled = !enabled;
  }

  /**
   * Update the status message text
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Message type ('info', 'error', 'success', 'warning')
   */
  setStatusMessage(message, type = 'info') {
    this.statusMsg.textContent = message;
    this.statusMsg.className = `turn-status-msg turn-status-${type}`;
  }

  /**
   * Update the label of the bank button
   * @param {number} points - Points that would be banked
   */
  updateBankButton(points) {
    if (points > 0) {
      this.bankBtn.textContent = `Bank ${points.toLocaleString()} Points`;
    } else {
      this.bankBtn.textContent = 'Bank Points';
    }
  }

  /**
   * Reset controls to default state
   */
  reset() {
    this.setRollEnabled(false);
    this.setBankEnabled(false);
    this.setStatusMessage('Game started!');
    this.bankBtn.textContent = 'Bank Points';
  }
}
