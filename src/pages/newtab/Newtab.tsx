import React, { useState, useEffect } from 'react';
import logo from '@assets/img/gotf-logo.png';
import '@pages/newtab/Newtab.css';
import '@pages/newtab/Newtab.scss';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { Collapse } from "@chakra-ui/react";
import Timeline from './Timeline';

const Newtab = () => {
    const theme = useStorage(exampleThemeStorage);
    const [audioDataArray, setAudioDataArray] = useState<{ taskId: string, data: string }[]>([]);
    const [showOlderGenerations, setShowOlderGenerations] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['audioDataArray'], (result) => {
            if (result.audioDataArray) {
                setAudioDataArray(result.audioDataArray);
            }
        });

        const messageListener = (message, sender, sendResponse) => {
            if (message.action === 'audioUpdated') {
                chrome.storage.local.get(['audioDataArray'], (result) => {
                    if (result.audioDataArray) {
                        setAudioDataArray(result.audioDataArray);
                    }
                });
            }
        };

        const storageChangeListener = (changes, namespace) => {
            if (namespace === 'local' && changes.audioDataArray) {
                setAudioDataArray(changes.audioDataArray.newValue);
            }
        };

        chrome.storage.onChanged.addListener(storageChangeListener);
        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            chrome.storage.onChanged.removeListener(storageChangeListener);
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    return (
        <div className="App" style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#000000' }}>
            <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Please navigate to a YouTube URL to use the Popup.
                    Warning: Leave this newtab open during generation to receive the audio.
                </p>
                <Timeline initialAudioData={audioDataArray} />
                {audioDataArray.length > 0 && (
                    <audio controls src={`data:audio/wav;base64,${audioDataArray[0].data}`}>
                        <track kind="captions" />
                    </audio>
                )}
                <button onClick={() => setShowOlderGenerations(!showOlderGenerations)}>
                    {showOlderGenerations ? 'Hide' : 'Show'} older generations
                </button>
                <Collapse in={showOlderGenerations}>
                    {audioDataArray.slice(1).map((audioData) => (
                        <audio key={audioData.taskId} controls src={`data:audio/wav;base64,${audioData.data}`}>
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

export default withErrorBoundary(withSuspense(Newtab, <div>Loading...</div>), <div>Error Occurred</div>);
