import { TURN_RESULTS, GAME_CONFIG } from '../utils/constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { DiceSet } from './Dice.js';
import { Scorer } from './Scorer.js';

/**
 * Manages a single player's turn in the game
 */
export class Turn extends EventEmitter {
  constructor(player) {
    super();
    this.player = player;
    this.dice = new DiceSet();
    this.turnScore = 0;
    this.rolls = [];
    this.isComplete = false;
    this.result = null;
    this.rollCount = 0;
  }

  /**
   * Start the turn by rolling all dice
   * @returns {object} Roll result with dice values and scoring options
   */
  startTurn() {
    if (this.rollCount > 0) {
      throw new Error('Turn has already been started');
    }

    return this.rollDice();
  }

  /**
   * Roll the available dice
   * @returns {object} Roll result with dice values and scoring options
   */
  rollDice() {
    if (this.isComplete) {
      throw new Error('Cannot roll dice on completed turn');
    }

    if (!this.dice.hasRollableDice()) {
      throw new Error('No dice available to roll');
    }

    // Roll available dice
    const diceValues = this.dice.roll();
    this.rollCount++;

    // Record the roll
    const rollRecord = {
      rollNumber: this.rollCount,
      diceValues: [...diceValues],
      availableCount: this.dice.getAvailableCount(),
      timestamp: Date.now()
    };

    this.rolls.push(rollRecord);

    // Check if any dice can score
    const availableValues = this.dice.getAvailableValues();
    const canScore = Scorer.canScore(availableValues);

    if (!canScore) {
      // Bust - no scoring dice
      this.completeTurn(TURN_RESULTS.BUST);
      return {
        diceValues,
        availableValues, // Include this for the UI/Network listeners
        canScore: false,
        result: TURN_RESULTS.BUST,
        scoringOptions: []
      };
    }

    // Get scoring options for available dice
    const scoringOptions = Scorer.getScoringOptions(availableValues);

    this.emit('dice_rolled', {
      turn: this,
      rollNumber: this.rollCount,
      diceValues,
      availableValues,
      scoringOptions
    });

    return {
      diceValues,
      canScore: true,
      scoringOptions,
      availableValues
    };
  }

  /**
   * Select dice for scoring
   * @param {number[]} diceIndices - Indices of dice to select for scoring
   * @returns {object} Selection result with score and validation
   */
  selectDice(diceIndices) {
    if (this.isComplete) {
      throw new Error('Cannot select dice on completed turn');
    }

    if (!Array.isArray(diceIndices) || diceIndices.length === 0) {
      throw new Error('Must select at least one die');
    }

    // Clear any existing selections
    this.dice.clearSelections();

    // Select the specified dice
    try {
      this.dice.selectDice(diceIndices);
    } catch (error) {
      throw new Error(`Invalid dice selection: ${error.message}`);
    }

    // Validate the selection can score
    const selectedValues = this.dice.getSelectedValues();
    const scoreResult = Scorer.calculateScore(selectedValues);

    if (scoreResult.score === 0) {
      this.dice.clearSelections();
      throw new Error('Selected dice do not form a valid scoring combination');
    }

    this.emit('dice_selected', {
      turn: this,
      selectedIndices: diceIndices,
      selectedValues,
      score: scoreResult.score
    });

    return {
      selectedValues,
      score: scoreResult.score,
      combinations: scoreResult.combinations
    };
  }

  /**
   * Bank the currently selected dice and their score
   * @returns {object} Banking result
   */
  bankSelectedDice() {
    if (this.isComplete) {
      throw new Error('Cannot bank dice on completed turn');
    }

    const selectedCount = this.dice.getSelectedCount();
    if (selectedCount === 0) {
      throw new Error('No dice selected to bank');
    }

    // Calculate score for selected dice
    const selectedValues = this.dice.getSelectedValues();
    const scoreResult = Scorer.calculateScore(selectedValues);

    if (scoreResult.score === 0) {
      throw new Error('Selected dice do not score any points');
    }

    // Add to turn score
    this.turnScore += scoreResult.score;

    // Lock the selected dice
    this.dice.lockSelected();

    // Check if all dice are locked (hot dice situation)
    if (this.dice.areAllLocked()) {
      // Hot dice - must re-roll all dice
      this.dice.prepareHotDiceRoll();

      this.emit('hot_dice', {
        turn: this,
        pointsScored: scoreResult.score,
        totalTurnScore: this.turnScore
      });

      return {
        pointsScored: scoreResult.score,
        totalTurnScore: this.turnScore,
        result: TURN_RESULTS.HOT_DICE,
        canContinue: true,
        mustRoll: true
      };
    }

    // Normal banking - player can choose to continue or stop
    this.emit('dice_banked', {
      turn: this,
      pointsScored: scoreResult.score,
      totalTurnScore: this.turnScore,
      remainingDiceCount: this.dice.getAvailableCount()
    });

    return {
      pointsScored: scoreResult.score,
      totalTurnScore: this.turnScore,
      result: TURN_RESULTS.CONTINUE,
      canContinue: this.dice.hasRollableDice(),
      mustRoll: false
    };
  }

