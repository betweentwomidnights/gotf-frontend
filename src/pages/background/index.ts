import 'webextension-polyfill';
import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';

reloadOnUpdate('pages/background');

console.log('background loaded');

let audioDataArray: string[] = [];

async function generateMusic(url: string) {
  console.log(`Generating music for URL: ${url}`);
  try {
    const response = await fetch('http://localhost:5000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    console.log('Fetch response received');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.audio) {
      console.log('Audio data received:', data.audio);
      audioDataArray.unshift(data.audio);
      if (audioDataArray.length > 5) {
        audioDataArray = audioDataArray.slice(0, 5);
      }
      chrome.storage.local.set({ audioDataArray }, () => {
        console.log('Audio data array updated in storage:', audioDataArray);
      });
      return data.audio;
    } else if (data.error) {
      console.error('Error generating music:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error generating music:', error);
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Received message: ${request.action}`);
  if (request.action === 'generateMusic') {
    generateMusic(request.url).then(audio => {
      if (audio) {
        sendResponse({ audio, audioDataArray });
        console.log('Sending audio data back to sender');
      } else {
        sendResponse({ error: 'Failed to generate music' });
        console.error('Sending error back to sender');
      }
    });
    return true;
  } else if (request.action === 'getAudioDataArray') {
    chrome.storage.local.get(['audioDataArray'], (result) => {
      sendResponse({ audioDataArray: result.audioDataArray || [] });
      console.log('Sending audioDataArray back to sender:', result.audioDataArray);
    });
    return true;
  }
});
