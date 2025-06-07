/**
 * utils.js
 * Responsibility: Core utility functions used across the application
 * 
 * Main functions:
 * - DOM manipulation helpers
 * - Event management
 * - UI component generation
 * - Tab system management
 */

// DOM helper functions
const DOM = {
  /**
   * Get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null} - Element or null if not found
   */
  getById: (id) => document.getElementById(id),

  /**
   * Get elements by selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element to search within (default: document)
   * @returns {NodeList} - List of matching elements
   */
  getAll: (selector, parent = document) => parent.querySelectorAll(selector),

  /**
   * Get first element matching selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element to search within (default: document)
   * @returns {HTMLElement|null} - First matching element or null
   */
  get: (selector, parent = document) => parent.querySelector(selector),

  /**
   * Create an element with attributes and content
   * @param {string} tag - Element tag name
   * @param {Object} attrs - Attributes to set
   * @param {string|HTMLElement|Array} content - Content to append
   * @returns {HTMLElement} - Created element
   */
  create: (tag, attrs = {}, content = null) => {
    const el = document.createElement(tag);
    
    // Set attributes
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          el.dataset[dataKey] = dataValue;
        }
      } else if (key === 'style' && typeof value === 'object') {
        for (const [styleKey, styleValue] of Object.entries(value)) {
          el.style[styleKey] = styleValue;
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }
    
    // Add content
    if (content !== null) {
      if (Array.isArray(content)) {
        content.forEach(item => {
          if (typeof item === 'string') {
            el.appendChild(document.createTextNode(item));
          } else if (item instanceof HTMLElement) {
            el.appendChild(item);
          }
        });
      } else if (typeof content === 'string') {
        el.textContent = content;
      } else if (content instanceof HTMLElement) {
        el.appendChild(content);
      }
    }
    
    return el;
  }
};

// Tab system management
const TabSystem = {
  /**
   * Initialize a tab system
   * @param {string} navSelector - Selector for tab navigation links
   * @param {string} contentSelector - Selector for tab content containers
   * @param {string} activeClass - Class to apply to active tab link
   */
  init: (navSelector, contentSelector, activeClass = 'active') => {
    const navLinks = DOM.getAll(navSelector);
    const tabContents = DOM.getAll(contentSelector);
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTabId = link.getAttribute('data-tab');
        TabSystem.activateTab(navLinks, tabContents, targetTabId, activeClass);
      });
    });
  },
  
  /**
   * Activate a specific tab
   * @param {NodeList} navLinks - All navigation links
   * @param {NodeList} tabContents - All tab contents
   * @param {string} targetTabId - ID of tab to activate
   * @param {string} activeClass - Class to apply to active elements
   */
  activateTab: (navLinks, tabContents, targetTabId, activeClass = 'active') => {
    // Deactivate all tabs
    navLinks.forEach(link => link.classList.remove(activeClass));
    tabContents.forEach(content => content.classList.add('d-none'));
    
    // Activate target tab
    const activeLink = Array.from(navLinks).find(
      link => link.getAttribute('data-tab') === targetTabId
    );
    if (activeLink) activeLink.classList.add(activeClass);
    
    const activeContent = DOM.getById(`${targetTabId}-tab`);
    if (activeContent) activeContent.classList.remove('d-none');
  }
};

// Parameter group tabs system
const ParameterTabs = {
  /**
   * Initialize parameter group tabs
   * @param {string} tabSelector - Selector for parameter group tabs
   * @param {string} contentSelector - Selector for parameter group content
   */
  init: (tabSelector, contentSelector) => {
    const tabs = DOM.getAll(tabSelector);
    const contents = DOM.getAll(contentSelector);
    
    // Hide all except first
    if (contents.length > 0) {
      for (let i = 1; i < contents.length; i++) {
        contents[i].classList.add('d-none');
      }
    }
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetGroup = tab.getAttribute('data-param-group');
        
        // Update tab active states
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show target content, hide others
        contents.forEach(content => {
          if (content.id === targetGroup) {
            content.classList.remove('d-none');
          } else {
            content.classList.add('d-none');
          }
        });
      });
    });
  }
};

// Form validation helpers
const FormValidation = {
  /**
   * Validate a numeric input
   * @param {HTMLInputElement} input - Input element
   * @returns {boolean} - Is input valid
   */
  validateNumeric: (input) => {
    const value = parseFloat(input.value);
    const min = parseFloat(input.getAttribute('min') || Number.MIN_SAFE_INTEGER);
    const max = parseFloat(input.getAttribute('max') || Number.MAX_SAFE_INTEGER);
    
    const isValid = !isNaN(value) && value >= min && value <= max;
    
    if (isValid) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    } else {
      input.classList.remove('is-valid');
      input.classList.add('is-invalid');
    }
    
    return isValid;
  },
  
  /**
   * Initialize validation for a form
   * @param {HTMLFormElement|string} form - Form or form selector
   * @param {Function} onValidCallback - Callback when form is valid
   */
  initForm: (form, onValidCallback) => {
    const formElement = typeof form === 'string' ? DOM.get(form) : form;
    if (!formElement) return;
    
    const inputs = DOM.getAll('input, select, textarea', formElement);
    
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        let isValid = true;
        
        // Validate based on type
        if (input.type === 'number') {
          isValid = FormValidation.validateNumeric(input);
        }
        
        // Add more validation types as needed
        
        // Check if entire form is valid
        const allValid = Array.from(inputs).every(i => {
          if (i.type === 'number') {
            return FormValidation.validateNumeric(i);
          }
          return true;
        });
        
        if (allValid && typeof onValidCallback === 'function') {
          onValidCallback();
        }
      });
    });
  }
};

// Status indicator
const Status = {
  /**
   * Update status text
   * @param {string} message - Status message
   * @param {string} type - Status type ('info', 'success', 'warning', 'error')
   */
  update: (message, type = 'info') => {
    const statusEl = DOM.getById('status-text');
    if (!statusEl) return;
    
    statusEl.textContent = `Status: ${message}`;
    
    // Clear previous status classes
    statusEl.classList.remove('status-info', 'status-success', 'status-warning', 'status-error');
    statusEl.classList.add(`status-${type}`);
  }
};

// Tooltip system
const Tooltips = {
  /**
   * Initialize tooltips for elements
   * @param {string} selector - Elements with tooltips
   */
  init: (selector = '.parameter-info') => {
    const tooltipElements = DOM.getAll(selector);
    
    tooltipElements.forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        const info = element.getAttribute('data-info');
        if (!info) return;
        
        // Create tooltip
        const tooltip = DOM.create('div', {
          className: 'tooltip',
          style: {
            position: 'absolute',
            zIndex: 1000
          }
        }, info);
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
      });
      
      element.addEventListener('mouseleave', () => {
        const tooltip = DOM.get('.tooltip');
        if (tooltip) tooltip.remove();
      });
    });
  }
};

// Export all utilities
window.PlasmaUtils = {
  DOM,
  TabSystem,
  ParameterTabs,
  FormValidation,
  Status,
  Tooltips
};
