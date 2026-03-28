/**
 * Handles user configuration storage in localStorage
 */
export class UserConfig {
  static STORAGE_KEY = '10k_dice_user_config';

  /**
   * Get the stored user name
   * @returns {string|null} The user name or null if not set
   */
  static getUserName() {
    try {
      const config = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return config.userName || null;
    } catch (error) {
      console.warn('Failed to load user config:', error);
      return null;
    }
  }

  /**
   * Set the user name
   * @param {string} userName - The user name to store
   */
  static setUserName(userName) {
    try {
      const config = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      config.userName = userName;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save user config:', error);
    }
  }

  /**
   * Clear all user configuration
   */
  static clearConfig() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear user config:', error);
    }
  }
}