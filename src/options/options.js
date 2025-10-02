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
    this.handleNewRuleData();
  }

  async handleNewRuleData() {
    const result = await chrome.storage.local.get('newRuleData');
    if (result.newRuleData) {
      const { url, title } = result.newRuleData;

      this.openRuleModal();

      /** @type {HTMLInputElement | null} */
      const ruleNameInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('ruleName')
      );
      /** @type {HTMLInputElement | null} */
      const urlPatternInput = /** @type {HTMLInputElement | null} */ (
        document.getElementById('urlPattern')
      );

      if (ruleNameInput && title) {
        ruleNameInput.value = title;
      }
      if (urlPatternInput) {
        urlPatternInput.value = url;
      }

      // Clear the data from storage
      await chrome.storage.local.remove('newRuleData');
    }
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

    // Export Rules button
    /** @type {HTMLButtonElement | null} */
    const exportRulesBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('exportRulesBtn')
    );
    if (exportRulesBtn) {
      exportRulesBtn.addEventListener('click', () => {
        this.exportRules();
      });
    }

    // Import Rules button
    /** @type {HTMLButtonElement | null} */
    const importRulesBtn = /** @type {HTMLButtonElement | null} */ (
      document.getElementById('importRulesBtn')
    );
    if (importRulesBtn) {
      importRulesBtn.addEventListener('click', () => {
        this.importRules();
      });
    }

    // Import file input
    /** @type {HTMLInputElement | null} */
    const importFileInput = /** @type {HTMLInputElement | null} */ (
      document.getElementById('importFileInput')
    );
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        this.handleImportFile(e);
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

    // Event delegation for match pattern removal, move, and toggle buttons
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
        } else if (target && target.classList.contains('move-up-pattern-btn')) {
          /** @type {HTMLElement | null} */
          const patternRow = target.closest('[data-pattern-id]');
          if (patternRow) {
            this.movePatternUp(patternRow);
          }
        } else if (
          target &&
          target.classList.contains('move-down-pattern-btn')
        ) {
          /** @type {HTMLElement | null} */
          const patternRow = target.closest('[data-pattern-id]');
          if (patternRow) {
            this.movePatternDown(patternRow);
          }
        } else if (target && target.dataset.toggle === 'true') {
          // Toggle button active state
          target.classList.toggle('btn-active');
        } else if (target && target.classList.contains('color-picker-btn')) {
          // Color picker button clicked - toggle popover
          const container = target.closest('.color-picker-container');
          if (container) {
            const popover = container.querySelector('.color-picker-popover');
            if (popover) {
              // Close all other popovers first
              document
                .querySelectorAll('.color-picker-popover')
                .forEach((p) => {
                  if (p !== popover) p.classList.add('hidden');
                });
              // Toggle this popover
              popover.classList.toggle('hidden');
            }
          }
        }
      });

      // Event delegation for color picker hex input changes
      matchPatternsContainer.addEventListener('input', (e) => {
        if (!e.target) return;
        /** @type {HTMLInputElement} */
        const target = /** @type {HTMLInputElement} */ (e.target);

        if (target.classList.contains('color-picker-hex')) {
          // Update the button and container color
          const container = target.closest('.color-picker-container');
          if (container) {
            const alphaSlider = container.querySelector('.color-picker-alpha');
            const button = container.querySelector('.color-picker-btn');
            const alpha = alphaSlider ? parseFloat(alphaSlider.value) : 1;
            const rgba = this.hexAlphaToRgba(target.value, alpha);

            if (button) {
              button.style.backgroundColor = rgba;
            }
            container.dataset.color = rgba;
          }
        } else if (target.classList.contains('color-picker-alpha')) {
          // Update the button and container color with new alpha
          const container = target.closest('.color-picker-container');
          if (container) {
            const hexInput = container.querySelector('.color-picker-hex');
            const button = container.querySelector('.color-picker-btn');
            const alphaValue = container.querySelector(
              '.color-picker-alpha-value',
            );
            const alpha = parseFloat(target.value);

            if (hexInput && button) {
              const rgba = this.hexAlphaToRgba(hexInput.value, alpha);
              button.style.backgroundColor = rgba;
              container.dataset.color = rgba;
            }

            if (alphaValue) {
              alphaValue.textContent = `${Math.round(alpha * 100)}%`;
            }
          }
        }
      });
    }

    // Global click listener to close color picker popovers when clicking outside
    document.addEventListener('click', (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      // Don't close if clicking inside a color picker container
      if (!target.closest('.color-picker-container')) {
        document
          .querySelectorAll('.color-picker-popover')
          .forEach((popover) => {
            popover.classList.add('hidden');
          });
      }
    });
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
    return [];
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

        return `<span class="badge badge-lg -ml-4 first:ml-0" 
                          style="${styles.join('; ')}">T</span>`;
      })
      .join('');

    return `
            <div class="grid grid-cols-12 gap-4 py-4 items-center hover:bg-base-200 rounded-lg transition-colors" data-rule-id="${
              rule.id
            }">
                <div class="col-span-2">
                    <div class="font-semibold px-4 truncate">${this.escapeHtml(
                      rule.name,
                    )}</div>
                </div>
                <div class="col-span-5">
                    <div class="text-base-content/70 text-sm font-mono truncate px-2 py-1 bg-base-200 rounded">${this.escapeHtml(
                      rule.urlPattern || 'All URLs',
                    )}</div>
                </div>
                <div class="col-span-2">
                    <div class="flex flex-wrap gap-1">
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
                        <button class="btn btn-ghost btn-sm edit-rule-btn" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm text-error delete-rule-btn" title="Delete">
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
            <div class="grid grid-cols-12 gap-1 mb-3 items-center pattern-row bg-base-200/50 p-2 rounded-lg" data-pattern-id="${patternId}">
                <div class="col-span-2">
                    <input type="text" class="input input-bordered input-sm w-full"
                           placeholder="word, phrase, etc" value="${
                             pattern ? this.escapeHtml(pattern.value) : ''
                           }" 
                           data-field="value" required>
                </div>
                <div class="col-span-3">
                    <select class="select select-bordered select-sm w-full" data-field="type">
                        <option value="text" ${
                          pattern && pattern.type === 'text' ? 'selected' : ''
                        }>Text</option>
                        <option value="regex" ${
                          pattern && pattern.type === 'regex' ? 'selected' : ''
                        }>Regex</option>
                        <option value="list" ${
                          pattern && pattern.type === 'list' ? 'selected' : ''
                        }>Comma separated list</option>
                    </select>
                </div>
                <div class="col-span-1">
                    <div class="relative color-picker-container" data-field="textColor" data-color="${
                      pattern ? pattern.textColor : '#000000'
                    }">
                        <button type="button" class="color-picker-btn w-full h-8 rounded-lg border border-base-300 cursor-pointer shadow-sm"
                                style="background-color: ${
                                  pattern ? pattern.textColor : '#000000'
                                }; display: block;" 
                                title="Text Color"></button>
                        <div class="color-picker-popover absolute hidden z-50 mt-2 p-3 bg-base-100 rounded-lg shadow-xl border border-base-300" style="min-width: 200px;">
                            <input type="color" class="color-picker-hex w-full h-8 rounded-lg mb-2 cursor-pointer" 
                                   value="${
                                     pattern
                                       ? this.rgbaToHex(pattern.textColor)
                                       : '#000000'
                                   }">
                            <div class="flex items-center gap-2">
                                <label class="text-xs text-base-content/70">Opacity:</label>
                                <input type="range" class="range range-xs color-picker-alpha flex-1" min="0" max="1" step="0.01" 
                                       value="${
                                         pattern
                                           ? this.getAlpha(pattern.textColor)
                                           : '1'
                                       }">
                                <span class="color-picker-alpha-value text-xs text-base-content/70 w-8">${
                                  pattern
                                    ? Math.round(
                                        this.getAlpha(pattern.textColor) * 100,
                                      )
                                    : '100'
                                }%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-span-1">
                    <div class="relative color-picker-container" data-field="backgroundColor" data-color="${
                      pattern ? pattern.backgroundColor : '#FFFF00'
                    }">
                        <button type="button" class="color-picker-btn w-full h-8 rounded-lg border border-base-300 cursor-pointer shadow-sm"
                                style="background-color: ${
                                  pattern ? pattern.backgroundColor : '#FFFF00'
                                }; display: block;" 
                                title="Background Color"></button>
                        <div class="color-picker-popover absolute hidden z-50 mt-2 p-3 bg-base-100 rounded-lg shadow-xl border border-base-300" style="min-width: 200px;">
                            <input type="color" class="color-picker-hex w-full h-8 rounded-lg mb-2 cursor-pointer" 
                                   value="${
                                     pattern
                                       ? this.rgbaToHex(pattern.backgroundColor)
                                       : '#FFFF00'
                                   }">
                            <div class="flex items-center gap-2">
                                <label class="text-xs text-base-content/70">Opacity:</label>
                                <input type="range" class="range range-xs color-picker-alpha flex-1" min="0" max="1" step="0.01" 
                                       value="${
                                         pattern
                                           ? this.getAlpha(
                                               pattern.backgroundColor,
                                             )
                                           : '1'
                                       }">
                                <span class="color-picker-alpha-value text-xs text-base-content/70 w-8">${
                                  pattern
                                    ? Math.round(
                                        this.getAlpha(pattern.backgroundColor) *
                                          100,
                                      )
                                    : '100'
                                }%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-span-1">
                    <input type="number" class="input input-bordered input-sm w-full"
                           min="0" max="20" value="${
                             pattern ? pattern.borderRadius : 4
                           }" 
                           data-field="borderRadius">
                </div>
                <div class="col-span-2">
                    <div class="join">
                        <button type="button" class="btn btn-sm join-item ${
                          pattern && pattern.bold ? 'btn-active' : ''
                        }" data-field="bold" data-toggle="true" title="Bold">
                            <strong>B</strong>
                        </button>
                        <button type="button" class="btn btn-sm join-item ${
                          pattern && pattern.italic ? 'btn-active' : ''
                        }" data-field="italic" data-toggle="true" title="Italic">
                            <em>I</em>
                        </button>
                        <button type="button" class="btn btn-sm join-item ${
                          pattern && pattern.underline ? 'btn-active' : ''
                        }" data-field="underline" data-toggle="true" title="Underline">
                            <u>U</u>
                        </button>
                    </div>
                </div>
                <div class="col-span-2">
                    <div class="join">
                        <button type="button" class="btn btn-sm join-item move-up-pattern-btn" title="Move Up">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                        </button>
                        <button type="button" class="btn btn-sm join-item move-down-pattern-btn" title="Move Down">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <button type="button" class="btn btn-sm join-item text-error remove-pattern-btn" title="Delete">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

    container.insertAdjacentHTML('beforeend', patternHtml);
    this.updatePatternButtonStates();
  }

  removeMatchPattern(patternId) {
    const element = document.querySelector(`[data-pattern-id="${patternId}"]`);
    if (element) {
      element.remove();
      this.updatePatternButtonStates();
    }
  }

  movePatternUp(patternRow) {
    const previousRow = patternRow.previousElementSibling;
    if (previousRow && previousRow.classList.contains('pattern-row')) {
      patternRow.parentNode.insertBefore(patternRow, previousRow);
      this.updatePatternButtonStates();
    }
  }

  movePatternDown(patternRow) {
    const nextRow = patternRow.nextElementSibling;
    if (nextRow && nextRow.classList.contains('pattern-row')) {
      patternRow.parentNode.insertBefore(nextRow, patternRow);
      this.updatePatternButtonStates();
    }
  }

  updatePatternButtonStates() {
    const patternRows = document.querySelectorAll(
      '#matchPatternsContainer .pattern-row',
    );

    patternRows.forEach((row, index) => {
      const moveUpBtn = row.querySelector('.move-up-pattern-btn');
      const moveDownBtn = row.querySelector('.move-down-pattern-btn');

      if (moveUpBtn) {
        if (index === 0) {
          moveUpBtn.disabled = true;
          moveUpBtn.classList.add('btn-disabled');
        } else {
          moveUpBtn.disabled = false;
          moveUpBtn.classList.remove('btn-disabled');
        }
      }

      if (moveDownBtn) {
        if (index === patternRows.length - 1) {
          moveDownBtn.disabled = true;
          moveDownBtn.classList.add('btn-disabled');
        } else {
          moveDownBtn.disabled = false;
          moveDownBtn.classList.remove('btn-disabled');
        }
      }
    });
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

    if (!name) {
      alert('Please enter a rule name.');
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
      /** @type {HTMLElement | null} */
      const textColorContainer = /** @type {HTMLElement | null} */ (
        element.querySelector('[data-field="textColor"]')
      );
      /** @type {HTMLElement | null} */
      const backgroundColorContainer = /** @type {HTMLElement | null} */ (
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
        !textColorContainer ||
        !backgroundColorContainer ||
        !borderRadiusInput
      )
        continue;

      const value = valueInput.value.trim();
      const type = typeSelect.value;
      const textColor = textColorContainer.dataset.color || '#000000';
      const backgroundColor =
        backgroundColorContainer.dataset.color || '#FFFF00';
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convert RGBA color to hex (ignoring alpha)
   * @param {string} color - Color in any format
   * @returns {string} - Hex color
   */
  rgbaToHex(color) {
    // If already hex, return it
    if (color.startsWith('#')) {
      return color.substring(0, 7); // Remove alpha if present
    }

    // Parse rgba/rgb
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    return color;
  }

  /**
   * Get alpha value from color
   * @param {string} color - Color in any format
   * @returns {number} - Alpha value between 0 and 1
   */
  getAlpha(color) {
    // Check for rgba
    const match = color.match(/rgba?\([^,]+,[^,]+,[^,]+,?\s*([\d.]+)?\)/);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return 1; // Default to fully opaque
  }

  /**
   * Convert hex and alpha to rgba
   * @param {string} hex - Hex color
   * @param {number} alpha - Alpha value
   * @returns {string} - RGBA color string
   */
  hexAlphaToRgba(hex, alpha) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Export all rules to a JSON file
   */
  exportRules() {
    if (this.rules.length === 0) {
      alert('No rules to export.');
      return;
    }

    const exportData = {
      rules: this.rules,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    link.download = `highlighter-bear-rules-${date}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Trigger the file input for importing rules
   */
  importRules() {
    const fileInput = document.getElementById('importFileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle the imported file
   * @param {Event} event - The file input change event
   */
  async handleImportFile(event) {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate that it has the correct structure
      if (!importedData || typeof importedData !== 'object') {
        alert('Invalid file format. Expected a JSON object.');
        return;
      }

      // Check if rules property exists and is an array
      if (!importedData.rules || !Array.isArray(importedData.rules)) {
        alert('Invalid file format. Expected a "rules" array in the JSON.');
        return;
      }

      const importedRules = importedData.rules;

      // Validate each rule has required fields
      const isValid = importedRules.every(
        (rule) =>
          rule.name &&
          rule.hasOwnProperty('urlPattern') &&
          Array.isArray(rule.matchPatterns),
      );

      if (!isValid) {
        alert('Invalid rule format in the imported file.');
        return;
      }

      // Ask user if they want to replace or merge
      const shouldReplace = confirm(
        `Found ${importedRules.length} rule(s) in the file.\n\n` +
          'Click OK to REPLACE all existing rules, or Cancel to MERGE with existing rules.',
      );

      if (shouldReplace) {
        // Replace all rules
        this.rules = importedRules;
      } else {
        // Merge rules - add new ones with unique IDs
        importedRules.forEach((rule) => {
          // Generate new unique ID to avoid conflicts
          rule.id =
            'rule-' +
            Date.now() +
            '-' +
            Math.random().toString(36).substring(2, 9);
          this.rules.push(rule);
        });
      }

      await this.saveRules();
      this.renderRules();

      alert(`Successfully imported ${importedRules.length} rule(s).`);
    } catch (error) {
      console.error('Error importing rules:', error);
      alert('Failed to import rules. Please check the file format.');
    } finally {
      // Reset the file input so the same file can be imported again
      input.value = '';
    }
  }
}

// Global instance
let highlighterOptions;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  highlighterOptions = new HighlighterBearOptions();
});
