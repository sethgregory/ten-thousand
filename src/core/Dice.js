import { GAME_CONFIG, DICE_STATES } from '../utils/constants.js';

/**
 * Represents a single die with its value and state
 */
export class Die {
  constructor(value = null, state = DICE_STATES.AVAILABLE) {
    this.value = value;
    this.state = state;
  }

  /**
   * Roll this die to get a random value
   * @returns {number} The rolled value (1-6)
   */
  roll() {
    if (this.state !== DICE_STATES.AVAILABLE) {
      throw new Error('Cannot roll a die that is not available');
    }
    this.value = Math.floor(Math.random() * GAME_CONFIG.DICE_FACES) + 1;
    return this.value;
  }

  /**
   * Select this die for scoring
   */
  select() {
    if (this.state !== DICE_STATES.AVAILABLE) {
      throw new Error('Cannot select a die that is not available');
    }
    this.state = DICE_STATES.SELECTED;
  }

  /**
   * Unselect this die (return to available state)
   */
  unselect() {
    if (this.state !== DICE_STATES.SELECTED) {
      throw new Error('Cannot unselect a die that is not selected');
    }
    this.state = DICE_STATES.AVAILABLE;
  }

  /**
   * Lock this die (used for scoring, cannot be rolled again this turn)
   */
  lock() {
    if (this.state !== DICE_STATES.SELECTED) {
      throw new Error('Can only lock selected dice');
    }
    this.state = DICE_STATES.LOCKED;
  }

  /**
   * Reset die to available state with no value
   */
  reset() {
    this.state = DICE_STATES.AVAILABLE;
    this.value = null;
  }

  /**
   * Check if die can be selected for scoring
   * @returns {boolean} True if die can be selected
   */
  canSelect() {
    return this.state === DICE_STATES.AVAILABLE && this.value !== null;
  }

  /**
   * Check if die can be rolled
   * @returns {boolean} True if die can be rolled
   */
  canRoll() {
    return this.state === DICE_STATES.AVAILABLE;
  }

  /**
   * Get a copy of this die's current state
   * @returns {object} Die state object
   */
  getState() {
    return {
      value: this.value,
      state: this.state
    };
  }
}

/**
 * Manages a collection of dice for the game
 */
export class DiceSet {
  constructor() {
    this.dice = Array.from({ length: GAME_CONFIG.DICE_COUNT }, () => new Die());
  }

  /**
   * Roll all available dice
   * @returns {number[]} Array of rolled values
   */
  roll() {
    const availableDice = this.dice.filter(die => die.canRoll());

    if (availableDice.length === 0) {
      throw new Error('No dice available to roll');
    }

    const rolledValues = availableDice.map(die => die.roll());
    return this.getValues();
  }

  /**
   * Get all current dice values
   * @returns {number[]} Array of dice values (null for unrolled dice)
   */
  getValues() {
    return this.dice.map(die => die.value);
  }

  /**
   * Get values of only the available (rollable) dice
   * @returns {number[]} Array of available dice values
   */
  getAvailableValues() {
    return this.dice
      .filter(die => die.state === DICE_STATES.AVAILABLE && die.value !== null)
      .map(die => die.value);
  }

  /**
   * Get values of selected dice
   * @returns {number[]} Array of selected dice values
   */
  getSelectedValues() {
    return this.dice
      .filter(die => die.state === DICE_STATES.SELECTED)
      .map(die => die.value);
  }

  /**
   * Get indices of selected dice
   * @returns {number[]} Array of selected dice indices
   */
  getSelectedIndices() {
    return this.dice
      .map((die, index) => die.state === DICE_STATES.SELECTED ? index : -1)
      .filter(index => index !== -1);
  }

  /**
   * Select dice at specified indices
   * @param {number[]} indices - Array of dice indices to select
   */
  selectDice(indices) {
    indices.forEach(index => {
      if (index >= 0 && index < this.dice.length) {
        this.dice[index].select();
      }
    });
  }

  /**
   * Unselect dice at specified indices
   * @param {number[]} indices - Array of dice indices to unselect
   */
  unselectDice(indices) {
    indices.forEach(index => {
      if (index >= 0 && index < this.dice.length) {
        this.dice[index].unselect();
      }
    });
  }

  /**
   * Clear all selections (return selected dice to available state)
   */
  clearSelections() {
    this.dice.forEach(die => {
      if (die.state === DICE_STATES.SELECTED) {
        die.unselect();
      }
    });
  }

  /**
   * Lock selected dice (finalize them for scoring)
   */
  lockSelected() {
    this.dice.forEach(die => {
      if (die.state === DICE_STATES.SELECTED) {
        die.lock();
      }
    });
  }

  /**
   * Reset all dice for a new turn
   */
  resetForNewTurn() {
    this.dice.forEach(die => die.reset());
  }

  /**
   * Check if all dice are locked (hot dice situation)
   * @returns {boolean} True if all dice are locked
   */
  areAllLocked() {
    return this.dice.every(die => die.state === DICE_STATES.LOCKED);
  }

  /**
   * Get count of available dice (can be rolled)
   * @returns {number} Number of available dice
   */
  getAvailableCount() {
    return this.dice.filter(die => die.canRoll()).length;
  }

  /**
   * Get count of selected dice
   * @returns {number} Number of selected dice
   */
  getSelectedCount() {
    return this.dice.filter(die => die.state === DICE_STATES.SELECTED).length;
  }

  /**
   * Get complete state of all dice
   * @returns {object[]} Array of dice state objects
   */
  getAllStates() {
    return this.dice.map((die, index) => ({
      index,
      ...die.getState()
    }));
  }

  /**
   * Toggle selection of a die at the specified index
   * @param {number} index - Index of die to toggle
   * @returns {boolean} New selection state (true if selected)
   */
  toggleDieSelection(index) {
    if (index < 0 || index >= this.dice.length) {
      throw new Error('Invalid die index');
    }

    const die = this.dice[index];

    if (die.state === DICE_STATES.AVAILABLE && die.canSelect()) {
      die.select();
      return true;
    } else if (die.state === DICE_STATES.SELECTED) {
      die.unselect();
      return false;
    }

    throw new Error('Cannot toggle selection on this die');
  }

  /**
   * Check if we have any dice that can be rolled
   * @returns {boolean} True if there are rollable dice
   */
  hasRollableDice() {
    return this.getAvailableCount() > 0;
  }

  /**
   * Prepare for "hot dice" - reset all dice when all 6 were scored
   */
  prepareHotDiceRoll() {
    if (!this.areAllLocked()) {
      throw new Error('Can only prepare hot dice roll when all dice are locked');
    }

    // Reset all dice to available state for a fresh roll
    this.dice.forEach(die => die.reset());
  }
}