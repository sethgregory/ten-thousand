import { Game } from './core/Game.js';
import { GameBoard } from './ui/GameBoard.js';
import { PlayerManager } from './ui/PlayerManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const gameBoardContainer = document.getElementById('game-board');
  const phaseEl = document.getElementById('game-phase');
  const newGameBtn = document.getElementById('new-game-btn');
  const addPlayerBtn = document.getElementById('add-player-btn');

  let playerManager = null;
  let gameBoard = null;

  // Initialize Setup Screen
  function showSetup() {
    gameBoardContainer.innerHTML = '';
    playerManager = new PlayerManager(gameBoardContainer, game);
    
    playerManager.on('start_game', () => {
      game.startGame();
    });
    
    phaseEl.textContent = 'Setup';
    addPlayerBtn.style.display = 'none'; // Replaced by setup screen button
  }

  // Game event listeners for phase management
  game.on('game_started', () => {
    gameBoardContainer.innerHTML = '';
    gameBoard = new GameBoard(gameBoardContainer, game);
    phaseEl.textContent = 'Playing';
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
