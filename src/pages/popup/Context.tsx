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
    // Update the supported flag and load audioDataArray from chrome.storage.local
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      updateState({ currentURL: url, supported: isSupportedURL(url) });
    });

    // Listener for storage changes
    const handleStorageChange = (changes, area) => {
      if (area === 'local' && changes.audioDataArray) {
        updateState({ audioDataArray: changes.audioDataArray.newValue });
      }
    };

    chrome.storage.local.get(['audioDataArray'], function(result) {
      if (result.audioDataArray) {
        updateState({ audioDataArray: result.audioDataArray });
      }
    });

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
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
