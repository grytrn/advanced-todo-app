/**
 * Theme Manager for TODO App
 * Handles theme switching, persistence, and system preference detection
 */

export class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.themeChangeCallbacks = [];
    this.init();
  }

  init() {
    // Check for saved theme preference or system preference
    const savedTheme = this.getSavedTheme();
    const systemTheme = this.getSystemTheme();
    
    this.currentTheme = savedTheme || systemTheme;
    this.applyTheme(this.currentTheme);
    
    // Watch for system theme changes
    this.watchSystemTheme();
    
    // Setup theme toggle elements
    this.setupThemeToggles();
  }

  /**
   * Get saved theme from localStorage
   */
  getSavedTheme() {
    try {
      return localStorage.getItem('todo-app-theme');
    } catch (e) {
      console.warn('Failed to access localStorage:', e);
      return null;
    }
  }

  /**
   * Save theme preference
   */
  saveTheme(theme) {
    try {
      localStorage.setItem('todo-app-theme', theme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  }

  /**
   * Get system color scheme preference
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Watch for system theme changes
   */
  watchSystemTheme() {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      // Only update if user hasn't manually set a preference
      if (!this.getSavedTheme()) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.setTheme(newTheme, false); // Don't save automatic changes
      }
    });
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    // Update data attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = theme === 'dark' ? '#0f172a' : '#ffffff';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0f172a' : '#ffffff';
      document.head.appendChild(meta);
    }
    
    // Update theme toggle UI
    this.updateThemeToggles(theme);
    
    // Notify callbacks
    this.notifyThemeChange(theme);
  }

  /**
   * Set theme
   * @param {string} theme - 'light' or 'dark'
   * @param {boolean} save - Whether to save preference
   */
  setTheme(theme, save = true) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Invalid theme: ${theme}`);
      return;
    }
    
    this.currentTheme = theme;
    this.applyTheme(theme);
    
    if (save) {
      this.saveTheme(theme);
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Setup theme toggle elements
   */
  setupThemeToggles() {
    // Find all theme toggle elements
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    
    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => this.toggleTheme());
      
      // Add keyboard support
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
      
      // Set initial ARIA attributes
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-label', 'Toggle theme');
      this.updateToggleAria(toggle, this.currentTheme);
    });
  }

  /**
   * Update theme toggle UI elements
   */
  updateThemeToggles(theme) {
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    
    toggles.forEach(toggle => {
      // Update visual state
      toggle.classList.toggle('dark', theme === 'dark');
      
      // Update ARIA attributes
      this.updateToggleAria(toggle, theme);
      
      // Update icons if present
      const lightIcon = toggle.querySelector('.theme-icon-light');
      const darkIcon = toggle.querySelector('.theme-icon-dark');
      
      if (lightIcon && darkIcon) {
        lightIcon.style.display = theme === 'light' ? 'block' : 'none';
        darkIcon.style.display = theme === 'dark' ? 'block' : 'none';
      }
    });
  }

  /**
   * Update toggle ARIA attributes
   */
  updateToggleAria(toggle, theme) {
    toggle.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    toggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
  }

  /**
   * Register callback for theme changes
   * @param {Function} callback - Function to call when theme changes
   * @returns {Function} Unsubscribe function
   */
  onThemeChange(callback) {
    this.themeChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.themeChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.themeChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all callbacks of theme change
   */
  notifyThemeChange(theme) {
    this.themeChangeCallbacks.forEach(callback => {
      try {
        callback(theme);
      } catch (e) {
        console.error('Theme change callback error:', e);
      }
    });
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark theme is active
   */
  isDark() {
    return this.currentTheme === 'dark';
  }

  /**
   * Create custom theme
   * @param {string} name - Theme name
   * @param {Object} colors - Color overrides
   */
  createCustomTheme(name, colors) {
    const style = document.createElement('style');
    style.id = `theme-${name}`;
    
    let cssVars = `[data-theme="${name}"] {\n`;
    
    Object.entries(colors).forEach(([key, value]) => {
      cssVars += `  --color-${key}: ${value};\n`;
    });
    
    cssVars += '}';
    
    style.textContent = cssVars;
    document.head.appendChild(style);
  }

  /**
   * Apply custom color adjustments for accessibility
   * @param {Object} adjustments - Color adjustments
   */
  applyColorAdjustments(adjustments) {
    const root = document.documentElement;
    
    if (adjustments.contrast === 'high') {
      root.style.setProperty('--color-primary-500', '#0066cc');
      root.style.setProperty('--color-text-secondary', '#4b5563');
      root.style.setProperty('--color-border', this.isDark() ? '#ffffff' : '#000000');
    }
    
    if (adjustments.colorBlindMode) {
      // Adjust colors for different types of color blindness
      switch (adjustments.colorBlindMode) {
        case 'protanopia':
          // Red-blind adjustments
          root.style.setProperty('--color-accent-red', '#875600');
          root.style.setProperty('--color-accent-green', '#0066cc');
          break;
        case 'deuteranopia':
          // Green-blind adjustments
          root.style.setProperty('--color-accent-green', '#0066cc');
          root.style.setProperty('--color-accent-red', '#cc6600');
          break;
        case 'tritanopia':
          // Blue-blind adjustments
          root.style.setProperty('--color-primary-500', '#cc0066');
          root.style.setProperty('--color-accent-yellow', '#006666');
          break;
      }
    }
  }

  /**
   * Export theme settings
   */
  exportSettings() {
    return {
      theme: this.currentTheme,
      customColors: this.getCustomColors(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import theme settings
   */
  importSettings(settings) {
    if (settings.theme) {
      this.setTheme(settings.theme);
    }
    
    if (settings.customColors) {
      this.applyCustomColors(settings.customColors);
    }
  }

  /**
   * Get computed custom colors
   */
  getCustomColors() {
    const computed = getComputedStyle(document.documentElement);
    const colors = {};
    
    // Get all CSS custom properties
    const props = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules);
        } catch (e) {
          return [];
        }
      })
      .filter(rule => rule.selectorText === ':root')
      .flatMap(rule => Array.from(rule.style))
      .filter(prop => prop.startsWith('--color-'));
    
    props.forEach(prop => {
      colors[prop] = computed.getPropertyValue(prop);
    });
    
    return colors;
  }

  /**
   * Apply custom colors
   */
  applyCustomColors(colors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
  themeManager.init();
}