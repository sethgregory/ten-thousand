import { EventEmitter } from '../utils/EventEmitter.js';
import { UserConfig } from '../utils/UserConfig.js';
import { HowToPlay } from './HowToPlay.js';

/**
 * Handles player management during game setup
 */
export class PlayerManager extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where player management will be rendered
   * @param {object} game - The Game instance
   * @param {object} networkClient - The NetworkClient instance
   */
  constructor(container, game, networkClient) {
    super();
    this.container = container;
    this.game = game;
    this.networkClient = networkClient;
    this.userName = UserConfig.getUserName();

    this.render();
    this.setupListeners();
  }

  /**
   * Initial render of the setup screen
   */
  render() {
    const welcomeMessage = this.userName
      ? `Welcome, ${this.userName}`
      : 'Welcome, Player';

    this.container.innerHTML = `
      <div class="setup-container">
        <div class="welcome-header">
          <h2 id="welcome-message">${welcomeMessage}</h2>
          <button id="edit-name-btn" class="btn-link edit-name-btn" title="Edit your name">✏️</button>
        </div>
        
        <div id="mode-selection" class="mode-selection">
          <button id="local-mode-btn" class="btn btn-primary">Local Multiplayer</button>
          <button id="host-mode-btn" class="btn btn-secondary">Host Online Game</button>
          <button id="join-mode-btn" class="btn btn-secondary">Join Online Game</button>
          <button id="live-scoring-btn" class="btn btn-accent">🎲 Live Scorekeeping</button>
          <button id="how-to-play-btn" class="how-to-play-btn">📖 How to Play</button>
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
              <div class="join-input-group">
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
              <div class="join-input-group">
                <input type="text" id="join-code-input" placeholder="5-letter code" maxlength="5" class="code-input">
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

          <div id="live-scoring-setup" class="setup-section" style="display: none;">
            <h3>Live Scorekeeping</h3>
            <p class="mode-description">Track scores for an in-person game with real dice. Players can connect to watch the scoreboard.</p>
            <div id="live-initial">
              <div class="player-input-group">
                <input type="text" id="live-scorekeeper-input" placeholder="Your name (scorekeeper)" maxlength="20">
                <button id="start-live-btn" class="btn btn-primary">Start Scorekeeping</button>
              </div>
            </div>
            <div id="live-lobby" style="display: none;">
              <div class="room-code-display">
                Spectator Code: <strong id="live-room-code">-----</strong>
              </div>
              <p>Share this code so others can watch the game!</p>
              <div class="player-input-group">
                <input type="text" id="live-player-input" placeholder="Add player name" maxlength="20">
                <button id="add-live-player-btn" class="btn btn-primary">Add Player</button>
              </div>
              <div id="live-player-list" class="player-list-setup"></div>
              <div class="setup-actions">
                <button id="begin-live-game-btn" class="btn btn-accent" disabled>Begin Game</button>
              </div>
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
    // Name editing
    this.container.querySelector('#edit-name-btn').addEventListener('click', () => this.editUserName());

    // How to Play button
    this.container.querySelector('#how-to-play-btn').addEventListener('click', () => this.showHowToPlay());

    // Mode selection
    this.container.querySelector('#local-mode-btn').addEventListener('click', () => this.showSection('local'));
    this.container.querySelector('#host-mode-btn').addEventListener('click', () => this.showSection('host'));
    this.container.querySelector('#join-mode-btn').addEventListener('click', () => this.showSection('join'));
    this.container.querySelector('#live-scoring-btn').addEventListener('click', () => this.showSection('live-scoring'));
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
      if (this.userName) {
        this.emit('host_game', { playerName: this.userName });
      } else {
        alert('Please set your name first using the edit button at the top.');
      }
    });

    this.container.querySelector('#join-game-btn').addEventListener('click', () => {
      const code = this.container.querySelector('#join-code-input').value.trim();
      if (code) {
        if (this.userName) {
          this.emit('join_game', { code, playerName: this.userName });
        } else {
          alert('Please set your name first using the edit button at the top.');
        }
      } else {
        alert('Please enter a room code.');
      }
    });

    this.container.querySelector('#start-multi-btn').addEventListener('click', () => {
      this.emit('start_multiplayer');
    });

    // Live scoring setup
    this.container.querySelector('#start-live-btn').addEventListener('click', () => {
      const nameInput = this.container.querySelector('#live-scorekeeper-input');
      const name = nameInput ? nameInput.value.trim() : '';
      console.log(`[PlayerManager] start-live-btn clicked, name: "${name}"`);
      if (name) {
        this.saveUserName(name);
        console.log(`[PlayerManager] Emitting start_live_scoring for ${name}`);
        this.emit('start_live_scoring', { scorekeeperName: name });
      } else {
        alert('Please enter your name to start scorekeeping.');
        if (nameInput) nameInput.focus();
      }
    });

    this.container.querySelector('#add-live-player-btn').addEventListener('click', () => {
      this.handleAddLivePlayer();
    });

    this.container.querySelector('#live-player-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddLivePlayer();
      }
    });

    this.container.querySelector('#begin-live-game-btn').addEventListener('click', () => {
      this.emit('begin_live_game');
    });

    // Listen for game events
    this.game.on('player_added', () => this.updatePlayerList());
    this.game.on('player_removed', () => this.updatePlayerList());

    // Pre-populate name fields with stored name
    this.prefillNameFields();
  }

  /**
   * Pre-fill name input fields with the stored user name
   */
  prefillNameFields() {
    if (this.userName) {
      const playerNameInput = this.container.querySelector('#player-name-input');
      const liveScorekeeperInput = this.container.querySelector('#live-scorekeeper-input');

      if (playerNameInput) playerNameInput.value = this.userName;
      if (liveScorekeeperInput) liveScorekeeperInput.value = this.userName;
    }
  }

  /**
   * Handle editing the user name
   */
  editUserName() {
    const currentName = this.userName || '';
    const newName = prompt('Enter your name:', currentName);

    if (newName !== null && newName.trim() !== '') {
      const trimmedName = newName.trim();
      if (trimmedName.length <= 20) {
        this.userName = trimmedName;
        UserConfig.setUserName(trimmedName);
        this.updateWelcomeMessage();
        this.prefillNameFields();
      } else {
        alert('Name must be 20 characters or less.');
      }
    }
  }

  /**
   * Update the welcome message display
   */
  updateWelcomeMessage() {
    const welcomeEl = this.container.querySelector('#welcome-message');
    if (welcomeEl) {
      welcomeEl.textContent = this.userName ? `Welcome, ${this.userName}` : 'Welcome, Player';
    }
  }

  /**
   * Show the How to Play modal
   */
  showHowToPlay() {
    const howToPlay = new HowToPlay(document.body);
    howToPlay.on('closed', () => {
      // Modal cleanup is handled by the HowToPlay component itself
    });
  }

  /**
   * Update the UI when starting live scoring
   */
  updateLiveLobby(code, players) {
    this.container.querySelector('#live-initial').style.display = 'none';
    this.container.querySelector('#live-lobby').style.display = 'block';
    this.container.querySelector('#live-room-code').textContent = code;

    const list = this.container.querySelector('#live-player-list');
    list.innerHTML = players.map(p => `
      <div class="player-setup-item">
        <span>${p.name}</span>
        <button class="remove-player-btn" data-id="${p.id}">&times;</button>
      </div>
    `).join('');

    // Add remove listeners
    list.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (this.networkClient && this.networkClient.roomCode) {
          this.networkClient.sendAction('remove_player', { id });
        } else {
          this.game.removePlayer(id);
        }
      });
    });

    this.container.querySelector('#begin-live-game-btn').disabled = players.length < 2;
  }

  /**
   * Handle adding a player to live scoring
   */
  handleAddLivePlayer() {
    const input = this.container.querySelector('#live-player-input');
    const name = input.value.trim();

    if (name) {
      try {
        if (this.networkClient && this.networkClient.roomCode) {
          this.networkClient.sendAction('add_player', { name });
        } else {
          this.game.addPlayer(name);
        }
        input.value = '';
        input.focus();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  /**
   * Switch between different setup views
   */
  showSection(section) {
    const modeSelection = this.container.querySelector('#mode-selection');
    const setupContent = this.container.querySelector('#setup-content');
    const sections = ['local', 'host', 'join', 'live-scoring'];

    if (section === 'mode') {
      modeSelection.style.display = 'flex';
      modeSelection.style.flexDirection = 'column';
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
      <div class="room-item ${room.canJoin ? 'joinable' : 'locked'}" data-code="${room.code}" data-can-join="${room.canJoin}">
        <div class="room-item-main">
          <span class="room-code">${room.code}</span>
          <span class="room-info">${room.hostName}'s game ${room.isLocked ? '🔒' : ''}</span>
        </div>
        <div class="room-item-meta">
          <span class="room-players">${room.playerCount} players</span>
          <span class="room-status status-${room.phase}">${room.phase}</span>
        </div>
        ${!room.canJoin ? '<div class="room-locked-overlay">🔒 Locked</div>' : ''}
      </div>
    `).join('');

    // Add click listeners to room items
    list.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        const canJoin = item.dataset.canJoin === 'true';

        if (!canJoin) {
          alert('This game is locked by the host and cannot be joined.');
          return;
        }

        if (this.userName) {
          this.emit('join_game', { code, playerName: this.userName });
        } else {
          alert('Please set your name first using the edit button at the top!');
        }
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
    this.container.querySelector('#join-initial').style.display = 'none';
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
        this.saveUserName(name);
        this.game.addPlayer(name);
        input.value = '';
        input.focus();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  /**
   * Save user name and update UI
   */
  saveUserName(name) {
    if (name && name !== this.userName) {
      this.userName = name;
      UserConfig.setUserName(name);
      this.updateWelcomeMessage();
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
