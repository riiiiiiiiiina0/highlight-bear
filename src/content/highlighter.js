// Highlighter Bear Content Script
// This script runs on all pages and applies highlighting based on rules

class HighlighterBear {
  constructor() {
    this.rules = [];
    this.matchingRules = [];
    this.observer = null;
    this.highlightedNodes = new Set();
    this.pendingNodes = new Set();
    this.highlightTimeout = null;
    this.init();
  }

  async init() {
    console.log('Highlight Bear: Initializing...');
    await this.loadRules();
    this.checkUrlMatch();

    if (this.matchingRules.length > 0) {
      console.log(
        'Highlighter Bear: Starting highlighting for',
        this.matchingRules.length,
        'matching rules',
      );
      this.startHighlighting();

      // Retry after a delay for dynamic content (like SPAs)
      setTimeout(() => {
        console.log(
          'Highlighter Bear: Retrying highlighting for dynamic content...',
        );
        this.startHighlighting();
      }, 1000);

      // Retry again after more time
      setTimeout(() => {
        console.log('Highlight Bear: Final retry for dynamic content...');
        this.startHighlighting();
      }, 3000);

      this.setupMutationObserver();
      this.listenForRuleChanges();
    } else {
      console.log('Highlight Bear: No matching rules for this page');
    }
  }

  async loadRules() {
    try {
      const result = await chrome.storage.sync.get(['highlighterRules']);
      this.rules = result.highlighterRules || [];
      console.log('Highlight Bear: Loaded rules:', this.rules);
    } catch (error) {
      console.error('Highlighter Bear: Error loading rules:', error);
      this.rules = [];
    }
  }

  checkUrlMatch() {
    const currentUrl = window.location.href;
    console.log('Highlight Bear: Current URL:', currentUrl);
    this.matchingRules = this.rules.filter((rule) => {
      // Only consider enabled rules
      if (!rule.enabled) return false;

      // Empty URL pattern matches all URLs
      if (!rule.urlPattern || rule.urlPattern.trim() === '') {
        console.log('Highlight Bear: Rule matched (all URLs):', rule.name);
        return true;
      }

      // Check if URL matches the pattern
      // The urlPattern can be a simple string that should be included in the URL
      try {
        // Convert pattern to regex if it's not already
        // Support both simple string matching and regex patterns
        if (currentUrl.includes(rule.urlPattern)) {
          console.log('Highlight Bear: Rule matched (string):', rule.name);
          return true;
        }

        // Try as regex pattern
        const regexPattern = new RegExp(rule.urlPattern);
        if (regexPattern.test(currentUrl)) {
          console.log('Highlight Bear: Rule matched (regex):', rule.name);
          return true;
        }
      } catch (e) {
        // If regex is invalid, fall back to simple string matching
        return currentUrl.includes(rule.urlPattern);
      }
      return false;
    });
    console.log('Highlight Bear: Matching rules:', this.matchingRules);
  }

  startHighlighting() {
    // Apply highlights to the entire document
    console.log('Highlight Bear: Starting to scan document.body');
    // Clear previous highlights to avoid duplicates
    this.clearHighlights();
    this.highlightElement(document.body);
    console.log('Highlight Bear: Finished scanning document');
  }

  highlightElement(element) {
    if (!element || !element.childNodes) return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip script, style, and already highlighted content
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tagName = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'textarea'].includes(tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if already highlighted
        if (parent.classList.contains('highlighter-bear-mark')) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if empty or whitespace only
        if (!node.textContent || !node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    console.log(
      'Highlighter Bear: Found',
      textNodes.length,
      'text nodes to process',
    );

    // Process text nodes
    textNodes.forEach((textNode) => {
      this.highlightTextNode(textNode);
    });
  }

  highlightTextNode(textNode) {
    let text = textNode.textContent;
    let matches = [];

    // Find all matches from all rules, assigning priority based on order
    let patternPriority = 0;
    this.matchingRules.forEach((rule) => {
      rule.matchPatterns.forEach((pattern) => {
        const foundMatches = this.findMatches(text, pattern);
        if (foundMatches.length > 0) {
          console.log(
            'Highlighter Bear: Found',
            foundMatches.length,
            'matches for pattern:',
            pattern.value,
          );
        }
        matches = matches.concat(
          foundMatches.map((match) => ({
            ...match,
            pattern: pattern,
            priority: patternPriority,
          })),
        );
        patternPriority++;
      });
    });

    if (matches.length === 0) return;

    // Sort matches by start position, then by priority (higher priority last)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.priority - b.priority;
    });

    // Remove overlapping matches (keep the last one based on priority)
    const nonOverlappingMatches = [];
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      let shouldKeep = true;

      // Check if this match overlaps with any previously kept match
      for (let j = 0; j < nonOverlappingMatches.length; j++) {
        const keptMatch = nonOverlappingMatches[j];

        // Check for overlap
        const hasOverlap =
          currentMatch.start < keptMatch.end &&
          currentMatch.end > keptMatch.start;

        if (hasOverlap) {
          // If current match has higher priority, replace the kept match
          if (currentMatch.priority > keptMatch.priority) {
            nonOverlappingMatches.splice(j, 1);
            j--;
          } else {
            // Otherwise, don't keep the current match
            shouldKeep = false;
            break;
          }
        }
      }

