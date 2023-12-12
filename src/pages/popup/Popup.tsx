import React, { useContext, useEffect, useState } from 'react';
import { MyContext } from './Context';
import logo from '@assets/img/logo.svg';
import '@pages/popup/Popup.css';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { attachTwindStyle } from '@src/shared/style/twind';
import { Button } from "@chakra-ui/react";
import { isSupportedURL } from './urlChecker';

const Popup = () => {
    const { state, updateState } = useContext(MyContext);
    const { currentURL, supported, loading, audioDataArray } = state;
    const theme = useStorage(exampleThemeStorage);
    const appContainer = document.getElementById('app');

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0]?.url || '';
            updateState({ currentURL: url, supported: isSupportedURL(url) });
        });
    }, []);

    const handleMusicGeneration = async () => {
        if (loading) return;
        updateState({ loading: true });

        try {
            const response = await fetch('http://localhost:5000/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentURL }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.audio) {
                // Add the new audio data to the beginning of the array and slice the last one if length exceeds 5
                const newAudioDataArray = [data.audio, ...audioDataArray.slice(0, 4)];
                // Save the updated array of audio data
                chrome.storage.local.set({ audioDataArray: newAudioDataArray }, () => {
                    console.log('Audio data saved to local storage.');
                    updateState({ audioDataArray: newAudioDataArray, loading: false });
                });
            } else if (data.error) {
                console.error('Error generating music:', data.error);
                updateState({ loading: false });
            }
        } catch (error) {
            console.error('Error generating music:', error);
            updateState({ loading: false });
        }
    };

    useEffect(() => {
        if (appContainer) {
            attachTwindStyle(appContainer, document);
        }
    }, []);

    return (
        <div className="App" style={{ backgroundColor: theme === 'light' ? '#fff' : '#000' }}>
            <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
                <img src={logo} className="App-logo" alt="logo" />
                {supported ? (
                    <Button colorScheme="teal" onClick={handleMusicGeneration} isLoading={loading} isDisabled={loading}>
                        Generate Music
                    </Button>
                ) : (
                    <p>Please navigate to a YouTube or SoundCloud page to use this extension.</p>
                )}
                {/* Display only the most recent generation */}
                {audioDataArray && audioDataArray.length > 0 && (
                    <audio controls src={`data:audio/wav;base64,${audioDataArray[0]}`}>
                        <track kind="captions" />
                    </audio>
                )}
                <Button colorScheme="teal" onClick={exampleThemeStorage.toggle}>
                    Toggle theme
                </Button>
            </header>
        </div>
    );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occur</div>);
