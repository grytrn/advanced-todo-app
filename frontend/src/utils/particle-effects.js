/**
 * Particle Effects System for TODO App
 * Creates fancy visual effects for task completion and other interactions
 */

export class ParticleSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create particle container if it doesn't exist
    this.container = document.querySelector('.particle-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'particle-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Create a burst of particles at specified coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} options - Particle options
   */
  createBurst(x, y, options = {}) {
    const defaults = {
      count: 20,
      colors: ['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      spread: 100,
      duration: 1000,
      size: 10
    };

    const config = { ...defaults, ...options };

    for (let i = 0; i < config.count; i++) {
      this.createParticle(x, y, config);
    }
  }

  /**
   * Create a single particle
   */
  createParticle(x, y, config) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random color from palette
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    
    // Random direction and distance
    const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5;
    const velocity = 50 + Math.random() * config.spread;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    
    // Random size variation
    const size = config.size * (0.5 + Math.random());
    
    // Apply styles
    particle.style.cssText = `
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      --x: ${tx}px;
      --y: ${ty}px;
    `;
    
    this.container.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
      particle.remove();
    }, config.duration);
  }

  /**
   * Create a success checkmark animation
   */
  createSuccessAnimation(element) {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Create checkmark SVG
    const checkmark = document.createElement('div');
    checkmark.innerHTML = `
      <svg width="100" height="100" style="position: fixed; left: ${x - 50}px; top: ${y - 50}px; z-index: 9999;">
        <use href="#icon-success" width="100" height="100" stroke="#10b981" stroke-width="3"/>
      </svg>
    `;
    
    document.body.appendChild(checkmark);
    
    // Create particle burst
    this.createBurst(x, y, {
      colors: ['#10b981', '#34d399', '#6ee7b7'],
      count: 30,
      spread: 150
    });
    
    // Remove checkmark after animation
    setTimeout(() => {
      checkmark.remove();
    }, 1500);
  }

  /**
   * Create confetti rain effect
   */
  createConfettiRain(duration = 3000) {
    const colors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 5 + Math.random() * 10;
        const left = Math.random() * window.innerWidth;
        const animationDuration = 2 + Math.random() * 3;
        const rotationSpeed = Math.random() * 360;
        
        confetti.style.cssText = `
          position: fixed;
          left: ${left}px;
          top: -20px;
          width: ${size}px;
          height: ${size * 0.6}px;
          background: ${color};
          border-radius: 2px;
          z-index: 9999;
          animation: confettiFall ${animationDuration}s linear forwards;
          transform: rotate(${Math.random() * 360}deg);
        `;
        
        // Add custom animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes confettiFall {
            to {
              transform: translateY(${window.innerHeight + 20}px) rotate(${rotationSpeed}deg);
            }
          }
        `;
        document.head.appendChild(style);
        
        this.container.appendChild(confetti);
        
        // Clean up
        setTimeout(() => {
          confetti.remove();
          style.remove();
        }, animationDuration * 1000);
      }, i * (duration / confettiCount));
    }
  }

  /**
   * Create ripple effect at click position
   */
  createRipple(event, color = 'rgba(14, 165, 233, 0.3)') {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${diameter}px;
      height: ${diameter}px;
      left: ${event.clientX - rect.left - radius}px;
      top: ${event.clientY - rect.top - radius}px;
      background: ${color};
      border-radius: 50%;
      transform: scale(0);
      animation: rippleEffect 0.6s ease-out;
      pointer-events: none;
    `;
    
    // Ensure button has relative positioning
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    
    button.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Create floating notification
   */
  createFloatingNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `floating-notification ${type}`;
    
    const icons = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#0ea5e9'
    };
    
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: white;
      color: #111827;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      border-left: 4px solid ${icons[type]};
      font-weight: 500;
      z-index: 9999;
      animation: slideUpNotification 0.5s ease-out forwards;
    `;
    
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUpNotification {
        to {
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideDownNotification 0.5s ease-in forwards';
      
      const exitStyle = document.createElement('style');
      exitStyle.textContent = `
        @keyframes slideDownNotification {
          to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(exitStyle);
      
      setTimeout(() => {
        notification.remove();
        style.remove();
        exitStyle.remove();
      }, 500);
    }, 3000);
  }

  /**
   * Create typing effect for text
   */
  createTypingEffect(element, text, speed = 50) {
    element.textContent = '';
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    };
    
    type();
  }

  /**
   * Create shimmer effect on element
   */
  addShimmerEffect(element) {
    element.classList.add('shimmer-effect');
    
    // Add shimmer animation if not exists
    if (!document.querySelector('#shimmer-style')) {
      const style = document.createElement('style');
      style.id = 'shimmer-style';
      style.textContent = `
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          to {
            left: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Create pulsing glow effect
   */
  addPulseGlow(element, color = '#0ea5e9') {
    element.style.animation = 'pulseGlow 2s ease-in-out infinite';
    
    if (!document.querySelector('#pulse-glow-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-glow-style';
      style.textContent = `
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 5px ${color}40;
          }
          50% {
            box-shadow: 0 0 20px ${color}60, 0 0 30px ${color}40;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Export singleton instance
export const particleSystem = new ParticleSystem();

// Utility function to add ripple effect to all buttons
export function initializeRippleEffect() {
  document.addEventListener('click', (e) => {
    if (e.target.matches('.btn, .todo-item, .card')) {
      particleSystem.createRipple(e);
    }
  });
}

// Initialize effects when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRippleEffect);
} else {
  initializeRippleEffect();
}