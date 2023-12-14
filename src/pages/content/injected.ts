import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';

async function toggleTheme() {
  console.log('initial theme', await exampleThemeStorage.get());
  exampleThemeStorage.toggle();
  console.log('toggled theme', await exampleThemeStorage.get());
}

void toggleTheme();


console.log('Content script has been injected into the page.');

// Listener for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);

  // Check if the received message is to get the video time
  if (request.action === "getVideoTime") {
    try {
      console.log('Attempting to access the video element...');
      const videoElement = document.querySelector('video');

      console.log('Video element:', videoElement);

      if (videoElement) {
        console.log('Current video time:', videoElement.currentTime);
        sendResponse({ currentTime: videoElement.currentTime });
      } else {
        console.log('No video element found on the page.');
        throw new Error('No video element found');
      }
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({ error: error.message });
    }
    return true; // Indicates an asynchronous response
  }
});
