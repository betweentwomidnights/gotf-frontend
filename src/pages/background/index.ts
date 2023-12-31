import 'webextension-polyfill';
import reloadOnUpdate from 'virtual:reload-on-update-in-background-script';

reloadOnUpdate('pages/background');
console.log('background loaded');

let audioDataArray = [];

async function generateMusic(url, currentTime, model, promptLength, duration) {
    console.log(`Generating music for URL: ${url} with settings: Model - ${model}, Prompt Length - ${promptLength}, Duration - ${duration}`);

    // Set loading state in local storage
    chrome.storage.local.set({ loading: true });
    try {
        const response = await fetch('http://localhost:8000/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, currentTime, model, promptLength, duration }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.task_id) {
            console.log('Task enqueued with ID:', data.task_id);
            pollForTaskCompletion(data.task_id);
        }
    } catch (error) {
        console.error('Error generating music:', error);
        chrome.storage.local.set({ loading: false }); // Reset loading state on error
        chrome.runtime.sendMessage({ action: 'generationFailed' });
    }
}

function pollForTaskCompletion(taskId) {
    const intervalId = setInterval(async () => {
        const statusResponse = await fetch(`http://localhost:8000/tasks/${taskId}`);
        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
            clearInterval(intervalId);
            console.log('Audio generation completed:', statusData.audio);

            // Update audioDataArray and reset loading state
            audioDataArray = [{ taskId: taskId, data: statusData.audio }, ...audioDataArray.slice(0, 9)];
            chrome.storage.local.set({ audioDataArray, loading: false });
            chrome.runtime.sendMessage({ action: 'audioUpdated' });
        }
    }, 2000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateMusic") {
        generateMusic(request.url, request.currentTime, request.model, request.promptLength, request.duration)
            .then(() => {
                // Send the response after the asynchronous operation has completed
                sendResponse({ status: 'Music generation initiated' });
            })
            .catch(error => {
                // Handle any errors that occur during the operation
                console.error('Error during music generation:', error);
                sendResponse({ status: 'Music generation failed', error: error.message });
            });

        // Return true to indicate that you wish to send a response asynchronously
        return true;
    } else if (request.action === "getAudioDataArray") {
        sendResponse({ audioDataArray });
        return false; // Response sent synchronously, no need to return true
    }
});
