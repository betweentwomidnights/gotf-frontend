import React, { useContext, useEffect, useState } from 'react';
import { MyContext } from '../popup/Context'; // Ensure the path to Context is correct
import logo from '@assets/img/logo.svg';
import '@pages/newtab/Newtab.css';
import '@pages/newtab/Newtab.scss';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { Collapse } from "@chakra-ui/react";

const Newtab = () => {
  const { state, updateState } = useContext(MyContext);
  const { audioDataArray } = state;
  const theme = useStorage(exampleThemeStorage);
  const [showOlderGenerations, setShowOlderGenerations] = useState(false);

  // Load audioDataArray from chrome.storage.local when component mounts
  useEffect(() => {
    chrome.storage.local.get(['audioDataArray'], function(result) {
      if (result.audioDataArray) {
        // Update the state with the retrieved array of audio data
        updateState({ audioDataArray: result.audioDataArray });
      }
    });
  }, [updateState]);

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
        {/* Display the most recent generation */}
        {audioDataArray && audioDataArray.length > 0 && (
          <audio controls src={`data:audio/wav;base64,${audioDataArray[0]}`}>
            <track kind="captions" />
          </audio>
        )}
        {/* Button to show/hide older generations */}
        <button onClick={() => setShowOlderGenerations(!showOlderGenerations)}>
          {showOlderGenerations ? 'Hide' : 'Show'} older generations
        </button>
        {/* Collapse component to toggle visibility of older generations */}
        <Collapse in={showOlderGenerations}>
          {audioDataArray && audioDataArray.slice(1).map((audioData, index) => (
            <audio key={index} controls src={`data:audio/wav;base64,${audioData}`}>
              <track kind="captions" />
            </audio>
          ))}
        </Collapse>
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