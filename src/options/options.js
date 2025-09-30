// Highlighter Bear Options Page JavaScript

class HighlighterBearOptions {
  constructor() {
    this.rules = [];
    this.currentEditingRuleId = null;
    this.init();
  }

  async init() {
    await this.loadRules();
    this.setupEventListeners();
    this.renderRules();
  }

  setupEventListeners() {
    // New Rule button
    /** @type {HTMLButtonElement | null} */
    const newRuleBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('newRuleBtn')
    );
    if (newRuleBtn) {
      newRuleBtn.addEventListener('click', () => {
        this.openRuleModal();
      });
    }

    // Add Match Pattern button
    /** @type {HTMLButtonElement | null} */
    const addMatchPatternBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('addMatchPatternBtn')
    );
    if (addMatchPatternBtn) {
      addMatchPatternBtn.addEventListener('click', () => {
        this.addMatchPattern();
      });
    }

    // Rule form submission
    /** @type {HTMLFormElement | null} */
    const ruleForm = /** @type {HTMLFormElement | null} */ (
      document.getElementById('ruleForm')
    );
    if (ruleForm) {
      ruleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveRule();
      });
    }

    // Delete confirmation
    /** @type {HTMLButtonElement | null} */
    const confirmDeleteBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('confirmDeleteBtn')
    );
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.confirmDelete();
      });
    }

    // Modal close buttons
    /** @type {HTMLButtonElement | null} */
    const closeRuleModalBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('closeRuleModalBtn')
    );
    if (closeRuleModalBtn) {
      closeRuleModalBtn.addEventListener('click', () => {
        this.closeRuleModal();
      });
    }

    /** @type {HTMLButtonElement | null} */
    const cancelRuleBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('cancelRuleBtn')
    );
    if (cancelRuleBtn) {
      cancelRuleBtn.addEventListener('click', () => {
        this.closeRuleModal();
      });
    }

    /** @type {HTMLButtonElement | null} */
    const cancelDeleteBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('cancelDeleteBtn')
    );
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        this.closeDeleteModal();
      });
    }

    // Event delegation for dynamically generated content
    /** @type {HTMLDivElement | null} */
    const rulesContainer = /** @type {HTMLDivElement | null} */ (
      document.getElementById('rulesContainer')
    );
    if (rulesContainer) {
      rulesContainer.addEventListener('click', (e) => {
        if (!e.target) return;
        /** @type {HTMLButtonElement | null} */
        const target = /** @type {HTMLElement} */ (e.target).closest('button');
        if (!target) return;

        /** @type {HTMLElement | null} */
        const ruleRow = target.closest('[data-rule-id]');
        if (!ruleRow) return;

        const ruleId = ruleRow.dataset.ruleId;
        if (!ruleId) return;

        if (target.classList.contains('edit-rule-btn')) {
          this.editRule(ruleId);
        } else if (target.classList.contains('delete-rule-btn')) {
          this.deleteRule(ruleId);
        }
      });

      // Event delegation for toggle switches
      rulesContainer.addEventListener('change', (e) => {
        if (!e.target) return;
        /** @type {HTMLInputElement} */
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (target.type === 'checkbox' && target.classList.contains('toggle')) {
          /** @type {HTMLElement | null} */
          const ruleRow = target.closest('[data-rule-id]');
          if (ruleRow && ruleRow.dataset.ruleId) {
            const ruleId = ruleRow.dataset.ruleId;
            this.toggleRule(ruleId);
          }
        }
      });
    }

    // Event delegation for match pattern removal and toggle buttons
    /** @type {HTMLDivElement | null} */
    const matchPatternsContainer = /** @type {HTMLDivElement | null} */ (
      document.getElementById('matchPatternsContainer')
    );
    if (matchPatternsContainer) {
      matchPatternsContainer.addEventListener('click', (e) => {
        if (!e.target) return;
        /** @type {HTMLButtonElement | null} */
        const target = /** @type {HTMLElement} */ (e.target).closest('button');
        if (target && target.classList.contains('remove-pattern-btn')) {
          /** @type {HTMLElement | null} */
          const patternRow = target.closest('[data-pattern-id]');
          if (patternRow && patternRow.dataset.patternId) {
            const patternId = patternRow.dataset.patternId;
            this.removeMatchPattern(patternId);
          }
        } else if (target && target.dataset.toggle === 'true') {
          // Toggle button active state
          target.classList.toggle('btn-active');
        }
      });

      // Setup drag and drop for reordering patterns
      this.setupPatternDragAndDrop(matchPatternsContainer);
    }
  }

  async loadRules() {
    try {
      const result = await chrome.storage.sync.get(['highlighterRules']);
      this.rules = result.highlighterRules || this.getDefaultRules();
    } catch (error) {
      console.error('Error loading rules:', error);
      this.rules = this.getDefaultRules();
    }
  }

  async saveRules() {
    try {
      await chrome.storage.sync.set({ highlighterRules: this.rules });
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  }

  getDefaultRules() {
    return [
      {
        id: 'rule-1',
        name: 'Important Keywords',
        urlPattern: 'example.com/articles',
        enabled: true,
        matchPatterns: [
          {
            value: 'Important',
            type: 'text',
            textColor: '#000000',
            backgroundColor: '#FFFF00',
            borderRadius: 4,
            bold: false,
            italic: false,
            underline: false,
          },
          {
            value: 'Critical',
            type: 'text',
            textColor: '#FFFFFF',
            backgroundColor: '#FF6B6B',
            borderRadius: 4,
            bold: true,
            italic: false,
            underline: false,
          },
        ],
      },
      {
        id: 'rule-2',
        name: 'Product Names',
        urlPattern: 'shop.example.com',
        enabled: true,
        matchPatterns: [
          {
            value: 'Premium',
            type: 'text',
            textColor: '#FFFFFF',
            backgroundColor: '#4F46E5',
            borderRadius: 4,
            bold: false,
            italic: true,
            underline: false,
          },
        ],
      },
      {
        id: 'rule-3',
        name: 'Customer Reviews',
        urlPattern: 'example.com/reviews',
        enabled: true,
        matchPatterns: [
          {
            value: 'excellent|amazing|great',
            type: 'regex',
            textColor: '#FFFFFF',
            backgroundColor: '#10B981',
            borderRadius: 4,
            bold: false,
            italic: false,
            underline: true,
          },
        ],
      },
      {
        id: 'rule-4',
        name: 'Date and Time',
        urlPattern: 'example.com/events',
        enabled: false,
        matchPatterns: [
          {
            value: '\\d{1,2}/\\d{1,2}/\\d{4}',
            type: 'regex',
            textColor: '#000000',
            backgroundColor: '#FEF3C7',
            borderRadius: 4,
            bold: false,
            italic: false,
            underline: false,
          },
        ],
      },
      {
        id: 'rule-5',
        name: 'User Comments',
        urlPattern: 'forum.example.com',
        enabled: false,
        matchPatterns: [
          {
            value: 'Thanks',
            type: 'text',
            textColor: '#FFFFFF',
            backgroundColor: '#F59E0B',
            borderRadius: 4,
            bold: false,
            italic: false,
            underline: false,
          },
        ],
      },
    ];
  }

  renderRules() {
    /** @type {HTMLDivElement | null} */
    const container = /** @type {HTMLDivElement | null} */ (
      document.getElementById('rulesContainer')
    );
    /** @type {HTMLDivElement | null} */
    const emptyState = /** @type {HTMLDivElement | null} */ (
      document.getElementById('emptyState')
    );

    if (!container || !emptyState) return;

    if (this.rules.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = this.rules
      .map((rule) => this.renderRuleRow(rule))
      .join('');
  }

  renderRuleRow(rule) {
    const colorDots = rule.matchPatterns
      .map((pattern) => {
        const styles = [
          `background-color: ${pattern.backgroundColor}`,
          `color: ${pattern.textColor}`,
        ];
        if (pattern.bold) styles.push('font-weight: bold');
        if (pattern.italic) styles.push('font-style: italic');
        if (pattern.underline) styles.push('text-decoration: underline');

        return `<span class="w-6 h-6 rounded-full text-xs flex items-center justify-center -ml-1 first:ml-0" 
                          style="${styles.join('; ')}">T</span>`;
      })
      .join('');

    return `
            <div class="grid grid-cols-12 gap-4 py-4 items-center hover:bg-gray-50 rounded-lg" data-rule-id="${
              rule.id
            }">
                <div class="col-span-2">
                    <div class="font-medium text-gray-900 px-4 truncate">${this.escapeHtml(
                      rule.name,
                    )}</div>
                </div>
                <div class="col-span-5">
                    <div class="text-gray-600 text-sm font-mono truncate">${this.escapeHtml(
                      rule.urlPattern,
                    )}</div>
                </div>
                <div class="col-span-2">
                    <div class="flex flex-wrap">
                        ${colorDots}
                    </div>
                </div>
                <div class="col-span-1">
                    <label class="cursor-pointer label">
                        <input type="checkbox" class="toggle toggle-primary" ${
                          rule.enabled ? 'checked' : ''
                        }>
                    </label>
                </div>
                <div class="col-span-2">
                    <div class="flex gap-2">
                        <button class="btn btn-ghost btn-sm edit-rule-btn">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm text-red-600 delete-rule-btn">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  openRuleModal(ruleId = null) {
    this.currentEditingRuleId = ruleId;
    /** @type {HTMLDivElement | null} */
    const modal = /** @type {HTMLDivElement | null} */ (
      document.getElementById('ruleModal')
    );
    /** @type {HTMLHeadingElement | null} */
    const modalTitle = /** @type {HTMLHeadingElement | null} */ (
      document.getElementById('modalTitle')
    );

    if (!modal || !modalTitle) return;

    if (ruleId) {
      modalTitle.textContent = 'Edit Rule';
      this.populateRuleForm(ruleId);
    } else {
      modalTitle.textContent = 'Create New Rule';
      this.clearRuleForm();
    }

    modal.classList.add('modal-open');
  }

  closeRuleModal() {
    /** @type {HTMLDivElement | null} */
    const modal = /** @type {HTMLDivElement | null} */ (
      document.getElementById('ruleModal')
    );
    if (modal) {
      modal.classList.remove('modal-open');
    }
    this.currentEditingRuleId = null;
  }

  populateRuleForm(ruleId) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    /** @type {HTMLInputElement | null} */
    const ruleNameInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('ruleName')
    );
    /** @type {HTMLInputElement | null} */
    const urlPatternInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('urlPattern')
    );

    if (ruleNameInput) ruleNameInput.value = rule.name;
    if (urlPatternInput) urlPatternInput.value = rule.urlPattern;

    // Clear existing match patterns
    /** @type {HTMLDivElement | null} */
    const container = /** @type {HTMLDivElement | null} */ (
      document.getElementById('matchPatternsContainer')
    );
    if (container) {
      container.innerHTML = '';
    }

    // Add match patterns
    rule.matchPatterns.forEach((pattern) => {
      this.addMatchPattern(pattern);
    });
  }

  clearRuleForm() {
    /** @type {HTMLInputElement | null} */
    const ruleNameInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('ruleName')
    );
    /** @type {HTMLInputElement | null} */
    const urlPatternInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('urlPattern')
    );
    /** @type {HTMLDivElement | null} */
    const container = /** @type {HTMLDivElement | null} */ (
      document.getElementById('matchPatternsContainer')
    );

    if (ruleNameInput) ruleNameInput.value = '';
    if (urlPatternInput) urlPatternInput.value = '';

    if (container) {
      container.innerHTML = '';
    }

    // Add one empty match pattern
    this.addMatchPattern();
  }

  /**
   * @param {{value: string, type: string, textColor: string, backgroundColor: string, borderRadius: number, bold: boolean, italic: boolean, underline: boolean}|null} pattern
   */
  addMatchPattern(pattern = null) {
    /** @type {HTMLDivElement | null} */
    const container = /** @type {HTMLDivElement | null} */ (
      document.getElementById('matchPatternsContainer')
    );
    if (!container) return;

    const patternId =
      'pattern-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const patternHtml = `
            <div class="grid grid-cols-12 gap-1 mb-3 items-center pattern-row" data-pattern-id="${patternId}" draggable="true">
                <div class="col-span-1 flex items-center justify-center">
                    <div class="drag-handle cursor-move text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                        </svg>
                    </div>
                </div>
                <div class="col-span-2">
                    <input type="text" class="input input-bordered input-sm w-full" 
                           placeholder="Important" value="${
                             pattern ? this.escapeHtml(pattern.value) : ''
                           }" 
                           data-field="value" required>
                </div>
                <div class="col-span-2">
                    <select class="select select-bordered select-sm w-full" data-field="type">
                        <option value="text" ${
                          pattern && pattern.type === 'text' ? 'selected' : ''
                        }>Text</option>
                        <option value="regex" ${
                          pattern && pattern.type === 'regex' ? 'selected' : ''
                        }>Regex</option>
                    </select>
                </div>
                <div class="col-span-1">
                    <input type="color" class="w-full h-8 rounded border border-gray-300" 
                           value="${
                             pattern ? pattern.textColor : '#000000'
                           }" data-field="textColor">
                </div>
                <div class="col-span-1">
                    <input type="color" class="w-full h-8 rounded border border-gray-300" 
                           value="${
                             pattern ? pattern.backgroundColor : '#FFFF00'
                           }" data-field="backgroundColor">
                </div>
                <div class="col-span-2">
                    <input type="number" class="input input-bordered input-sm w-full" 
                           min="0" max="20" value="${
                             pattern ? pattern.borderRadius : 4
                           }" 
                           data-field="borderRadius">
                </div>
                <div class="col-span-2">
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-xs ${
                          pattern && pattern.bold ? 'btn-active' : ''
                        }" data-field="bold" data-toggle="true" title="Bold">
                            <strong>B</strong>
                        </button>
                        <button type="button" class="btn btn-xs ${
                          pattern && pattern.italic ? 'btn-active' : ''
                        }" data-field="italic" data-toggle="true" title="Italic">
                            <em>I</em>
                        </button>
                        <button type="button" class="btn btn-xs ${
                          pattern && pattern.underline ? 'btn-active' : ''
                        }" data-field="underline" data-toggle="true" title="Underline">
                            <u>U</u>
                        </button>
                    </div>
                </div>
                <div class="col-span-1">
                    <button type="button" class="btn btn-ghost btn-sm text-red-600 remove-pattern-btn">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

    container.insertAdjacentHTML('beforeend', patternHtml);
  }

  removeMatchPattern(patternId) {
    const element = document.querySelector(`[data-pattern-id="${patternId}"]`);
    if (element) {
      element.remove();
    }
  }

  saveRule() {
    /** @type {HTMLInputElement | null} */
    const ruleNameInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('ruleName')
    );
    /** @type {HTMLInputElement | null} */
    const urlPatternInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('urlPattern')
    );

    if (!ruleNameInput || !urlPatternInput) return;

    const name = ruleNameInput.value.trim();
    const urlPattern = urlPatternInput.value.trim();

    if (!name || !urlPattern) {
      alert('Please fill in all required fields.');
      return;
    }

    // Collect match patterns
    const matchPatterns = [];
    /** @type {NodeListOf<HTMLElement>} */
    const patternElements = document.querySelectorAll(
      '#matchPatternsContainer [data-pattern-id]',
    );

    for (const element of patternElements) {
      /** @type {HTMLInputElement | null} */
      const valueInput = /** @type {HTMLInputElement | null} */ (
        element.querySelector('[data-field="value"]')
      );
      /** @type {HTMLSelectElement | null} */
      const typeSelect = /** @type {HTMLSelectElement | null} */ (
        element.querySelector('[data-field="type"]')
      );
      /** @type {HTMLInputElement | null} */
      const textColorInput = /** @type {HTMLInputElement | null} */ (
        element.querySelector('[data-field="textColor"]')
      );
      /** @type {HTMLInputElement | null} */
      const backgroundColorInput = /** @type {HTMLInputElement | null} */ (
        element.querySelector('[data-field="backgroundColor"]')
      );
      /** @type {HTMLInputElement | null} */
      const borderRadiusInput = /** @type {HTMLInputElement | null} */ (
        element.querySelector('[data-field="borderRadius"]')
      );
      /** @type {HTMLButtonElement | null} */
      const boldBtn = /** @type {HTMLButtonElement | null} */ (
        element.querySelector('[data-field="bold"]')
      );
      /** @type {HTMLButtonElement | null} */
      const italicBtn = /** @type {HTMLButtonElement | null} */ (
        element.querySelector('[data-field="italic"]')
      );
      /** @type {HTMLButtonElement | null} */
      const underlineBtn = /** @type {HTMLButtonElement | null} */ (
        element.querySelector('[data-field="underline"]')
      );

      if (
        !valueInput ||
        !typeSelect ||
        !textColorInput ||
        !backgroundColorInput ||
        !borderRadiusInput
      )
        continue;

      const value = valueInput.value.trim();
      const type = typeSelect.value;
      const textColor = textColorInput.value;
      const backgroundColor = backgroundColorInput.value;
      const borderRadius = parseInt(borderRadiusInput.value);
      const bold = boldBtn ? boldBtn.classList.contains('btn-active') : false;
      const italic = italicBtn
        ? italicBtn.classList.contains('btn-active')
        : false;
      const underline = underlineBtn
        ? underlineBtn.classList.contains('btn-active')
        : false;

      if (value) {
        matchPatterns.push({
          value,
          type,
          textColor,
          backgroundColor,
          borderRadius,
          bold,
          italic,
          underline,
        });
      }
    }

    if (matchPatterns.length === 0) {
      alert('Please add at least one match pattern.');
      return;
    }

    const rule = {
      id: this.currentEditingRuleId || 'rule-' + Date.now(),
      name,
      urlPattern,
      enabled: true,
      matchPatterns,
    };

    if (this.currentEditingRuleId) {
      // Update existing rule
      const index = this.rules.findIndex(
        (r) => r.id === this.currentEditingRuleId,
      );
      if (index !== -1) {
        this.rules[index] = rule;
      }
    } else {
      // Add new rule
      this.rules.push(rule);
    }

    this.saveRules();
    this.renderRules();
    this.closeRuleModal();
  }

  editRule(ruleId) {
    this.openRuleModal(ruleId);
  }

  deleteRule(ruleId) {
    this.ruleToDelete = ruleId;
    /** @type {HTMLDivElement | null} */
    const modal = /** @type {HTMLDivElement | null} */ (
      document.getElementById('deleteModal')
    );
    if (modal) {
      modal.classList.add('modal-open');
    }
  }

  closeDeleteModal() {
    /** @type {HTMLDivElement | null} */
    const modal = /** @type {HTMLDivElement | null} */ (
      document.getElementById('deleteModal')
    );
    if (modal) {
      modal.classList.remove('modal-open');
    }
    this.ruleToDelete = null;
  }

  confirmDelete() {
    if (this.ruleToDelete) {
      this.rules = this.rules.filter((rule) => rule.id !== this.ruleToDelete);
      this.saveRules();
      this.renderRules();
      this.closeDeleteModal();
    }
  }

  toggleRule(ruleId) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveRules();
    }
  }

  setupPatternDragAndDrop(container) {
    let draggedElement = null;
    let placeholder = null;

    container.addEventListener('dragstart', (e) => {
      if (!e.target) return;
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.classList.contains('pattern-row')) {
        draggedElement = target;
        target.style.opacity = '0.5';
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      }
    });

    container.addEventListener('dragend', (e) => {
      if (!e.target) return;
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.classList.contains('pattern-row')) {
        target.style.opacity = '1';
        draggedElement = null;
        // Remove placeholder if it exists
        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
          placeholder = null;
        }
      }
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedElement) return;

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      const target = /** @type {HTMLElement} */ (e.target);
      const patternRow = target.closest('.pattern-row');

      if (patternRow && patternRow !== draggedElement) {
        // Create placeholder if it doesn't exist
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className =
            'grid grid-cols-12 gap-3 mb-3 items-center h-12 bg-blue-100 border-2 border-dashed border-blue-400 rounded';
        }

        // Determine if we should insert before or after the target
        const rect = patternRow.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
          // Insert before
          container.insertBefore(placeholder, patternRow);
        } else {
          // Insert after
          if (patternRow.nextSibling) {
            container.insertBefore(placeholder, patternRow.nextSibling);
          } else {
            container.appendChild(placeholder);
          }
        }
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedElement || !placeholder) return;

      // Insert the dragged element at the placeholder position
      container.insertBefore(draggedElement, placeholder);

      // Remove placeholder
      if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      placeholder = null;
      draggedElement.style.opacity = '1';
      draggedElement = null;
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
let highlighterOptions;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  highlighterOptions = new HighlighterBearOptions();
});
