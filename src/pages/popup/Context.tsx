import React, { createContext, useState, useEffect } from 'react';
import { isSupportedURL } from './urlChecker';

export const MyContext = createContext({
  state: {
    currentURL: '',
    supported: false,
    loading: false,
    audioDataArray: [], // Changed to an array to hold past generations
    taskId: null,
  },
  updateState: (newState) => {},
});

export const MyProvider = ({ children }) => {
  const [state, setState] = useState({
    currentURL: '',
    supported: false,
    loading: false,
    audioDataArray: [], // Initialize as an empty array
    taskId: null,
  });

  const updateState = (newState) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  useEffect(() => {
    // Update the supported flag based on the URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      updateState({ currentURL: url, supported: isSupportedURL(url) });
    });

    // Load the audioDataArray from chrome.storage.local when component mounts
    chrome.storage.local.get(['audioDataArray'], function(result) {
      if (result.audioDataArray) {
        updateState({ audioDataArray: result.audioDataArray });
      }
    });
  }, []);

  // Save the audioDataArray to chrome.storage.local whenever it updates
  useEffect(() => {
    chrome.storage.local.set({ audioDataArray: state.audioDataArray });
  }, [state.audioDataArray]);

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
