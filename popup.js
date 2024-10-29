document.addEventListener('DOMContentLoaded', function() {
  const captureBtn = document.getElementById('captureBtn');
  const status = document.getElementById('status');

  captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    status.textContent = 'Starting capture...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: initiateCapture
      });
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      captureBtn.disabled = false;
    }
  });
});

function initiateCapture() {
  chrome.runtime.sendMessage({ action: 'startCapture' });
}