/**
 * Simple EventEmitter implementation for loose coupling between game logic and UI
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {function} callback - Function to call when event is emitted
   * @returns {function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to an event that only fires once
   * @param {string} event - Event name
   * @param {function} callback - Function to call when event is emitted
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      callback(...args);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} [event] - Event name (optional)
   */
  removeAllListeners(event = null) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  /**
   * Get list of events that have listeners
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Object.keys(this.events);
  }

  /**
   * Get number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }
}