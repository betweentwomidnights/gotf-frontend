// Background Script

import 'webextension-polyfill';
import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';

reloadOnUpdate('pages/background');
console.log('background loaded');

let audioDataArray = []; // Initialize the audio data array

async function generateMusic(url, currentTime) {
  console.log(`Generating music for URL: ${url}`);
  try {
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, currentTime }),
    });

    // After saving the audio data to local storage
    chrome.storage.local.set({ audioDataArray }, () => {
      console.log('Audio data saved to local storage.');
      chrome.runtime.sendMessage({ action: 'audioUpdated' });
      chrome.runtime.sendMessage({ action: 'generationCompleted' }); // Broadcast that generation has completed
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.audio) {
      console.log('Audio data received:', data.audio);
      audioDataArray = [data.audio, ...audioDataArray.slice(0, 4)]; // Update the audio data array
      chrome.storage.local.set({ audioDataArray }, () => {
        console.log('Audio data saved to local storage.');
        // Broadcast the update to all components
        chrome.runtime.sendMessage({ action: 'audioUpdated' });
      });
    } else if (data.error) {
      console.error('Error generating music:', data.error);
    }
  } catch (error) {
    console.error('Error generating music:', error);
    chrome.runtime.sendMessage({ action: 'generationFailed' }); // Broadcast that generation has failed
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateMusic") {
    generateMusic(request.url, request.currentTime);
    sendResponse({ status: 'Music generation initiated' });
  } else if (request.action === "getAudioDataArray") {
    // Respond with the current audio data array
    sendResponse({ audioDataArray });
  }
  return true;
});
