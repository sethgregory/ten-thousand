import { SCORING_RULES, GAME_CONFIG, COMBO_TYPES } from '../utils/constants.js';
import { getDiceCounts } from '../utils/validators.js';

/**
 * Comprehensive scoring engine that handles all game scoring rules
 */
export class Scorer {
  /**
   * Calculate the score for a set of dice using optimal scoring strategy
   * @param {number[]} diceValues - Array of dice values (1-6)
   * @returns {object} {score: number, combinations: array, usedDice: array}
   */
  static calculateScore(diceValues) {
    if (!diceValues || diceValues.length === 0) {
      return { score: 0, combinations: [], usedDice: [] };
    }

    // Find all possible base scoring combinations
    const allCombos = this.findAllCombinations(diceValues);

    if (allCombos.length === 0) {
      return { score: 0, combinations: [], usedDice: [] };
    }

    /**
     * Recursive helper to find the best subset of non-overlapping combinations
     * @param {number[]} remainingIndices - Indices of dice still available
     * @param {object[]} combosToTry - Array of combination objects to consider
     * @returns {object} Best result found {score, combinations, usedIndices}
     */
    const findBestSet = (remainingIndices, combosToTry) => {
      let bestResult = { score: 0, combinations: [], usedIndices: [] };

      for (let i = 0; i < combosToTry.length; i++) {
        const combo = combosToTry[i];
        
        // Check if all dice in this combination are still available
        const canUse = combo.usedDice.every(idx => remainingIndices.includes(idx));
        
        if (canUse) {
          // Calculate score with this combo included
          const newRemaining = remainingIndices.filter(idx => !combo.usedDice.includes(idx));
          // Optimization: Only try combos further down the list to avoid duplicate sets
          const result = findBestSet(newRemaining, combosToTry.slice(i + 1));
          
          const totalScore = combo.score + result.score;
          if (totalScore > bestResult.score) {
            bestResult = {
              score: totalScore,
              combinations: [combo, ...result.combinations],
              usedIndices: [...combo.usedDice, ...result.usedIndices]
            };
          }
        }
      }
      
      return bestResult;
    };

    const initialIndices = Array.from({ length: diceValues.length }, (_, i) => i);
    const finalResult = findBestSet(initialIndices, allCombos);

    return {
      score: finalResult.score,
      combinations: finalResult.combinations,
      usedDice: finalResult.usedIndices
    };
  }

  /**
   * Find all possible scoring combinations from a set of dice
   * @param {number[]} diceValues - Array of dice values
   * @returns {array} Array of combination objects
   */
  static findAllCombinations(diceValues) {
    const combinations = [];

    // Check for straight (all 6 dice: 1,2,3,4,5,6)
    if (diceValues.length === GAME_CONFIG.DICE_COUNT) {
      const straightCombo = this.checkStraight(diceValues);
      if (straightCombo) {
        combinations.push(straightCombo);
      }

      // Check for three pairs (all 6 dice forming 3 pairs)
      const pairsCombo = this.checkThreePairs(diceValues);
      if (pairsCombo) {
        combinations.push(pairsCombo);
      }
    }

    // Check for N-of-a-kind combinations
    const nOfKindCombos = this.checkNOfKind(diceValues);
    combinations.push(...nOfKindCombos);

    // Check for individual scoring dice combinations
    const individualCombos = this.checkIndividualScoring(diceValues);
    combinations.push(...individualCombos);

    return combinations;
  }

