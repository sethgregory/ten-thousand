import { DICE_STATES } from '../utils/constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';

/**
 * Handles the visual representation and interaction of dice in the UI
 */
export class DiceRenderer extends EventEmitter {
  /**
   * @param {HTMLElement} container - The element where dice will be rendered
   * @param {object} turn - The current turn instance (optional, for direct interaction)
   */
  constructor(container, turn = null) {
    super();
    this.container = container;
    this.turn = turn;
    this.diceElements = [];
    
    // Create the dice container if it doesn't exist
    if (!this.container.classList.contains('dice-container')) {
      this.container.classList.add('dice-container');
    }
  }

  /**
   * Set the current turn instance
   * @param {object} turn - Turn instance
   */
  setTurn(turn) {
    this.turn = turn;
  }

  /**
   * Render the dice based on their current states
   * @param {object[]} diceStates - Array of die state objects {value, state, index}
   */
  render(diceStates) {
    this.container.innerHTML = '';
    this.diceElements = [];

    diceStates.forEach((dieState, index) => {
      const dieElement = this.createDieElement(dieState, index);
      this.container.appendChild(dieElement);
      this.diceElements.push(dieElement);
    });
  }

  /**
   * Create a single die DOM element
   * @param {object} dieState - Die state object
   * @param {number} index - Index of the die
   * @returns {HTMLElement} The die element
   */
  createDieElement(dieState, index) {
    const die = document.createElement('div');
    die.className = 'die';
    die.dataset.index = index;

    // Apply state classes
    if (dieState.state === DICE_STATES.SELECTED) {
      die.classList.add('die-selected');
    } else if (dieState.state === DICE_STATES.LOCKED) {
      die.classList.add('die-locked');
    } else if (dieState.value === null) {
      die.classList.add('die-empty');
    } else if (this.turn && !this.turn.canSelectDie(index)) {
      die.classList.add('die-not-scoring');
    }

    // Apply value class for pip layout
    if (dieState.value !== null) {
      die.classList.add(`die-val-${dieState.value}`);
      
      // Add pips
      for (let i = 0; i < dieState.value; i++) {
        const pip = document.createElement('div');
        pip.className = 'die-pip';
        die.appendChild(pip);
      }
    }

    // Add click listener
    die.addEventListener('click', () => this.handleDieClick(index, dieState));

    return die;
  }

  /**
   * Handle die click event
   * @param {number} index - Index of the clicked die
   * @param {object} dieState - Current state of the die
   */
  handleDieClick(index, dieState) {
    // Cannot click locked dice or empty dice
    if (dieState.state === DICE_STATES.LOCKED || dieState.value === null) {
      return;
    }

    if (this.turn) {
      try {
        const isSelected = this.turn.toggleDieSelection(index);
        this.emit('die_clicked', { index, isSelected, dieState });
        
        // Update the visual state of the clicked die
        const dieElement = this.diceElements[index];
        if (isSelected) {
          dieElement.classList.add('die-selected');
        } else {
          dieElement.classList.remove('die-selected');
        }
      } catch (error) {
        console.error('Error toggling die selection:', error.message);
        this.emit('error', error);
      }
    } else {
      this.emit('die_clicked', { index, dieState });
    }
  }

  /**
   * Update a single die's visual state without full re-render
   * @param {number} index - Index of the die
   * @param {object} dieState - New die state
   */
  updateDie(index, dieState) {
    const oldElement = this.diceElements[index];
    if (oldElement) {
      const newElement = this.createDieElement(dieState, index);
      this.container.replaceChild(newElement, oldElement);
      this.diceElements[index] = newElement;
    }
  }

  /**
   * Show "rolling" animation for available dice
   */
  animateRolling() {
    this.diceElements.forEach((die, index) => {
      // Only animate available dice that have values (just rolled)
      if (!die.classList.contains('die-selected') && 
          !die.classList.contains('die-locked') &&
          !die.classList.contains('die-empty')) {
        die.classList.add('die-rolling');
        
        // Remove class after animation
        setTimeout(() => {
          die.classList.remove('die-rolling');
        }, 500);
      }
    });
  }
}
