import React, { createContext, useState, useEffect } from 'react';
import { isSupportedURL } from './urlChecker';

export const MyContext = createContext({
  state: {
    currentURL: '',
    supported: false,
    loading: false,
    taskId: null,
  },
  updateState: (newState) => {},
});

export const MyProvider = ({ children }) => {
  const [state, setState] = useState({
    currentURL: '',
    supported: false,
    loading: false,
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
