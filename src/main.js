import { Game } from './core/Game.js';
import { GameBoard } from './ui/GameBoard.js';
import { PlayerManager } from './ui/PlayerManager.js';
import { NetworkClient } from './utils/NetworkClient.js';
import { Scorer } from './core/Scorer.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  // Connect to the same host/port as the frontend (Vite will proxy /socket.io to 3001)
  const serverUrl = `${window.location.protocol}//${window.location.host}`;
  const networkClient = new NetworkClient(serverUrl);
  const gameBoardContainer = document.getElementById('game-board');
  const phaseEl = document.getElementById('game-phase');
  const newGameBtn = document.getElementById('new-game-btn');
  const addPlayerBtn = document.getElementById('add-player-btn');

  let playerManager = null;
  let gameBoard = null;

  // Helper function to add game board event listeners
  function setupGameBoardListeners(gameBoard) {
    gameBoard.on('return_to_menu', () => {
      showSetup();
    });

    gameBoard.on('restart_game', () => {
      game.resetGame();
      showSetup();
    });
  }

  // Initialize Setup Screen
  function showSetup() {
    gameBoardContainer.innerHTML = '';
    gameBoard = null; // Clear existing game board reference
    playerManager = new PlayerManager(gameBoardContainer, game, networkClient);
    
    playerManager.on('start_game', ({ mode }) => {
      if (mode === 'local') {
        game.startGame();
      }
    });

    playerManager.on('host_game', ({ playerName }) => {
      game.players = []; // Clear any local players
      networkClient.createGame(playerName);
    });

    playerManager.on('join_game', ({ code, playerName }) => {
      game.players = []; // Clear any local players
      networkClient.joinGame(code, playerName);
    });

    playerManager.on('start_multiplayer', () => {
      networkClient.startGame();
    });

    playerManager.on('start_live_scoring', ({ scorekeeperName }) => {
      console.log(`[main] start_live_scoring received for ${scorekeeperName}`);
      game.players = [];
      networkClient.createLiveGame(scorekeeperName);
    });

    playerManager.on('begin_live_game', () => {
      console.log('[main] begin_live_game received');
      networkClient.startLiveGame();
    });

    playerManager.on('request_rooms', () => {
      networkClient.listRooms();
    });
    
    phaseEl.textContent = 'Setup';
    addPlayerBtn.style.display = 'none';
  }

  // Network event listeners
  networkClient.on('game_created', ({ code, gameState, hostId, isLocked }) => {
    console.log(`[main] game_created received: code=${code}, mode=${gameState.mode}`);
    syncGameState(gameState);
    if (game.mode === 'live_scoring') {
      console.log(`[main] updating live lobby for code ${code}`);
      playerManager.updateLiveLobby(code, game.players);
    } else {
      playerManager.updateHostLobby(code, game.players);
    }
    // Store initial lock status
    networkClient.currentLockStatus = isLocked;
  });

  networkClient.on('game_joined', ({ code, gameState, hostId, isLocked }) => {
    syncGameState(gameState);
    playerManager.showSection('join');
    playerManager.updateJoinLobby(game.players);
    // Store initial lock status
    networkClient.currentLockStatus = isLocked;
  });

  networkClient.on('player_joined', ({ gameState }) => {
    syncGameState(gameState);
    if (networkClient.isHost) {
      if (game.mode === 'live_scoring') {
        playerManager.updateLiveLobby(networkClient.roomCode, game.players);
      } else {
        playerManager.updateHostLobby(networkClient.roomCode, game.players);
      }
    } else {
      playerManager.updateJoinLobby(game.players);
    }
  });

  networkClient.on('game_started', ({ gameState }) => {
    syncGameState(gameState);
    gameBoardContainer.innerHTML = '';
    gameBoard = new GameBoard(gameBoardContainer, game, networkClient);
    setupGameBoardListeners(gameBoard);
    gameBoard.setIsHost(networkClient.isHost);
    gameBoard.updateLockStatus(networkClient.currentLockStatus || false);
    phaseEl.textContent = game.mode === 'live_scoring' ? 'Live Scorekeeping' : 'Playing (Online)';

    // Log first turn start
    const currentPlayer = game.getCurrentPlayer();
    if (currentPlayer) {
      gameBoard.gameLog.log(`--- ${currentPlayer.name}'s Turn ---`, 'system');
    }
  });

  networkClient.on('state_updated', ({ gameState, lastAction }) => {
    const oldPlayerId = game.getCurrentPlayer()?.id;
    syncGameState(gameState);
    const newPlayerId = game.getCurrentPlayer()?.id;

    if (gameBoard) {
      // Log the specific action that occurred
      if (lastAction) {
        gameBoard.handleRemoteAction(lastAction);
      }
      
      // Log turn transition if player changed
      if (oldPlayerId !== newPlayerId && newPlayerId) {
        const newPlayer = game.getCurrentPlayer();
        gameBoard.gameLog.log(`--- ${newPlayer.name}'s Turn ---`, 'system');
      }
    } else if (game.phase === 'setup' && networkClient.roomCode) {
        // Update lobby if player count changed
        if (networkClient.isHost) {
          if (game.mode === 'live_scoring') {
            playerManager.updateLiveLobby(networkClient.roomCode, game.players);
          } else {
            playerManager.updateHostLobby(networkClient.roomCode, game.players);
          }
        } else {
          playerManager.updateJoinLobby(game.players);
        }
    }
  });

  networkClient.on('error', ({ message }) => {
    alert(message);
  });

  networkClient.on('rooms_list', ({ rooms }) => {
    if (playerManager) {
      playerManager.updateActiveRooms(rooms);
    }
  });

  networkClient.on('room_lock_changed', ({ isLocked, hostId }) => {
    if (gameBoard) {
      gameBoard.updateLockStatus(isLocked);
      // Also update host status in case this event arrives after rejoining
      gameBoard.setIsHost(networkClient.playerId === hostId);
    }
  });

  /**
   * Helper to sync local game object with server state
   */
  function syncGameState(state) {
    game.syncState(state);

    // Sync current turn if it exists
    if (state.currentTurn) {
      const turnData = state.currentTurn;
      
      // Create a simplified Turn proxy
      const turnProxy = {
        player: game.players.find(p => p.id === turnData.playerId),
        dice: { 
          getAllStates: () => turnData.diceStates,
          getSelectedCount: () => turnData.diceStates.filter(d => d.state === 'selected').length,
          getSelectedValues: () => turnData.diceStates.filter(d => d.state === 'selected').map(d => d.value)
        },
        turnScore: turnData.turnScore,
        isComplete: turnData.isComplete,
        
        hasValidSelection() {
          const selected = turnData.diceStates
            .filter(d => d.state === 'selected')
            .map(d => d.value);
          
          if (selected.length === 0) return false;
          
          const result = Scorer.calculateScore(selected);
          return result.score > 0 && result.usedDice.length === selected.length;
        },
        
        getSelectedScore() {
          const selected = turnData.diceStates.filter(d => d.state === 'selected').map(d => d.value);
          return Scorer.calculateScore(selected).score;
        },
        
        canSelectDie(dieIndex) {
          const die = turnData.diceStates[dieIndex];
          if (!die || die.state === 'locked' || die.value === null) return false;
          if (die.state === 'selected') return true;

          const activeIndices = [];
          const activeValues = [];
          turnData.diceStates.forEach((d, i) => {
            if (d.state === 'available' || d.state === 'selected') {
              activeIndices.push(i);
              activeValues.push(d.value);
            }
          });

          const relIdx = activeIndices.indexOf(dieIndex);
          if (relIdx === -1) return false;
          return Scorer.getScoringIndices(activeValues).has(relIdx);
        },
        
        toggleDieSelection(index) { return false; }
      };

      game.currentTurn = turnProxy;
    } else {
      game.currentTurn = null;
    }

    // Auto-transition to GameBoard if game is playing but board not shown
    if (game.phase === 'playing' && !gameBoard) {
      gameBoardContainer.innerHTML = '';
      gameBoard = new GameBoard(gameBoardContainer, game, networkClient);
      setupGameBoardListeners(gameBoard);
      gameBoard.setIsHost(networkClient.isHost);
      gameBoard.updateLockStatus(networkClient.currentLockStatus || false);
      phaseEl.textContent = 'Playing (Online)';
    }

    // Trigger UI updates
    if (gameBoard) {
      // Vital: Update the renderer with the fresh turn proxy
      gameBoard.diceRenderer.setTurn(game.currentTurn);
      
      gameBoard.scoreBoard.update(game.players.map(p => p.getState()), state.currentPlayer?.id);
      
      if (state.currentTurn) {
        gameBoard.scoreBoard.updateTurnScore(state.currentTurn.turnScore);
        gameBoard.diceRenderer.render(state.currentTurn.diceStates);
      } else {
        // If no turn, clear dice and turn score
        gameBoard.diceRenderer.render(Array(6).fill({ value: null, state: 'available' }));
        gameBoard.scoreBoard.updateTurnScore(0);
      }
      gameBoard.updateControlStates();

      // Check for phase transitions (e.g., game ending in multiplayer)
      gameBoard.checkPhaseTransition();
    }
  }

  // Game event listeners for phase management
  game.on('game_started', () => {
    if (!gameBoard) {
      gameBoardContainer.innerHTML = '';
      gameBoard = new GameBoard(gameBoardContainer, game);
      setupGameBoardListeners(gameBoard);
      phaseEl.textContent = 'Playing';
    }
  });

  game.on('final_round_started', () => {
    phaseEl.textContent = 'Final Round!';
    phaseEl.classList.add('final-round-active');
  });

  game.on('game_ended', () => {
    phaseEl.textContent = 'Game Ended';
  });

  // UI Event listeners
  newGameBtn.addEventListener('click', () => {
    if (confirm('Start a new game? Current progress will be lost.')) {
      location.reload();
    }
  });

  // Start with setup
  showSetup();
});
