import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  FormControl,
  FormLabel,
  Select,
  Input,
  Button
} from "@chakra-ui/react";

const SettingsModal = ({ isOpen, onClose, theme, model, setModel, promptLength, setPromptLength, duration, setDuration }) => {

    const modalStyles = {
        backgroundColor: theme === 'light' ? '#fff' : '#000',
        color: theme === 'light' ? '#000' : '#fff',
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Call the setters passed as props
        setModel(model);
        setPromptLength(promptLength);
        setDuration(duration);
        onClose(); // Close modal after saving
    };

    // Mapping of simplified model names to their full paths
    const modelMapping = {
        'vanya_aidnb_0.1': 'audiocraft/models/vanya_aidnb_0.1',
        'budots_remix': 'audiocraft/models/budots_remix',
        'hoenn_lofi': 'audiocraft/models/hoenn_lofi',
        'facebook/musicgen-small': 'facebook/musicgen-small',
        'facebook/musicgen-medium': 'facebook/musicgen-medium',
        'facebook/musicgen-large': 'facebook/musicgen-large'
    };

    const handleModelChange = (e) => {
        const selectedModel = e.target.value;
        setModel(modelMapping[selectedModel]); // Set the full path of the model
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent style={modalStyles}>
            <ModalHeader>select the model, prompt length, and duration</ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit}>
              <FormControl>
                            <FormLabel>Model</FormLabel>
                            <Select value={model} onChange={handleModelChange}>
                                {Object.keys(modelMapping).map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </Select>
                        </FormControl>

                <FormControl mt={4}>
                  <FormLabel>Prompt Length (seconds)</FormLabel>
                  <Input type="number" value={promptLength} onChange={(e) => setPromptLength(e.target.value)} />
                </FormControl>

                <FormControl mt={4}>
                  <FormLabel>Duration Range (seconds)</FormLabel>
                  <Input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="16-18" />
                </FormControl>

                <Button mt={4} type="submit" colorScheme="blue">Save Settings</Button>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      );
};

export default SettingsModal;
