chrome.storage.sync.get('rules', (data) => {
  const rules = data.rules || [];
  const currentUrl = window.location.href;

  rules.forEach(rule => {
    if (currentUrl.match(new RegExp(rule.urlPattern))) {
      rule.matchPatterns.forEach(pattern => {
        if (pattern.value) {
          highlightText(pattern);
        }
      });
    }
  });
});

function highlightText(pattern) {
  const regex = pattern.type === 'regex' ? new RegExp(pattern.value, 'g') : new RegExp(escapeRegex(pattern.value), 'gi');

  const textNodes = getTextNodes(document.body);

  textNodes.forEach(node => {
    if (node.parentElement && node.parentElement.closest('style,script,noscript,textarea')) {
        return;
    }

    const matches = node.nodeValue.match(regex);
    if (matches) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      node.nodeValue.replace(regex, (match, offset) => {
        // Add the text before the match
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(node.nodeValue.substring(lastIndex, offset)));
        }

        // Add the highlighted span
        const span = document.createElement('span');
        span.textContent = match;
        span.style.backgroundColor = pattern.backgroundColor || '#ffff00';
        span.style.color = pattern.textColor || '#000000';
        span.style.borderRadius = `${pattern.borderRadius || 4}px`;
        span.style.padding = '2px';
        fragment.appendChild(span);

        lastIndex = offset + match.length;
      });

      // Add any remaining text after the last match
      if (lastIndex < node.nodeValue.length) {
        fragment.appendChild(document.createTextNode(node.nodeValue.substring(lastIndex)));
      }

      // Replace the original text node with the new fragment
      if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    }
  });
}

function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  return textNodes;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}