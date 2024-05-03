import 'webextension-polyfill';
import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';
import { openDB } from 'idb';

reloadOnUpdate('pages/background');
console.log('background loaded');

// Open a database
const dbPromise = openDB('audioDB', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        const store = db.createObjectStore('audioData', { keyPath: 'taskId' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('cropped', 'cropped');
      }
    },
  });

async function generateMusic(url, currentTime, model, promptLength, duration) {
    console.log(`Generating music for URL: ${url} with settings: Model - ${model}, Prompt Length - ${promptLength}, Duration - ${duration}`);
    try {
        const response = await fetch(' https://b6f9-72-211-181-187.ngrok-free.app/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' // Include this header to bypass the ngrok warning
            },
            body: JSON.stringify({ url, currentTime, model, promptLength, duration }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.task_id) {
            console.log('Task enqueued with ID:', data.task_id);
            chrome.runtime.sendMessage({ action: 'generationStarted', taskId: data.task_id });
            pollForTaskCompletion(data.task_id);
        }
    } catch (error) {
        console.error('Error generating music:', error);
        chrome.runtime.sendMessage({ action: 'generationFailed' });
    }
}

async function pollForTaskCompletion(taskId) {
    const intervalId = setInterval(async () => {
        try {
            const statusResponse = await fetch(` https://b6f9-72-211-181-187.ngrok-free.app/tasks/${taskId}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true' // Include this header to bypass the ngrok warning
                }
            });
            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
                clearInterval(intervalId);
                console.log('Audio generation completed:', statusData.audio);

                const db = await dbPromise;
                await db.put('audioData', { taskId: taskId, data: statusData.audio, timestamp: Date.now() });

                const allAudioData = await db.getAll('audioData');
                chrome.runtime.sendMessage({ 
                    action: 'generationCompleted', 
                    taskId: taskId, 
                    data: statusData.audio // Include the audio data here
                });
                chrome.runtime.sendMessage({ action: 'audioUpdated', audioDataArray: allAudioData });

                cleanUpOldData();
            }
        } catch (error) {
            console.error('Error fetching task status:', error);
            clearInterval(intervalId);
        }
    }, 2000);
}

async function cleanUpOldData() {
    const db = await dbPromise;
    const allAudioData = await db.getAllFromIndex('audioData', 'timestamp');
    const oldDataThreshold = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds

    for (const audio of allAudioData) {
        if (audio.timestamp < oldDataThreshold) {
            await db.delete('audioData', audio.taskId);
        }
    }
    console.log('Old audio data cleaned up.');
}

// Function to save cropped audio data
async function saveCroppedAudio(taskId, croppedAudioData) {
    const db = await dbPromise;
    const audioData = await db.get('audioData', taskId);
    if (audioData) {
      audioData.cropped = croppedAudioData;
      await db.put('audioData', audioData);
    }
  }
  
  // Function to revert to original audio data
  async function revertToOriginalAudio(taskId) {
    const db = await dbPromise;
    const audioData = await db.get('audioData', taskId);
    return audioData ? audioData.data : null;
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateMusic") {
        generateMusic(request.url, request.currentTime, request.model, request.promptLength, request.duration)
            .then(() => sendResponse({ status: 'Music generation initiated' }))
            .catch(error => sendResponse({ status: 'Music generation failed', error: error.message }));
    } else if (request.action === "getAudioDataArray") {
        dbPromise.then(db => db.getAll('audioData'))
            .then(allAudioData => sendResponse({ audioDataArray: allAudioData }))
            .catch(error => sendResponse({ status: 'Failed to fetch audio data', error: error.message }));
    } else if (request.action === 'removeAudioData') {
        dbPromise.then(db => db.delete('audioData', request.taskId))
            .then(() => sendResponse({ status: 'Audio data removed', taskId: request.taskId }))
            .catch(error => sendResponse({ status: 'Failed to remove audio data', error: error.message }));
    } else if (request.action === 'keepAlive') {
        sendResponse({ status: 'keepAlive acknowledged' });
    } else if (request.action === 'saveCroppedAudio') {
        saveCroppedAudio(request.taskId, request.croppedAudioData)
            .then(() => sendResponse({ status: 'Cropped audio saved', taskId: request.taskId }))
            .catch(error => sendResponse({ status: 'Error saving cropped audio', error: error.message }));
    } else if (request.action === 'revertToOriginalAudio') {
        revertToOriginalAudio(request.taskId)
            .then(originalAudioData => sendResponse({ status: 'success', originalAudioData: originalAudioData }))
            .catch(error => sendResponse({ status: 'Error reverting to original audio', error: error.message }));
    }

    return true; // Indicates that you will respond asynchronously.
});

