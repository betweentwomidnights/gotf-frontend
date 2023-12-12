import { useEffect } from 'react';
import { proxy, useSnapshot } from 'valtio';

const state = proxy({ audioDataArray: [], loading: false });

export const useExtensionState = () => {
  const extensionState = useSnapshot(state);

  useEffect(() => {
    console.log('useExtensionState mounted');

    // Request the audioDataArray from the background script
    chrome.runtime.sendMessage({ action: 'getAudioDataArray' }, (response) => {
      console.log('Received response from background:', response);
      if (response && response.audioDataArray) {
        console.log('Updating audioDataArray in the state proxy', response.audioDataArray);
        state.audioDataArray = response.audioDataArray;
      }
    });

    const handleStorageChange = (changes, areaName) => {
      console.log('Storage change detected', changes, areaName);
      if (areaName === 'local' && changes.audioDataArray) {
        console.log('Updating audioDataArray due to storage change', changes.audioDataArray.newValue);
        state.audioDataArray = changes.audioDataArray.newValue;
      }
    };

    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log('Storage change detected', changes, areaName);
      if (areaName === 'local' && changes.audioDataArray) {
        if (changes.audioDataArray.newValue.length !== state.audioDataArray.length ||
            !changes.audioDataArray.newValue.every((val, index) => val === state.audioDataArray[index])) {
          console.log('Actual change in audioDataArray detected, updating state.');
          state.audioDataArray = changes.audioDataArray.newValue;
        } else {
          console.log('No actual change in audioDataArray, ignoring storage event.');
        }
      }
    });

    // Listen for changes in local storage
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup the listener when the component unmounts
    return () => {
      console.log('useExtensionState unmounted');
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const setLoading = (newLoadingValue) => {
    console.log('setLoading called with value:', newLoadingValue);
    state.loading = newLoadingValue;
  };

  

  return { ...extensionState, setLoading };
};
