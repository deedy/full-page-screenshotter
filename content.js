// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getScrollPosition') {
    sendResponse({
      scrollTop: window.pageYOffset || document.documentElement.scrollTop
    });
  }
});