import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles the scrolling status log for game actions
 */
export class GameLog extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where the log will be rendered
   */
  constructor(container) {
    super();
    this.container = container;
    this.render();
    this.logElement = this.container.querySelector('#game-log-messages');
  }

  /**
   * Initial render of the log structure
   */
  render() {
    this.container.innerHTML = `
      <div class="game-log">
        <div class="game-log-header">Game Log</div>
        <div id="game-log-messages" class="game-log-messages">
          <div class="log-entry system-msg">Welcome to 10,000! Add players to begin.</div>
        </div>
      </div>
    `;
  }

  /**
   * Add a new entry to the log
   * @param {string} message - The message to log
   * @param {string} [type='info'] - Entry type ('info', 'error', 'success', 'system')
   */
  log(message, type = 'info') {
    const entry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-text">${message}</span>`;
    
    this.logElement.appendChild(entry);
    
    // Auto-scroll to bottom
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  /**
   * Clear the log
   */
  clear() {
    this.logElement.innerHTML = '';
  }
}
