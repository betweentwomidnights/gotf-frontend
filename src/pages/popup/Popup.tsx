import React, { useContext, useEffect } from 'react';
import { MyContext } from './Context';
import logo from '@assets/img/logo.svg';
import '@pages/popup/Popup.css';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { attachTwindStyle } from '@src/shared/style/twind';
import { Button } from "@chakra-ui/react";
import { useExtensionState } from '@src/shared/hooks/useExtensionState';
import { isSupportedURL } from './urlChecker';

const Popup = () => {
    const { state: contextState, updateState: updateContextState } = useContext(MyContext);
    const { currentURL, supported } = contextState;
    const { loading, setLoading, audioDataArray } = useExtensionState();
    const theme = useStorage(exampleThemeStorage);
    const appContainer = document.getElementById('app');

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0]?.url || '';
            updateContextState({ currentURL: url, supported: isSupportedURL(url) });
        });
    }, [updateContextState]);

    const handleMusicGeneration = () => {
        if (loading) return;
        setLoading(true);

        chrome.runtime.sendMessage({ action: 'generateMusic', url: currentURL }, response => {
            if (response.audio) {
                setLoading(false);
            } else if (response.error) {
                // Handle error
                setLoading(false);
            }
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
                {supported && (
                    <>
                        <Button colorScheme="teal" onClick={handleMusicGeneration} isLoading={loading}>
                            Generate Music
                        </Button>
                        {/* Render the most recent audio data if available */}
                        {audioDataArray.length > 0 && (
                            <audio controls src={`data:audio/wav;base64,${audioDataArray[0]}`}>
                                <track kind="captions" />
                            </audio>
                        )}
                    </>
                )}
                {!supported && (
                    <p>Please navigate to a YouTube or SoundCloud page to use this extension.</p>
                )}
                <Button colorScheme="teal" onClick={exampleThemeStorage.toggle}>
                    Toggle theme
                </Button>
            </header>
        </div>
    );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occur</div>);
