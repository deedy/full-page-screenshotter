chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    captureFullPage(sender.tab.id);
  }
});

async function captureFullPage(tabId) {
  try {
    // Inject content script to get page dimensions
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      function: getPageDimensions
    });

    const { totalHeight, viewportHeight } = result;
    let currentScroll = 0;
    const screenshots = [];

    while (currentScroll < totalHeight) {
      // Scroll to position
      await chrome.scripting.executeScript({
        target: { tabId },
        function: (scrollTop) => window.scrollTo(0, scrollTop),
        args: [currentScroll]
      });

      // Wait for any lazy-loaded content
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the current viewport
      const screenshot = await chrome.tabs.captureVisibleTab(null, {
        format: 'png'
      });
      
      screenshots.push(screenshot);
      currentScroll += viewportHeight;
    }

    // Combine screenshots
    await chrome.scripting.executeScript({
      target: { tabId },
      function: combineScreenshots,
      args: [screenshots, result]
    });

  } catch (error) {
    console.error('Error capturing full page:', error);
  }
}

function getPageDimensions() {
  return {
    totalHeight: Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth
  };
}

function combineScreenshots(screenshots, dimensions) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = dimensions.viewportWidth;
  canvas.height = dimensions.totalHeight;

  const processImage = async (screenshot, y) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, y);
        resolve();
      };
      img.onerror = reject;
      img.src = screenshot;
    });
  };

  Promise.all(screenshots.map((screenshot, index) => 
    processImage(screenshot, index * dimensions.viewportHeight)
  )).then(() => {
    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `fullpage-screenshot-${timestamp}.png`;
      
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
    }, 'image/png');
  });
}