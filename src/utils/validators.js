import { GAME_CONFIG, SCORING_RULES } from './constants.js';

/**
 * Validation utilities for game inputs and states
 */

/**
 * Validates if a player name is acceptable
 * @param {string} name - Player name to validate
 * @returns {object} {isValid: boolean, error?: string}
 */
export function validatePlayerName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Player name is required.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Player name cannot be empty.' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Player name must be 20 characters or less.' };
  }

  return { isValid: true };
}

/**
 * Validates dice selection for scoring
 * @param {number[]} diceValues - Values of dice being selected
 * @param {number[]} selectedIndices - Indices of selected dice
 * @returns {object} {isValid: boolean, error?: string}
 */
export function validateDiceSelection(diceValues, selectedIndices) {
  if (!selectedIndices || selectedIndices.length === 0) {
    return { isValid: false, error: 'You must select at least one die.' };
  }

  // Check if selected indices are valid
  for (const index of selectedIndices) {
    if (index < 0 || index >= diceValues.length) {
      return { isValid: false, error: 'Invalid dice selection.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates if dice values form a valid scoring combination
 * @param {number[]} diceValues - Values of the dice
 * @returns {boolean} True if dice can score points
 */
export function canScore(diceValues) {
  if (!diceValues || diceValues.length === 0) {
    return false;
  }

  // Check for individual scoring dice (1s and 5s)
  const hasIndividualScoring = diceValues.some(value =>
    SCORING_RULES.INDIVIDUAL[value] !== undefined
  );

  if (hasIndividualScoring) {
    return true;
  }

  // Check for three of a kind
  const counts = getDiceCounts(diceValues);
  const hasThreeOfKind = Object.values(counts).some(count => count >= 3);

  if (hasThreeOfKind) {
    return true;
  }

  // Check for straight (if we have exactly 6 dice)
  if (diceValues.length === GAME_CONFIG.DICE_COUNT) {
    const uniqueValues = new Set(diceValues);
    if (uniqueValues.size === 6 &&
        Array.from(uniqueValues).every(val => val >= 1 && val <= 6)) {
      return true; // Straight: 1,2,3,4,5,6
    }
  }

  // Check for three pairs (if we have exactly 6 dice)
  if (diceValues.length === GAME_CONFIG.DICE_COUNT) {
    const countsArray = Object.values(counts);
    if (countsArray.length === 3 && countsArray.every(count => count === 2)) {
      return true; // Three pairs
    }
  }

  return false;
}

/**
 * Helper function to count occurrences of each die value
 * @param {number[]} diceValues - Array of dice values
 * @returns {object} Object mapping die value to count
 */
export function getDiceCounts(diceValues) {
  const counts = {};
  for (const value of diceValues) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

/**
 * Validates if a score is valid for banking
 * @param {number} score - Score to validate
 * @param {boolean} isOnBoard - Whether player is already on the board
 * @returns {object} {isValid: boolean, error?: string}
 */
export function validateBankScore(score, isOnBoard) {
  if (typeof score !== 'number' || score < 0) {
    return { isValid: false, error: 'Invalid score value.' };
  }

  if (!isOnBoard && score < GAME_CONFIG.MINIMUM_BOARD_SCORE) {
    return {
      isValid: false,
      error: `You need at least ${GAME_CONFIG.MINIMUM_BOARD_SCORE} points to get on the board.`
    };
  }

  return { isValid: true };
}

/**
 * Validates game configuration
 * @param {object} config - Game configuration to validate
 * @returns {object} {isValid: boolean, errors?: string[]}
 */
export function validateGameConfig(config) {
  const errors = [];

  if (!config) {
    errors.push('Game configuration is required.');
    return { isValid: false, errors };
  }

  if (!Array.isArray(config.players) || config.players.length === 0) {
    errors.push('At least one player is required.');
  }

  if (config.players && config.players.length > 8) {
    errors.push('Maximum 8 players allowed.');
  }

  // Validate player names are unique
  if (config.players) {
    const names = config.players.map(p => p.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      errors.push('Player names must be unique.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}