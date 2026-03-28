import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles player management during game setup
 */
export class PlayerManager extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where player management will be rendered
   * @param {object} game - The Game instance
   */
  constructor(container, game) {
    super();
    this.container = container;
    this.game = game;
    
    this.render();
    this.setupListeners();
  }

  /**
   * Initial render of the setup screen
   */
  render() {
    this.container.innerHTML = `
      <div class="setup-container">
        <h2>Game Setup</h2>
        <div class="player-input-group">
          <input type="text" id="player-name-input" placeholder="Enter player name" maxlength="20">
          <button id="add-player-btn-setup" class="btn btn-primary">Add Player</button>
        </div>
        <div id="player-list-setup" class="player-list-setup">
          <!-- Players will be listed here -->
        </div>
        <div class="setup-actions">
          <button id="start-game-btn" class="btn btn-accent" disabled>Start Game</button>
        </div>
      </div>
    `;
    
    this.updatePlayerList();
  }

  /**
   * Set up event listeners
   */
  setupListeners() {
    const addBtn = this.container.querySelector('#add-player-btn-setup');
    const input = this.container.querySelector('#player-name-input');
    const startBtn = this.container.querySelector('#start-game-btn');

    addBtn.addEventListener('click', () => this.handleAddPlayer());
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddPlayer();
      }
    });

    startBtn.addEventListener('click', () => {
      if (this.game.players.length > 0) {
        this.emit('start_game');
      }
    });

    // Listen for game events to update list
    this.game.on('player_added', () => this.updatePlayerList());
    this.game.on('player_removed', () => this.updatePlayerList());
  }

  /**
   * Handle adding a new player
   */
  handleAddPlayer() {
    const input = this.container.querySelector('#player-name-input');
    const name = input.value.trim();
    
    if (name) {
      try {
        this.game.addPlayer(name);
        input.value = '';
        input.focus();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  /**
   * Update the displayed list of players
   */
  updatePlayerList() {
    const list = this.container.querySelector('#player-list-setup');
    const startBtn = this.container.querySelector('#start-game-btn');
    
    if (this.game.players.length === 0) {
      list.innerHTML = '<p class="no-players">No players added yet.</p>';
      startBtn.disabled = true;
    } else {
      list.innerHTML = this.game.players.map(player => `
        <div class="player-setup-item">
          <span>${player.name}</span>
          <button class="remove-player-btn" data-id="${player.id}">&times;</button>
        </div>
      `).join('');
      
      startBtn.disabled = false;

      // Add remove listeners
      list.querySelectorAll('.remove-player-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          this.game.removePlayer(id);
        });
      });
    }
  }
}
