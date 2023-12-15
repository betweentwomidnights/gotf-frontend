import React, { useContext, useEffect, useState } from 'react';
import { MyContext } from './Context';
import logo from '@assets/img/gotf-logo.png';
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

         // Add listener for messages from the background script
        const messageListener = (message, sender, sendResponse) => {
            if (message.action === 'audioUpdated') {
                chrome.storage.local.get(['audioDataArray'], (result) => {
                    updateState({ audioDataArray: result.audioDataArray, loading: false });
                });
            } else if (message.action === 'generationStarted') {
                updateState({ loading: true });
            } else if (message.action === 'generationCompleted') {
                updateState({ loading: false });
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        
        // Cleanup listener on unmount
        return () => {
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    const handleMusicGeneration = async () => {
        if (loading) return;
        updateState({ loading: true });

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) return;

            chrome.tabs.sendMessage(tabId, { action: "getVideoTime" }, async (videoResponse) => {
                if (videoResponse?.currentTime !== undefined) {
                    chrome.runtime.sendMessage({
                        action: 'generateMusic',
                        url: currentURL,
                        currentTime: videoResponse.currentTime
                    }, response => {
                        console.log(response.status);
                    });

                    // Poll for audio data
                    const pollForAudioData = setInterval(() => {
                        chrome.storage.local.get(['audioDataArray'], (result) => {
                            if (result.audioDataArray && result.audioDataArray.length > 0) {
                                clearInterval(pollForAudioData);
                                updateState({ audioDataArray: result.audioDataArray, loading: false });
                            }
                        });
                    }, 2000); // Poll every 2 seconds
                } else {
                    console.error('Error retrieving video time.');
                    updateState({ loading: false });
                }
            });
        });
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
