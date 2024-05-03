import React, { useContext, useEffect, useState } from 'react';
import { MyContext } from './Context';
import logo from '@assets/img/gotf-logo.png';
import '@pages/popup/Popup.css';
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import withSuspense from '@src/shared/hoc/withSuspense';
import withErrorBoundary from '@src/shared/hoc/withErrorBoundary';
import { attachTwindStyle } from '@src/shared/style/twind';
import { Button, IconButton, useDisclosure, Flex } from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import { isSupportedURL } from './urlChecker';
import SettingsModal from './Settings';


const Popup = () => {
    const { state, updateState } = useContext(MyContext);
    const { currentURL, supported, loading, audioDataArray } = state;
    const theme = useStorage(exampleThemeStorage);
    const { isOpen, onToggle } = useDisclosure(); // onToggle will toggle the isOpen state
    const [popupHeight, setPopupHeight] = useState('auto');

    // Additional state for settings
    const [model, setModel] = useState('facebook/musicgen-small');
    const [promptLength, setPromptLength] = useState('6');
    const [duration, setDuration] = useState('16-18');

    useEffect(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = tabs[0]?.url || '';
            const isPlaylist = new URL(url).searchParams.has('list');
            if (isPlaylist) {
                // Handle playlist URL
                // Extract video ID and construct individual video URL
                const videoID = new URL(url).searchParams.get('v');
                const individualURL = `https://www.youtube.com/watch?v=${videoID}`;
                updateState({ currentURL: individualURL, supported: isSupportedURL(individualURL) });
            } else {
                updateState({ currentURL: url, supported: isSupportedURL(url) });
            }
        });

        const fetchAudioData = () => {
            chrome.runtime.sendMessage({ action: "getAudioDataArray" });
        };

        const messageListener = (message, sender, sendResponse) => {
            if (message.action === 'audioUpdated') {
                updateState({ audioDataArray: message.audioDataArray, loading: false });
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);
        fetchAudioData(); // Fetch audio data on component mount

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
                        currentTime: videoResponse.currentTime,
                        model, // new setting
            promptLength, // new setting
            duration // new setting
                    }, response => {
                        // Check if response is defined before accessing its properties
                        if (response && response.status) {
                            console.log(response.status);
                        } else {
                            console.error('Error: Response is undefined');
                            updateState({ loading: false });
                        }
                    });
                } else {
                    // Update the state with an error message
                    updateState({ errorMessage: 'Please refresh the YouTube page to continue.' });
                  }
            });
        });
    };
    

    useEffect(() => {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            attachTwindStyle(appContainer, document);
        }
    }, []);

    useEffect(() => {
        const updatePopupHeight = () => {
            if (isOpen) {
                // Query the modal content and assert it as an HTMLElement
                const modalContent = document.querySelector('.modal-content-class') as HTMLElement | null; // Replace '.modal-content-class' with your modal's class or ID
    
                if (modalContent) {
                    // Set the height based on the modal content's offsetHeight
                    setPopupHeight(`${modalContent.offsetHeight}px`);
                }
            } else {
                // Reset height when modal is closed
                setPopupHeight('auto');
            }
        };
    
        updatePopupHeight();
    
        // Re-calculate when isOpen changes
    }, [isOpen]);

    return (
        <div className="App" style={{ backgroundColor: theme === 'light' ? '#fff' : '#000', position: 'relative', height: popupHeight, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff', padding: '1rem' }}>
                <img src={logo} className="App-logo" alt="logo" />
                {supported ? (
                    <Button colorScheme="teal" onClick={handleMusicGeneration} isLoading={loading} isDisabled={loading}>
                        Generate Music
                    </Button>
                ) : (
                    <p>Please navigate to a YouTube or SoundCloud page to use this extension.</p>
                )}
                {audioDataArray && audioDataArray.length > 0 && (
                    <audio controls src={`data:audio/wav;base64,${audioDataArray[0].data}`}>
                        <track kind="captions" />
                    </audio>
                )}
                {state.errorMessage && (
                    <div className="error-message">{state.errorMessage}</div>
                )}
            </header>
      
           {/* Bottom Buttons Container */}
      <Flex
        position="relative"
        bottom="10px"
        left="0"
        right="0"
        px="10px"
        justifyContent="space-between"
        alignItems="center"
        color={theme === 'light' ? '#000' : '#fff'} // Apply conditional background color
      >
        {/* Theme Toggle Button */}
        <Button
          onClick={exampleThemeStorage.toggle}
          colorScheme={theme === 'light' ? '#fff' : '#000'} // Use your defined color schemes for light and dark themes
          mr="auto" // Pushes this button to the left
        >
          Toggle theme
        </Button>

        {/* Settings Button */}
        <IconButton
          aria-label="Settings"
          icon={<SettingsIcon />}
          onClick={onToggle}
          variant="ghost"
          color={theme === 'light' ? 'black' : 'white'} // Apply conditional text color
          bg={theme === 'light' ? 'gray.200' : 'gray.700'} // Apply conditional background color
          ml="auto" // Pushes this button to the right
        />
      </Flex>

            {/* Chakra UI Modal for settings */}
            <SettingsModal 
            isOpen={isOpen}
            onClose={onToggle}
            theme={theme}
            model={model}
            setModel={setModel}
            promptLength={promptLength}
            setPromptLength={setPromptLength}
            duration={duration}
            setDuration={setDuration}
        />
        </div>
    );
};


export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occur</div>);
