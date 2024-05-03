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
import SocialMediaButtonGroup from './SocialMediaButtonGroup';


const Newtab = () => {
    const theme = useStorage(exampleThemeStorage);
    const [audioDataArray, setAudioDataArray] = useState<{ taskId: string, data: string }[]>([]);
    const [showOlderGenerations, setShowOlderGenerations] = useState(false);

    useEffect(() => {
    const fetchAudioData = async () => {
        chrome.runtime.sendMessage({ action: 'getAudioDataArray' }, (response) => {
            if (response && response.audioDataArray) {
                setAudioDataArray(response.audioDataArray);
            }
        });
    };

    fetchAudioData();
}, []);

    useEffect(() => {
        const messageListener = (message, sender, sendResponse) => {
          console.log('Message received:', message); // Log the entire message for inspection
          if (message.action === 'audioUpdated') {
            if (!Array.isArray(message.audioDataArray)) {
              console.error('Data received is not an array:', message.audioDataArray);
              return;
            }
            setAudioDataArray(message.audioDataArray);
          }
        };
      
        chrome.runtime.onMessage.addListener(messageListener);
        chrome.runtime.sendMessage({ action: "getAudioDataArray" }); // Fetch audio data on component mount
      
        return () => {
          chrome.runtime.onMessage.removeListener(messageListener);
        };
      }, []);

      useEffect(() => {
        const intervalId = setInterval(() => {
          chrome.runtime.sendMessage({ action: 'keepAlive' }, (response) => {
            if (chrome.runtime.lastError) {
              // Log the error if there's an issue with the keepAlive message
              console.error('Error in keepAlive:', chrome.runtime.lastError);
            }
            // Removed the console.log to prevent cluttering the console with keepAlive responses
          });
        }, 10000);
      
        return () => clearInterval(intervalId);
      }, []);

      

    return (
        <div className="App" style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#000000' }}>
            <SocialMediaButtonGroup theme={theme} />
            <header className="App-header" style={{ color: theme === 'light' ? '#000' : '#fff' }}>
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    go to a youtube url to use the popup..
                    warning: leave this newtab open during generation. 

                    
                    
                </p>
                    refresh newtab page if playback breaks. warning: youll need to re-crop your waveforms.
                <p>
                    if the audio in playback gets way louder sometimes...dont worry. it wont affect export volume.
                </p>

                
                <Timeline initialAudioData={audioDataArray} />
                
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
