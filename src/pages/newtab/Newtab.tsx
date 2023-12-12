import React, { useState, useEffect } from 'react';
import logo from '@assets/img/logo.svg';
import '@pages/newtab/Newtab.css';
import '@pages/newtab/Newtab.scss';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { Collapse } from "@chakra-ui/react";
import { useExtensionState } from '@src/shared/hooks/useExtensionState';

const Newtab = () => {
  const { audioDataArray } = useExtensionState();
  const theme = useStorage(exampleThemeStorage);
  const [showOlderGenerations, setShowOlderGenerations] = useState(false);

  return (
    <div className="App" style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#000000' }}>
      <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
        <img src={ logo } className="App-logo" alt="logo" />
        <p>
          Please navigate to a YouTube URL to use the Popup. 
          Warning: Leave the Popup open during generation to receive the audio.
        </p>
        {audioDataArray && audioDataArray.length > 0 && (
          <audio controls src={`data:audio/wav;base64,${audioDataArray[0]}`}>
            <track kind="captions" />
          </audio>
        )}
        <button onClick={() => setShowOlderGenerations(!showOlderGenerations)}>
          {showOlderGenerations ? 'Hide' : 'Show'} older generations
        </button>
        <Collapse in={showOlderGenerations}>
          {audioDataArray.slice(1).map((audioData, index) => (
            <audio key={index} controls src={`data:audio/wav;base64,${audioData}`}>
              <track kind="captions" />
            </audio>
          ))}
        </Collapse>
        <button
          style={{ backgroundColor: theme === 'light' ? '#fff' : '#000', color: theme === 'light' ? '#000' : '#fff' }}
          onClick={exampleThemeStorage.toggle}>
          Toggle theme
        </button>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Newtab, <div>Loading...</div>), <div>Error Occur</div>);
