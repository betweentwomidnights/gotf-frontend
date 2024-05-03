import React, { createContext, useState, useEffect } from 'react';
import { isSupportedURL } from './urlChecker';

export const MyContext = createContext({
  state: {
    currentURL: '',
    supported: false,
    loading: false,
    audioDataArray: [],
    taskId: null,
    errorMessage: ''
  },
  updateState: (newState) => {},
});

export const MyProvider = ({ children }) => {
  const [state, setState] = useState({
    currentURL: '',
    supported: false,
    loading: false,
    audioDataArray: [],
    taskId: null,
    errorMessage: ''
  });

  const updateState = (newState) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      updateState({ currentURL: url, supported: isSupportedURL(url) });
    });

    const fetchAudioData = async () => {
        chrome.runtime.sendMessage({ action: 'getAudioDataArray' }, (response) => {
            if (response && response.audioDataArray) {
                updateState({ audioDataArray: response.audioDataArray });
            }
        });
    };

    fetchAudioData();

    const messageListener = (message, sender, sendResponse) => {
      if (message.action === 'audioUpdated') {
        updateState({ audioDataArray: message.audioDataArray, loading: false });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    fetchAudioData(); // Fetch initial audio data on component mount



    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Provide state and updateState through context
  const contextValue = {
    state,
    updateState
  };

  return (
    <MyContext.Provider value={contextValue}>
      {children}
    </MyContext.Provider>
  );
};

export default MyProvider;
