chrome.action.onClicked.addListener(async (tab) => {
  const optionsUrl = chrome.runtime.getURL('src/options/options.html');
  const tabUrl = tab.url;

  if (tabUrl && (tabUrl.startsWith('http://') || tabUrl.startsWith('https://'))) {
    const newRuleData = {
      url: tabUrl,
      title: tab.title || ''
    };

    // Save the data to local storage and then open the options page
    await chrome.storage.local.set({ newRuleData });
    chrome.tabs.create({ url: optionsUrl });

  } else {
    // If it's not a standard webpage, just open the options page
    // without sending any data.
    chrome.tabs.create({ url: optionsUrl });
  }
});