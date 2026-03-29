import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * How to Play modal component that explains the game rules
 */
export class HowToPlay extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where the modal will be rendered
   */
  constructor(container) {
    super();
    this.container = container;
    this.modal = null;
    this.render();
    this.setupListeners();
  }

  /**
   * Create and show the modal
   */
  render() {
    this.modal = document.createElement('div');
    this.modal.className = 'how-to-play-modal';
    this.modal.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>How to Play - 10,000 Dice Game</h2>
            <button class="modal-close-btn" id="close-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="rules-section">
              <h3>🎯 Objective</h3>
              <p>Be the first player to reach <strong>10,000 points</strong> and have the highest score when the game ends.</p>
            </div>

            <div class="rules-section">
              <h3>🎮 Game Flow</h3>
              <ol>
                <li>Roll all 6 dice to start your turn</li>
                <li>Select scoring dice from your roll</li>
                <li>Choose to either:
                  <ul>
                    <li><strong>Bank:</strong> Add your turn score to your total and end your turn</li>
                    <li><strong>Keep Rolling:</strong> Roll remaining dice to score more points</li>
                  </ul>
                </li>
                <li>If you roll and can't score any dice, you <strong>BUST</strong> and lose all turn points</li>
                <li>If you use all 6 dice for scoring, you get <strong>HOT DICE</strong> and can roll all 6 again</li>
              </ol>
            </div>

            <div class="rules-section">
              <h3>📊 Scoring Rules</h3>

              <div class="scoring-category">
                <h4>Individual Dice</h4>
                <ul>
                  <li><strong>1's:</strong> 100 points each</li>
                  <li><strong>5's:</strong> 50 points each</li>
                  <li>Other single dice (2, 3, 4, 6): 0 points</li>
                </ul>
              </div>

              <div class="scoring-category">
                <h4>Three of a Kind (or more)</h4>
                <ul>
                  <li><strong>Three 1's:</strong> 1,000 points</li>
                  <li><strong>Three 2's:</strong> 200 points</li>
                  <li><strong>Three 3's:</strong> 300 points</li>
                  <li><strong>Three 4's:</strong> 400 points</li>
                  <li><strong>Three 5's:</strong> 500 points</li>
                  <li><strong>Three 6's:</strong> 600 points</li>
                </ul>
                <p class="note">Each additional die beyond three <strong>doubles</strong> the score!</p>
              </div>

              <div class="scoring-category">
                <h4>Special Combinations</h4>
                <ul>
                  <li><strong>Straight (1,2,3,4,5,6):</strong> 1,000 points</li>
                  <li><strong>Three Pairs:</strong> 1,000 points</li>
                </ul>
              </div>
            </div>

            <div class="rules-section">
              <h3>🏁 Getting on the Board</h3>
              <p>You must score at least <strong>750 points</strong> in a single turn to get on the scoreboard. Until then, you have 0 points displayed.</p>
            </div>

            <div class="rules-section">
              <h3>🏆 Winning the Game</h3>
              <ol>
                <li>When a player reaches 10,000+ points, the <strong>final round</strong> begins</li>
                <li>All other players get one more turn to beat that score</li>
                <li>The player with the <strong>highest score</strong> wins!</li>
              </ol>
            </div>

            <div class="rules-section">
              <h3>💡 Strategy Tips</h3>
              <ul>
                <li>Early in the game, take more risks to build your score</li>
                <li>Later in the game, bank smaller scores to avoid busting</li>
                <li>Watch for special combinations like straights and three pairs</li>
                <li>Remember: Four of a kind is worth 2× three of a kind, five is worth 4×, six is worth 8×!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.modal);
  }

  /**
   * Set up event listeners for the modal
   */
  setupListeners() {
    const overlay = this.modal.querySelector('#modal-overlay');
    const closeBtn = this.modal.querySelector('#close-modal');

    // Close on X button click
    closeBtn.addEventListener('click', () => this.close());

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this.close();
      }
    });
  }

  /**
   * Close and remove the modal
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.emit('closed');
  }
}