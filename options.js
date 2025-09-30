document.addEventListener('DOMContentLoaded', () => {
  const rulesContainer = document.getElementById('rules-container');
  const addRuleBtn = document.getElementById('add-rule-btn');

  let rules = [];

  // Load rules from storage
  chrome.storage.sync.get('rules', (data) => {
    if (data.rules) {
      rules = data.rules;
      renderRules();
    }
  });

  // Save rules to storage
  function saveRules() {
    chrome.storage.sync.set({ rules });
  }

  // Render rules
  function renderRules() {
    rulesContainer.innerHTML = '';
    rules.forEach((rule, index) => {
      const ruleElement = document.createElement('div');
      ruleElement.className = 'rule';
      ruleElement.innerHTML = `
        <h3>Rule ${index + 1}</h3>
        <label>URL Pattern:</label>
        <input type="text" class="url-pattern" value="${rule.urlPattern}">
        <div class="match-patterns-container">
          <h4>Match Patterns</h4>
        </div>
        <button class="add-match-pattern-btn">Add Match Pattern</button>
        <button class="delete-btn" data-index="${index}">Delete Rule</button>
        <button class="copy-btn" data-index="${index}">Copy Rule</button>
      `;

      const matchPatternsContainer = ruleElement.querySelector('.match-patterns-container');
      rule.matchPatterns.forEach((pattern, patternIndex) => {
        const patternElement = createMatchPatternElement(pattern, index, patternIndex);
        matchPatternsContainer.appendChild(patternElement);
      });

      rulesContainer.appendChild(ruleElement);
    });
  }

  function createMatchPatternElement(pattern, ruleIndex, patternIndex) {
    const patternElement = document.createElement('div');
    patternElement.className = 'match-pattern';
    patternElement.innerHTML = `
      <input type="text" class="match-value" placeholder="Value" value="${pattern.value}">
      <select class="match-type">
        <option value="text" ${pattern.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="regex" ${pattern.type === 'regex' ? 'selected' : ''}>Regex</option>
      </select>
      <label>Text Color:</label>
      <input type="color" class="text-color" value="${pattern.textColor || '#000000'}">
      <label>Background Color:</label>
      <input type="color" class="bg-color" value="${pattern.backgroundColor || '#ffff00'}">
      <label>Border Radius:</label>
      <input type="number" class="border-radius" min="0" value="${pattern.borderRadius || 4}">
      <button class="delete-match-pattern-btn" data-rule-index="${ruleIndex}" data-pattern-index="${patternIndex}">Delete</button>
    `;
    return patternElement;
  }

  // Event Listeners
  addRuleBtn.addEventListener('click', () => {
    rules.push({
      urlPattern: '',
      matchPatterns: []
    });
    renderRules();
    saveRules();
  });

  rulesContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const index = e.target.dataset.index;
      rules.splice(index, 1);
      renderRules();
      saveRules();
    }

    if (e.target.classList.contains('copy-btn')) {
      const index = e.target.dataset.index;
      const newRule = JSON.parse(JSON.stringify(rules[index]));
      rules.splice(index + 1, 0, newRule);
      renderRules();
      saveRules();
    }

    if (e.target.classList.contains('add-match-pattern-btn')) {
        const ruleElement = e.target.closest('.rule');
        const index = Array.from(rulesContainer.children).indexOf(ruleElement);
        rules[index].matchPatterns.push({
            value: '',
            type: 'text',
            textColor: '#000000',
            backgroundColor: '#ffff00',
            borderRadius: 4
        });
        renderRules();
        saveRules();
    }

    if (e.target.classList.contains('delete-match-pattern-btn')) {
        const ruleIndex = e.target.dataset.ruleIndex;
        const patternIndex = e.target.dataset.patternIndex;
        rules[ruleIndex].matchPatterns.splice(patternIndex, 1);
        renderRules();
        saveRules();
    }
  });

  rulesContainer.addEventListener('change', (e) => {
    const ruleElement = e.target.closest('.rule');
    if (!ruleElement) return;
    const index = Array.from(rulesContainer.children).indexOf(ruleElement);

    if (e.target.classList.contains('url-pattern')) {
      rules[index].urlPattern = e.target.value;
    }

    const patternElement = e.target.closest('.match-pattern');
    if (patternElement) {
        const patternIndex = Array.from(ruleElement.querySelector('.match-patterns-container').children).indexOf(patternElement);
        const pattern = rules[index].matchPatterns[patternIndex];

        if (e.target.classList.contains('match-value')) {
            pattern.value = e.target.value;
        } else if (e.target.classList.contains('match-type')) {
            pattern.type = e.target.value;
        } else if (e.target.classList.contains('text-color')) {
            pattern.textColor = e.target.value;
        } else if (e.target.classList.contains('bg-color')) {
            pattern.backgroundColor = e.target.value;
        } else if (e.target.classList.contains('border-radius')) {
            pattern.borderRadius = e.target.value;
        }
    }
    saveRules();
  });
});