  /**
   * Get indices of all dice that are part of any scoring combination in the set
   * @param {number[]} diceValues - Array of dice values
   * @returns {Set<number>} Set of scoring indices
   */
  static getScoringIndices(diceValues) {
    const scoringIndices = new Set();
    if (!diceValues || diceValues.length === 0) return scoringIndices;

    // Check for straight (all 6 dice: 1,2,3,4,5,6)
    const straight = this.checkStraight(diceValues);
    if (straight) {
      straight.usedDice.forEach(idx => scoringIndices.add(idx));
    }

    // Check for three pairs (all 6 dice forming 3 pairs)
    const pairs = this.checkThreePairs(diceValues);
    if (pairs) {
      pairs.usedDice.forEach(idx => scoringIndices.add(idx));
    }

    // Check for N-of-a-kind combinations
    const nOfKind = this.checkNOfKind(diceValues);
    nOfKind.forEach(combo => {
      combo.usedDice.forEach(idx => scoringIndices.add(idx));
    });

    // Check for individual scoring dice combinations (1s and 5s)
    const individual = this.checkIndividualScoring(diceValues);
    individual.forEach(combo => {
      combo.usedDice.forEach(idx => scoringIndices.add(idx));
    });

    return scoringIndices;
  }

  /**
   * Check for straight combination (1,2,3,4,5,6)
   * @param {number[]} diceValues - Array of exactly 6 dice values
   * @returns {object|null} Combination object or null
   */
  static checkStraight(diceValues) {
    if (diceValues.length !== GAME_CONFIG.DICE_COUNT) {
      return null;
    }

    const uniqueValues = new Set(diceValues);
    const sortedValues = Array.from(uniqueValues).sort();

    // Check if we have exactly 1,2,3,4,5,6
    if (sortedValues.length === 6 &&
        sortedValues.every((val, idx) => val === idx + 1)) {
      return {
        type: COMBO_TYPES.STRAIGHT,
        score: SCORING_RULES.STRAIGHT,
        usedDice: Array.from({ length: diceValues.length }, (_, i) => i),
        description: 'Straight (1,2,3,4,5,6)'
      };
    }

    return null;
  }

  /**
   * Check for three pairs combination
   * @param {number[]} diceValues - Array of exactly 6 dice values
   * @returns {object|null} Combination object or null
   */
  static checkThreePairs(diceValues) {
    if (diceValues.length !== GAME_CONFIG.DICE_COUNT) {
      return null;
    }

    const counts = getDiceCounts(diceValues);
    const countValues = Object.values(counts);

    // Must have exactly 3 different values, each appearing exactly twice
    if (countValues.length === 3 && countValues.every(count => count === 2)) {
      return {
        type: COMBO_TYPES.THREE_PAIRS,
        score: SCORING_RULES.THREE_PAIRS,
        usedDice: Array.from({ length: diceValues.length }, (_, i) => i),
        description: 'Three Pairs'
      };
    }

    return null;
  }

  /**
   * Check for N-of-a-kind combinations (3, 4, 5, or 6 of a kind)
   * @param {number[]} diceValues - Array of dice values
   * @returns {array} Array of combination objects
   */
  static checkNOfKind(diceValues) {
    const combinations = [];
    const counts = getDiceCounts(diceValues);

    for (const [value, count] of Object.entries(counts)) {
      if (count >= 3) {
        const numValue = parseInt(value);
        const baseScore = SCORING_RULES.THREE_OF_KIND[numValue];

        if (baseScore) {
          // Calculate score for N of a kind (doubles for each additional die)
          const score = baseScore * Math.pow(2, count - 3);

          // Find indices of dice with this value
          const usedDice = [];
          let found = 0;
          for (let i = 0; i < diceValues.length && found < count; i++) {
            if (diceValues[i] === numValue) {
              usedDice.push(i);
              found++;
            }
          }

          combinations.push({
            type: COMBO_TYPES.N_OF_KIND,
            score,
            usedDice,
            description: `${count} of ${numValue}'s`,
            value: numValue,
            count
          });
        }
      }
    }

    return combinations;
  }