      if (shouldKeep) {
        nonOverlappingMatches.push(currentMatch);
      }
    }

    if (nonOverlappingMatches.length === 0) return;

    // Sort final matches by start position for rendering
    nonOverlappingMatches.sort((a, b) => a.start - b.start);

    // Create fragment with highlighted text
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    nonOverlappingMatches.forEach((match) => {
      // Add text before match
      if (match.start > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex, match.start)),
        );
      }

      // Add highlighted match
      const mark = document.createElement('span');
      mark.className = 'highlighter-bear-mark';
      mark.textContent = match.text;
      mark.style.color = match.pattern.textColor;
      mark.style.backgroundColor = match.pattern.backgroundColor;
      mark.style.borderRadius = match.pattern.borderRadius + 'px';
      mark.style.padding = '0 2px';
      mark.style.transition = 'all 0.2s ease';

      // Apply text styles
      if (match.pattern.bold) {
        mark.style.fontWeight = 'bold';
      }
      if (match.pattern.italic) {
        mark.style.fontStyle = 'italic';
      }
      if (match.pattern.underline) {
        mark.style.textDecoration = 'underline';
      }

      fragment.appendChild(mark);

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // Replace the text node with the fragment
    textNode.parentNode.replaceChild(fragment, textNode);
    this.highlightedNodes.add(textNode.parentNode);
  }

  findMatches(text, pattern) {
    const matches = [];

    if (pattern.type === 'text') {
      // Simple text matching (case-insensitive)
      const searchText = pattern.value.toLowerCase();
      const lowerText = text.toLowerCase();
      let index = 0;

      while (index < text.length) {
        const foundIndex = lowerText.indexOf(searchText, index);
        if (foundIndex === -1) break;

        matches.push({
          start: foundIndex,
          end: foundIndex + searchText.length,
          text: text.substring(foundIndex, foundIndex + searchText.length),
        });

        index = foundIndex + searchText.length;
      }
    } else if (pattern.type === 'regex') {
      // Regex matching
      try {
        const regex = new RegExp(pattern.value, 'gi');
        let match;

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
          });

          // Prevent infinite loop for zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      } catch (e) {
        console.error(
          'Highlighter Bear: Invalid regex pattern:',
          pattern.value,
          e,
        );
      }
    }

    return matches;
  }

  setupMutationObserver() {
    // Disconnect existing observer if any
    if (this.observer) {
      this.observer.disconnect();
    }

    // Create a new observer to watch for DOM changes
    this.observer = new MutationObserver((mutations) => {
      let hasNewNodes = false;

      mutations.forEach((mutation) => {
        // Process added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Add to pending nodes set
            this.pendingNodes.add(node);
            hasNewNodes = true;
          } else if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent &&
            node.textContent.trim()
          ) {
            // For text nodes, add the parent element
            if (node.parentElement) {
              this.pendingNodes.add(node.parentElement);
              hasNewNodes = true;
            }
          }
        });
      });

      // Debounce highlighting to avoid performance issues
      if (hasNewNodes) {
        this.debounceHighlight();
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  debounceHighlight() {
    // Clear existing timeout
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }

    // Set new timeout to process all pending nodes
    this.highlightTimeout = setTimeout(() => {
      console.log(
        'Highlighter Bear: Processing',
        this.pendingNodes.size,
        'pending nodes',
      );

      // Process all pending nodes
      this.pendingNodes.forEach((node) => {
        // Make sure the node is still in the DOM
        if (document.contains(node)) {
          this.highlightElement(node);
        }
      });

      // Clear the pending nodes set
      this.pendingNodes.clear();
      this.highlightTimeout = null;
    }, 100);
  }

  listenForRuleChanges() {
    // Listen for changes in storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.highlighterRules) {
        // Rules have changed, reload and reapply
        this.reload();
      }
    });
  }

  async reload() {
    // Clear existing highlights
    this.clearHighlights();

    // Reload rules
    await this.loadRules();
    this.checkUrlMatch();

    // Reapply highlights if there are matching rules
    if (this.matchingRules.length > 0) {
      this.startHighlighting();
      if (!this.observer) {
        this.setupMutationObserver();
      }
    } else {
      // Stop observing if no matching rules
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }

  clearHighlights() {
    // Clear any pending highlight operations
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
      this.highlightTimeout = null;
    }
    this.pendingNodes.clear();

    // Find all highlighted elements and unwrap them
    const highlightedElements = document.querySelectorAll(
      '.highlighter-bear-mark',
    );
    highlightedElements.forEach((element) => {
      const parent = element.parentNode;
      if (parent) {
        // Replace the span with its text content
        const textNode = document.createTextNode(element.textContent);
        parent.replaceChild(textNode, element);

        // Normalize the parent to merge adjacent text nodes
        parent.normalize();
      }
    });

    this.highlightedNodes.clear();
  }
}

// Initialize the highlighter when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new HighlighterBear();
  });
} else {
  // DOM is already ready
  new HighlighterBear();
}
