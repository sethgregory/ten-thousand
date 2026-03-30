// Game configuration constants
export const GAME_CONFIG = {
  DICE_COUNT: 6,
  WINNING_SCORE: 10000,
  MINIMUM_BOARD_SCORE: 750,
  DICE_FACES: 6,
  VERSION: '1.01'
};

// Scoring rules
export const SCORING_RULES = {
  // Individual die values
  INDIVIDUAL: {
    1: 100,  // 1 = 100 points
    5: 50    // 5 = 50 points
  },

  // Three of a kind base scores
  THREE_OF_KIND: {
    1: 1000,  // Three 1s = 1000 points
    2: 200,   // Three 2s = 200 points
    3: 300,   // Three 3s = 300 points
    4: 400,   // Three 4s = 400 points
    5: 500,   // Three 5s = 500 points
    6: 600    // Three 6s = 600 points
  },

  // Special combinations
  STRAIGHT: 1000,      // 1,2,3,4,5,6 = 1000 points
  THREE_PAIRS: 1000    // Three pairs = 1000 points
};

// Game phases
export const GAME_PHASES = {
  SETUP: 'setup',
  PLAYING: 'playing',
  FINAL_ROUND: 'final_round',
  ENDED: 'ended',
  LIVE_SCORING: 'live_scoring'
};

// Turn results
export const TURN_RESULTS = {
  CONTINUE: 'continue',      // Player can continue rolling
  BUST: 'bust',              // No scoring dice, lose turn
  BANKED: 'banked',          // Player chose to bank points
  HOT_DICE: 'hot_dice'       // All dice scored, must re-roll
};

// Dice states
export const DICE_STATES = {
  AVAILABLE: 'available',    // Can be rolled
  SELECTED: 'selected',      // Selected for scoring
  LOCKED: 'locked'           // Already used in scoring
};

// Scoring combination types (for priority handling)
export const COMBO_TYPES = {
  STRAIGHT: 'straight',
  THREE_PAIRS: 'three_pairs',
  N_OF_KIND: 'n_of_kind',
  INDIVIDUAL: 'individual'
};

// Error messages
export const ERROR_MESSAGES = {
  NO_SCORING_DICE: 'You must select at least one scoring die.',
  INVALID_SELECTION: 'Selected dice do not form a valid scoring combination.',
  NOT_ON_BOARD: 'You need 750 or more points to get on the board.',
  GAME_ENDED: 'The game has already ended.',
  NO_PLAYERS: 'Cannot start game without players.'
};
