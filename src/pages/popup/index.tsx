import React from 'react';
import { createRoot } from 'react-dom/client';
import '@pages/popup/index.css';
import Popup from '@pages/popup/Popup';
import CustomChakraProvider from '@pages/content/ui/CustomChakraProvider';
import EmotionCacheProvider from '@pages/content/ui/EmotionCacheProvider';
import refreshOnUpdate from 'virtual:reload-on-update-in-view';
import { MyProvider } from './Context'; // Adjust the import path as necessary

refreshOnUpdate('pages/popup');

function init() {
    const appContainer = document.querySelector('#app-container');
    if (!appContainer) {
        throw new Error('Cannot find #app-container');
    }

    // Create a shadow root if one does not exist
    const shadowRoot = appContainer.attachShadow({ mode: 'open' });

    const root = createRoot(shadowRoot);
    root.render(
        <MyProvider>
            <EmotionCacheProvider rootId={appContainer.id}>
                <CustomChakraProvider shadowRootId={appContainer.id}>
                    <Popup />
                </CustomChakraProvider>
            </EmotionCacheProvider>
        </MyProvider>
    );
}

init();