  /**
   * End the turn and bank the total score
   * @returns {object} Turn completion result
   */
  endTurn() {
    if (this.isComplete) {
      throw new Error('Turn is already complete');
    }

    // Check if player can bank their current score
    if (!this.player.canBankScore(this.turnScore)) {
      throw new Error(`Cannot bank ${this.turnScore} points. Need at least ${GAME_CONFIG.MINIMUM_BOARD_SCORE} to get on the board.`);
    }

    this.completeTurn(TURN_RESULTS.BANKED);

    return {
      result: TURN_RESULTS.BANKED,
      pointsScored: this.turnScore,
      rollCount: this.rollCount
    };
  }

  /**
   * Record a manual score for the turn (Live Scorekeeping mode)
   * @param {number} points - Points scored in the turn
   */
  recordManualScore(points) {
    if (this.isComplete) {
      throw new Error('Cannot record score on completed turn');
    }

    this.turnScore = points;
    this.completeTurn(points === 0 ? TURN_RESULTS.BUST : TURN_RESULTS.BANKED);
  }

  /**
   * Complete the turn with the specified result
   * @param {string} result - Turn result from TURN_RESULTS
   */
  completeTurn(result) {
    if (this.isComplete) {
      return;
    }

    this.result = result;
    this.isComplete = true;

    // Clear any remaining selections
    this.dice.clearSelections();

    this.emit('turn_completed', {
      turn: this,
      result,
      pointsScored: result === TURN_RESULTS.BUST ? 0 : this.turnScore,
      rollCount: this.rollCount
    });
  }

  /**
   * Get the current state of the turn
   * @returns {object} Turn state
   */
  getState() {
    return {
      playerId: this.player.id,
      playerName: this.player.name,
      turnScore: this.turnScore,
      rollCount: this.rollCount,
      isComplete: this.isComplete,
      result: this.result,
      diceStates: this.dice.getAllStates(),
      availableDiceCount: this.dice.getAvailableCount(),
      selectedDiceCount: this.dice.getSelectedCount(),
      canContinue: !this.isComplete && this.dice.hasRollableDice()
    };
  }

  /**
   * Get turn summary for recording
   * @returns {object} Turn summary
   */
  getSummary() {
    return {
      playerId: this.player.id,
      result: this.result,
      pointsScored: this.result === TURN_RESULTS.BUST ? 0 : this.turnScore,
      rollCount: this.rollCount,
      rolls: this.rolls,
      timestamp: Date.now()
    };
  }

  /**
   * Check if turn can be continued (has rollable dice and not complete)
   * @returns {boolean} True if turn can continue
   */
  canContinue() {
    return !this.isComplete && this.dice.hasRollableDice();
  }

  /**
   * Get available scoring options for current dice state
   * @returns {array} Array of scoring options
   */
  getAvailableScoringOptions() {
    if (this.isComplete) {
      return [];
    }

    const availableValues = this.dice.getAvailableValues();
    return Scorer.getScoringOptions(availableValues);
  }

  /**
   * Check if the current dice selection is valid for scoring
   * (Every selected die must be part of a scoring combination)
   * @returns {boolean} True if current selection is valid
   */
  hasValidSelection() {
    const selectedValues = this.dice.getSelectedValues();
    if (selectedValues.length === 0) return false;
    
    const result = Scorer.calculateScore(selectedValues);
    // Valid only if ALL selected dice were used in the optimal scoring set
    return result.score > 0 && result.usedDice.length === selectedValues.length;
  }

  /**
   * Get the potential score for currently selected dice
   * @returns {number} Score for selected dice, or 0 if invalid
   */
  getSelectedScore() {
    const selectedValues = this.dice.getSelectedValues();
    const result = Scorer.calculateScore(selectedValues);
    return result.score;
  }

  /**
   * Toggle selection of a specific die
   * @param {number} dieIndex - Index of die to toggle
   * @returns {boolean} New selection state
   */
  toggleDieSelection(dieIndex) {
    if (this.isComplete) {
      throw new Error('Cannot modify dice selection on completed turn');
    }

    const die = this.dice.dice[dieIndex];
    // If we're selecting a die, check if it's part of a scoring combination
    if (die && die.state === 'available' && !this.canSelectDie(dieIndex)) {
      throw new Error('This die is not part of a scoring combination and cannot be selected.');
    }

    return this.dice.toggleDieSelection(dieIndex);
  }

  /**
   * Check if a specific die can be selected
   * @param {number} dieIndex - Index of die to check
   * @returns {boolean} True if die can be selected
   */
  canSelectDie(dieIndex) {
    const die = this.dice.dice[dieIndex];
    if (!die || die.state === 'locked' || die.value === null) {
      return false;
    }

    // If it's already selected, it can be unselected
    if (die.state === 'selected') {
      return true;
    }

    // Otherwise, check if it's part of a scoring combination in the current roll
    // We need to look at both 'available' and 'selected' dice from this roll
    // to determine if a die *could* be part of a scoring combination.
    const activeDiceIndices = [];
    const activeDiceValues = [];

    for (let i = 0; i < this.dice.dice.length; i++) {
      const d = this.dice.dice[i];
      // Dice from the current roll are either 'available' or 'selected'
      if (d.state === 'available' || d.state === 'selected') {
        activeDiceIndices.push(i);
        activeDiceValues.push(d.value);
      }
    }

    // Find the relative index of this die among the active dice
    const relativeIndex = activeDiceIndices.indexOf(dieIndex);
    if (relativeIndex === -1) return false;

    const scoringIndices = Scorer.getScoringIndices(activeDiceValues);
    return scoringIndices.has(relativeIndex);
    }
    }