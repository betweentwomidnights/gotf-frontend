import React, { useContext, useEffect, useState } from 'react';
import { MyContext } from '../popup/Context'; // Ensure the path to Context is correct
import logo from '@assets/img/logo.svg';
import '@pages/newtab/Newtab.css';
import '@pages/newtab/Newtab.scss';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';

const Newtab = () => {
  const { state, updateState } = useContext(MyContext);
  const { audioData } = state;
  const theme = useStorage(exampleThemeStorage);

  // Load audioData from chrome.storage.local when component mounts
  useEffect(() => {
    chrome.storage.local.get(['audioData'], function(result) {
      if (result.audioData) {
        // Update the state with the retrieved audio data
        updateState({ audioData: result.audioData });
      }
    });
  }, []);

  return (
    <div
      className="App"
      style={{
        backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
      }}>
      <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Please navigate to a YouTube URL to use the Popup. 
          Warning: Leave the Popup open during generation to receive the audio.
        </p>
        {audioData && (
          <audio controls src={`data:audio/wav;base64,${audioData}`}>
            <track kind="captions" />
          </audio>
        )}
        <button
          style={{
            backgroundColor: theme === 'light' ? '#fff' : '#000',
            color: theme === 'light' ? '#000' : '#fff',
          }}
          onClick={exampleThemeStorage.toggle}>
          Toggle theme
        </button>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Newtab, <div>Loading...</div>), <div>Error Occur</div>);
