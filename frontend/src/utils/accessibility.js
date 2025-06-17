/**
 * Accessibility utilities for TODO App
 * Ensures WCAG 2.1 AA compliance and enhances user experience
 */

export class AccessibilityManager {
  constructor() {
    this.announcer = null;
    this.focusTrap = null;
    this.init();
  }

  init() {
    this.createAnnouncer();
    this.setupKeyboardShortcuts();
    this.enhanceFocusVisibility();
    this.setupReducedMotion();
  }

  /**
   * Create live region for screen reader announcements
   */
  createAnnouncer() {
    this.announcer = document.getElementById('aria-announcer');
    if (!this.announcer) {
      this.announcer = document.createElement('div');
      this.announcer.id = 'aria-announcer';
      this.announcer.className = 'sr-only';
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.announcer);
    }
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      this.announcer.textContent = '';
    }, 1000);
  }

  /**
   * Setup keyboard navigation shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip to main content (Alt + M)
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        const main = document.querySelector('#main, main, [role="main"]');
        if (main) {
          main.setAttribute('tabindex', '-1');
          main.focus();
          this.announce('Navigated to main content');
        }
      }

      // Toggle help dialog (?)
      if (e.key === '?' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.showKeyboardHelp();
      }

      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardHelp() {
    const helpContent = `
      <h2>Keyboard Shortcuts</h2>
      <ul>
        <li><kbd>Tab</kbd> - Navigate forward</li>
        <li><kbd>Shift + Tab</kbd> - Navigate backward</li>
        <li><kbd>Enter</kbd> or <kbd>Space</kbd> - Activate buttons</li>
        <li><kbd>Arrow Keys</kbd> - Navigate lists</li>
        <li><kbd>Alt + M</kbd> - Skip to main content</li>
        <li><kbd>Escape</kbd> - Close dialogs</li>
        <li><kbd>?</kbd> - Show this help</li>
        <li><kbd>/</kbd> - Focus search</li>
      </ul>
    `;
    
    // Implementation would show this in a modal
    this.announce('Keyboard shortcuts help opened');
  }

  /**
   * Handle escape key press
   */
  handleEscape() {
    // Close modals
    const openModal = document.querySelector('.modal-backdrop[style*="display: flex"]');
    if (openModal) {
      openModal.style.display = 'none';
      this.announce('Dialog closed');
    }

    // Clear focus from inputs
    if (document.activeElement.matches('input, textarea')) {
      document.activeElement.blur();
    }
  }

  /**
   * Enhance focus visibility for keyboard navigation
   */
  enhanceFocusVisibility() {
    // Add focus-visible polyfill behavior
    let hadKeyboardEvent = true;
    const keyboardEvents = ['keydown', 'keyup'];
    const pointerEvents = ['mousedown', 'mouseup', 'touchstart', 'touchend'];

    // Track keyboard vs pointer navigation
    keyboardEvents.forEach(event => {
      document.addEventListener(event, () => {
        hadKeyboardEvent = true;
      });
    });

    pointerEvents.forEach(event => {
      document.addEventListener(event, () => {
        hadKeyboardEvent = false;
      });
    });

    // Apply focus-visible class
    document.addEventListener('focusin', (e) => {
      if (hadKeyboardEvent || e.target.matches('input, textarea, select')) {
        e.target.classList.add('focus-visible');
      }
    });

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('focus-visible');
    });
  }

  /**
   * Setup reduced motion preferences
   */
  setupReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    this.handleReducedMotion(prefersReducedMotion.matches);
    
    prefersReducedMotion.addEventListener('change', (e) => {
      this.handleReducedMotion(e.matches);
    });
  }

  /**
   * Handle reduced motion preference
   */
  handleReducedMotion(reducedMotion) {
    if (reducedMotion) {
      document.documentElement.style.setProperty('--transition-fast', '0ms');
      document.documentElement.style.setProperty('--transition-base', '0ms');
      document.documentElement.style.setProperty('--transition-slow', '0ms');
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.style.setProperty('--transition-fast', '150ms');
      document.documentElement.style.setProperty('--transition-base', '200ms');
      document.documentElement.style.setProperty('--transition-slow', '300ms');
      document.documentElement.classList.remove('reduce-motion');
    }
  }

  /**
   * Create focus trap for modals and dialogs
   * @param {HTMLElement} container - Container element to trap focus within
   */
  createFocusTrap(container) {
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Store previous focus
    const previousFocus = document.activeElement;

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Trap focus handler
    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', trapFocus);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', trapFocus);
      if (previousFocus) {
        previousFocus.focus();
      }
    };
  }

  /**
   * Manage ARIA attributes for dynamic content
   * @param {HTMLElement} element - Element to update
   * @param {Object} attributes - ARIA attributes to set
   */
  setAriaAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(`aria-${key}`, value);
    });
  }

  /**
   * Create skip links for navigation
   */
  createSkipLinks() {
    const skipLinksHTML = `
      <nav class="skip-links" aria-label="Skip links">
        <a href="#main" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#search" class="skip-link">Skip to search</a>
      </nav>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', skipLinksHTML);
  }

  /**
   * Enhance form validation messages for screen readers
   * @param {HTMLElement} input - Input element
   * @param {string} message - Validation message
   * @param {boolean} isError - Whether this is an error message
   */
  announceValidation(input, message, isError = true) {
    const messageId = `${input.id}-message`;
    let messageElement = document.getElementById(messageId);
    
    if (!messageElement) {
      messageElement = document.createElement('span');
      messageElement.id = messageId;
      messageElement.className = isError ? 'input-error-message' : 'input-helper';
      input.parentNode.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    
    // Update ARIA attributes
    input.setAttribute('aria-describedby', messageId);
    input.setAttribute('aria-invalid', isError.toString());
    
    // Announce to screen readers
    this.announce(message, isError ? 'assertive' : 'polite');
  }

  /**
   * Make drag and drop accessible with keyboard
   * @param {HTMLElement} draggableList - List container
   */
  makeListKeyboardDraggable(draggableList) {
    const items = draggableList.querySelectorAll('[draggable="true"]');
    
    items.forEach((item, index) => {
      // Make items focusable
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-setsize', items.length.toString());
      item.setAttribute('aria-posinset', (index + 1).toString());
      
      item.addEventListener('keydown', (e) => {
        const currentIndex = Array.from(items).indexOf(item);
        
        switch(e.key) {
          case 'ArrowUp':
            if (e.altKey && currentIndex > 0) {
              e.preventDefault();
              this.moveItem(draggableList, currentIndex, currentIndex - 1);
              this.announce('Item moved up');
            }
            break;
          case 'ArrowDown':
            if (e.altKey && currentIndex < items.length - 1) {
              e.preventDefault();
              this.moveItem(draggableList, currentIndex, currentIndex + 1);
              this.announce('Item moved down');
            }
            break;
          case ' ':
          case 'Enter':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              this.toggleItemSelection(item);
            }
            break;
        }
      });
    });
    
    // Add instructions
    draggableList.setAttribute('aria-label', 'Sortable list. Use Alt+Arrow keys to reorder items.');
  }

  /**
   * Move item in list
   */
  moveItem(list, fromIndex, toIndex) {
    const items = list.children;
    const itemToMove = items[fromIndex];
    const referenceItem = items[toIndex];
    
    if (toIndex > fromIndex) {
      referenceItem.parentNode.insertBefore(itemToMove, referenceItem.nextSibling);
    } else {
      referenceItem.parentNode.insertBefore(itemToMove, referenceItem);
    }
    
    // Update positions
    this.updateListPositions(list);
    
    // Focus moved item
    itemToMove.focus();
  }

  /**
   * Update ARIA positions for list items
   */
  updateListPositions(list) {
    const items = list.querySelectorAll('[role="listitem"]');
    items.forEach((item, index) => {
      item.setAttribute('aria-posinset', (index + 1).toString());
    });
  }

  /**
   * Toggle item selection
   */
  toggleItemSelection(item) {
    const isSelected = item.getAttribute('aria-selected') === 'true';
    item.setAttribute('aria-selected', (!isSelected).toString());
    item.classList.toggle('selected');
    
    this.announce(isSelected ? 'Item deselected' : 'Item selected');
  }

  /**
   * Check color contrast ratio
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @returns {number} Contrast ratio
   */
  getContrastRatio(foreground, background) {
    const getLuminance = (color) => {
      const rgb = color.match(/\d+/g).map(Number);
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Validate contrast for WCAG compliance
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - 'AA' or 'AAA'
   * @returns {boolean} Whether contrast meets standards
   */
  validateContrast(foreground, background, level = 'AA') {
    const ratio = this.getContrastRatio(foreground, background);
    const standards = {
      'AA': { normal: 4.5, large: 3 },
      'AAA': { normal: 7, large: 4.5 }
    };
    
    return ratio >= standards[level].normal;
  }
}

// Export singleton instance
export const a11y = new AccessibilityManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => a11y.init());
} else {
  a11y.init();
}