  /**
   * Check for individual scoring dice (1s and 5s)
   * @param {number[]} diceValues - Array of dice values
   * @returns {array} Array of combination objects
   */
  static checkIndividualScoring(diceValues) {
    const combinations = [];
    const counts = getDiceCounts(diceValues);

    for (const [value, count] of Object.entries(counts)) {
      const numValue = parseInt(value);
      const individualScore = SCORING_RULES.INDIVIDUAL[numValue];

      if (individualScore && count < 3) {
        // Only score individual dice if less than 3 (3+ becomes N-of-a-kind)
        const totalScore = individualScore * count;

        // Find indices of dice with this value
        const usedDice = [];
        let found = 0;
        for (let i = 0; i < diceValues.length && found < count; i++) {
          if (diceValues[i] === numValue) {
            usedDice.push(i);
            found++;
          }
        }

        combinations.push({
          type: COMBO_TYPES.INDIVIDUAL,
          score: totalScore,
          usedDice,
          description: `${count} ${numValue}'s`,
          value: numValue,
          count
        });
      }
    }

    return combinations;
  }

  /**
   * Calculate the optimal score for selected dice indices
   * @param {number[]} diceValues - All dice values
   * @param {number[]} selectedIndices - Indices of selected dice
   * @returns {object} {score: number, isValid: boolean, error?: string}
   */
  static calculateSelectedScore(diceValues, selectedIndices) {
    if (!selectedIndices || selectedIndices.length === 0) {
      return { score: 0, isValid: false, error: 'No dice selected.' };
    }

    // Extract selected dice values
    const selectedValues = selectedIndices.map(i => diceValues[i]);

    // Calculate score for selected dice
    const result = this.calculateScore(selectedValues);

    if (result.score === 0) {
      return {
        score: 0,
        isValid: false,
        error: 'Selected dice do not form a valid scoring combination.'
      };
    }

    return {
      score: result.score,
      isValid: true,
      combinations: result.combinations
    };
  }

  /**
   * Get all possible scoring options for a set of dice
   * @param {number[]} diceValues - Array of dice values
   * @returns {array} Array of possible scoring options
   */
  static getScoringOptions(diceValues) {
    const combinations = this.findAllCombinations(diceValues);

    // Group combinations by type and sort by score
    const options = combinations
      .map(combo => ({
        ...combo,
        selectable: true
      }))
      .sort((a, b) => b.score - a.score);

    return options;
  }

  /**
   * Check if any dice in the set can score points
   * @param {number[]} diceValues - Array of dice values
   * @returns {boolean} True if at least one die can score
   */
  static canScore(diceValues) {
    const result = this.calculateScore(diceValues);
    return result.score > 0;
  }

  /**
   * Get detailed scoring breakdown for display
   * @param {object} combination - Combination object from calculateScore
   * @returns {object} Detailed breakdown for UI display
   */
  static getScoreBreakdown(combination) {
    return {
      type: combination.type,
      score: combination.score,
      description: combination.description,
      diceCount: combination.usedDice.length,
      details: this.getDetailedDescription(combination)
    };
  }

  /**
   * Get detailed description of a scoring combination
   * @param {object} combination - Combination object
   * @returns {string} Detailed description
   */
  static getDetailedDescription(combination) {
    switch (combination.type) {
      case COMBO_TYPES.STRAIGHT:
        return 'Straight: 1,2,3,4,5,6 = 1000 points';

      case COMBO_TYPES.THREE_PAIRS:
        return 'Three Pairs = 1000 points';

      case COMBO_TYPES.N_OF_KIND:
        const baseScore = SCORING_RULES.THREE_OF_KIND[combination.value];
        if (combination.count === 3) {
          return `Three ${combination.value}'s = ${combination.score} points`;
        } else {
          return `${combination.count} ${combination.value}'s (${combination.count - 3} extra) = ${combination.score} points`;
        }

      case COMBO_TYPES.INDIVIDUAL:
        const pointsPer = SCORING_RULES.INDIVIDUAL[combination.value];
        return `${combination.count} ${combination.value}'s × ${pointsPer} = ${combination.score} points`;

      default:
        return combination.description || 'Unknown combination';
    }
  }
}