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
        <h2>10,000 Dice Game</h2>
        
        <div id="mode-selection" class="mode-selection">
          <button id="local-mode-btn" class="btn btn-primary">Local Multiplayer</button>
          <button id="host-mode-btn" class="btn btn-secondary">Host Online Game</button>
          <button id="join-mode-btn" class="btn btn-secondary">Join Online Game</button>
        </div>

        <div id="setup-content" class="setup-content" style="display: none;">
          <div id="back-nav" class="back-nav">
            <button id="back-btn" class="btn-link">&larr; Back</button>
          </div>
          
          <div id="local-setup" class="setup-section" style="display: none;">
            <h3>Local Game</h3>
            <div class="player-input-group">
              <input type="text" id="player-name-input" placeholder="Enter player name" maxlength="20">
              <button id="add-player-btn-setup" class="btn btn-primary">Add Player</button>
            </div>
            <div id="player-list-setup" class="player-list-setup"></div>
            <div class="setup-actions">
              <button id="start-game-btn" class="btn btn-accent" disabled>Start Game</button>
            </div>
          </div>

          <div id="host-setup" class="setup-section" style="display: none;">
            <h3>Host Game</h3>
            <div id="host-initial">
              <div class="player-input-group">
                <input type="text" id="host-name-input" placeholder="Your name" maxlength="20">
                <button id="create-game-btn" class="btn btn-primary">Create Lobby</button>
              </div>
            </div>
            <div id="host-lobby" style="display: none;">
              <div class="room-code-display">
                Room Code: <strong id="room-code-val">-----</strong>
              </div>
              <p>Share this code with your friends!</p>
              <div id="host-player-list" class="player-list-setup"></div>
              <div class="setup-actions">
                <button id="start-multi-btn" class="btn btn-accent" disabled>Start Game</button>
              </div>
            </div>
          </div>

          <div id="join-setup" class="setup-section" style="display: none;">
            <h3>Join Game</h3>
            <div id="join-initial">
              <div class="player-input-group">
                <input type="text" id="join-code-input" placeholder="5-letter code" maxlength="5" class="code-input">
                <input type="text" id="join-name-input" placeholder="Your name" maxlength="20">
                <button id="join-game-btn" class="btn btn-primary">Join</button>
              </div>
              <div class="room-list-container">
                <h4>Or select an active game:</h4>
                <div id="active-rooms-list" class="active-rooms-list">
                  <p class="no-rooms">Searching for games...</p>
                </div>
              </div>
            </div>
            <div id="join-lobby" style="display: none;">
              <p>Waiting for host to start...</p>
              <div id="join-player-list" class="player-list-setup"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Set up event listeners
   */
  setupListeners() {
    // Mode selection
    this.container.querySelector('#local-mode-btn').addEventListener('click', () => this.showSection('local'));
    this.container.querySelector('#host-mode-btn').addEventListener('click', () => this.showSection('host'));
    this.container.querySelector('#join-mode-btn').addEventListener('click', () => this.showSection('join'));
    this.container.querySelector('#back-btn').addEventListener('click', () => this.showSection('mode'));

    // Local setup
    const addBtn = this.container.querySelector('#add-player-btn-setup');
    const input = this.container.querySelector('#player-name-input');
    const startBtn = this.container.querySelector('#start-game-btn');

    addBtn.addEventListener('click', () => this.handleAddPlayer());
    input.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleAddPlayer());
    startBtn.addEventListener('click', () => this.game.players.length > 0 && this.emit('start_game', { mode: 'local' }));

    // Online setup
    this.container.querySelector('#create-game-btn').addEventListener('click', () => {
      const name = this.container.querySelector('#host-name-input').value.trim();
      if (name) this.emit('host_game', { playerName: name });
    });

    this.container.querySelector('#join-game-btn').addEventListener('click', () => {
      const code = this.container.querySelector('#join-code-input').value.trim();
      const name = this.container.querySelector('#join-name-input').value.trim();
      if (code && name) this.emit('join_game', { code, playerName: name });
    });

    this.container.querySelector('#start-multi-btn').addEventListener('click', () => {
      this.emit('start_multiplayer');
    });

    // Listen for game events
    this.game.on('player_added', () => this.updatePlayerList());
    this.game.on('player_removed', () => this.updatePlayerList());
  }

  /**
   * Switch between different setup views
   */
  showSection(section) {
    const modeSelection = this.container.querySelector('#mode-selection');
    const setupContent = this.container.querySelector('#setup-content');
    const sections = ['local', 'host', 'join'];

    if (section === 'mode') {
      modeSelection.style.display = 'block';
      setupContent.style.display = 'none';
      return;
    }

    modeSelection.style.display = 'none';
    setupContent.style.display = 'block';

    if (section === 'join') {
      this.emit('request_rooms');
    }

    sections.forEach(s => {
      this.container.querySelector(`#${s}-setup`).style.display = s === section ? 'block' : 'none';
    });
  }

  /**
   * Update the list of active multiplayer rooms
   */
  updateActiveRooms(rooms) {
    const list = this.container.querySelector('#active-rooms-list');
    if (!list) return;

    if (!rooms || rooms.length === 0) {
      list.innerHTML = '<p class="no-rooms">No active games found. Start one!</p>';
      return;
    }

    list.innerHTML = rooms.map(room => `
      <div class="room-item" data-code="${room.code}">
        <div class="room-item-main">
          <span class="room-code">${room.code}</span>
          <span class="room-info">${room.hostName}'s game</span>
        </div>
        <div class="room-item-meta">
          <span class="room-players">${room.playerCount} players</span>
          <span class="room-status status-${room.phase}">${room.phase}</span>
        </div>
      </div>
    `).join('');

    // Add click listeners to room items
    list.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        const nameInput = this.container.querySelector('#join-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
          alert('Please enter your name first!');
          nameInput.focus();
          return;
        }
        
        this.emit('join_game', { code, playerName: name });
      });
    });
  }

  /**
   * Update the UI when hosting a game
   */
  updateHostLobby(code, players) {
    this.container.querySelector('#host-initial').style.display = 'none';
    this.container.querySelector('#host-lobby').style.display = 'block';
    this.container.querySelector('#room-code-val').textContent = code;
    
    const list = this.container.querySelector('#host-player-list');
    list.innerHTML = players.map(p => `<div class="player-setup-item"><span>${p.name}</span></div>`).join('');
    
    this.container.querySelector('#start-multi-btn').disabled = players.length < 1;
  }

  /**
   * Update the UI when joining a game
   */
  updateJoinLobby(players) {
    this.container.querySelector('.player-input-group').style.display = 'none';
    this.container.querySelector('#join-lobby').style.display = 'block';
    
    const list = this.container.querySelector('#join-player-list');
    list.innerHTML = players.map(p => `<div class="player-setup-item"><span>${p.name}</span></div>`).join('');
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
