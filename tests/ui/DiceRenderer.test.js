/**
 * @jest-environment jsdom
 */

import { DiceRenderer } from '../../src/ui/DiceRenderer.js';
import { DICE_STATES } from '../../src/utils/constants.js';
import { jest } from '@jest/globals';

describe('DiceRenderer', () => {
  let container;
  let renderer;
  let mockTurn;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    mockTurn = {
      toggleDieSelection: jest.fn().mockReturnValue(true),
      canSelectDie: jest.fn().mockReturnValue(true),
      emit: jest.fn()
    };
    
    renderer = new DiceRenderer(container, mockTurn);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should render correct number of dice', () => {
    const diceStates = [
      { value: 1, state: DICE_STATES.AVAILABLE, index: 0 },
      { value: 2, state: DICE_STATES.AVAILABLE, index: 1 },
      { value: 3, state: DICE_STATES.AVAILABLE, index: 2 },
      { value: 4, state: DICE_STATES.AVAILABLE, index: 3 },
      { value: 5, state: DICE_STATES.AVAILABLE, index: 4 },
      { value: 6, state: DICE_STATES.AVAILABLE, index: 5 }
    ];

    renderer.render(diceStates);
    const dice = container.querySelectorAll('.die');
    expect(dice).toHaveLength(6);
  });

  test('should apply correct classes for states', () => {
    const diceStates = [
      { value: 1, state: DICE_STATES.SELECTED, index: 0 },
      { value: 5, state: DICE_STATES.LOCKED, index: 1 },
      { value: null, state: DICE_STATES.AVAILABLE, index: 2 }
    ];

    renderer.render(diceStates);
    const dice = container.querySelectorAll('.die');
    
    expect(dice[0].classList.contains('die-selected')).toBe(true);
    expect(dice[1].classList.contains('die-locked')).toBe(true);
    expect(dice[2].classList.contains('die-empty')).toBe(true);
  });

  test('should render correct number of pips', () => {
    const diceStates = [
      { value: 1, state: DICE_STATES.AVAILABLE, index: 0 },
      { value: 6, state: DICE_STATES.AVAILABLE, index: 1 }
    ];

    renderer.render(diceStates);
    const dice = container.querySelectorAll('.die');
    
    expect(dice[0].querySelectorAll('.die-pip')).toHaveLength(1);
    expect(dice[1].querySelectorAll('.die-pip')).toHaveLength(6);
  });

  test('should call toggleDieSelection on click', () => {
    const diceStates = [
      { value: 1, state: DICE_STATES.AVAILABLE, index: 0 }
    ];

    renderer.render(diceStates);
    const die = container.querySelector('.die');
    die.click();

    expect(mockTurn.toggleDieSelection).toHaveBeenCalledWith(0);
    expect(die.classList.contains('die-selected')).toBe(true);
  });

  test('should not toggle selection on locked dice', () => {
    const diceStates = [
      { value: 1, state: DICE_STATES.LOCKED, index: 0 }
    ];

    renderer.render(diceStates);
    const die = container.querySelector('.die');
    die.click();

    expect(mockTurn.toggleDieSelection).not.toHaveBeenCalled();
  });
});
