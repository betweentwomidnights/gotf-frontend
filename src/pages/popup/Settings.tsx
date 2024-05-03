import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  Button,
  Tooltip,
  HStack,
  useToast,
  FormErrorMessage
} from "@chakra-ui/react";

const SettingsModal = ({ isOpen, onClose, theme, model, setModel, promptLength, setPromptLength, duration, setDuration }) => {

    const toast = useToast();
    const [isDurationValid, setIsDurationValid] = useState(true);

    const modalStyles = {
        backgroundColor: theme === 'light' ? '#fff' : '#000',
        color: theme === 'light' ? '#000' : '#fff',
        zIndex: 9999,
        padding: "1rem",
        borderRadius: "md",
        boxShadow: "lg",
        maxWidth: "400px",
    };

    const tooltipStyles = {
        bg: 'red.600', // Use Chakra's color token for red
        color: 'white',
        padding: "0.5rem",
        borderRadius: "md",
        maxWidth: "200px",
        whiteSpace: "normal"
    };

    const processDuration = (input) => {
        const singleNumber = parseInt(input, 10);
        if (!isNaN(singleNumber)) {
            let start = singleNumber;
            let end = singleNumber + 1;
    
            // Ensure start is at least 1
            start = Math.max(1, start);
    
            // Adjust end if it goes beyond the maximum limit
            if (end > 30) {
                end = 30; // Ensure end does not exceed 30
                start = Math.max(1, end - 1); // Adjust start if end is at the limit
            }
    
            return `${start}-${end}`;
        }
        return input;
    };

    const validateAndFormatDuration = (duration) => {
        // Check if duration is a single number and convert to range
        const processedDuration = processDuration(duration);
        // Validate the processed duration
        const regex = /^(\d+)-(\d+)$/;
        const match = processedDuration.match(regex);
        if (match) {
            const start = parseInt(match[1], 10);
            const end = parseInt(match[2], 10);
            return start < end && end <= 30 ? processedDuration : null;
        }
        return null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validDuration = validateAndFormatDuration(duration);
        if (validDuration) {
            setIsDurationValid(true);
            setDuration(validDuration); // Update the duration with the processed range
            chrome.storage.sync.set({ model, promptLength, duration: validDuration }, () => {
                console.log('Settings saved with duration:', validDuration);
            });
            onClose();
        } else {
            setIsDurationValid(false);
            toast({
                title: "Invalid Duration",
                description: "Please enter a valid duration range like '16-18'.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Mapping of simplified model names to their full paths
    const modelMapping = [
        
        { value: 'facebook/musicgen-small', label: 'facebook/musicgen-small' },
        { value: 'facebook/musicgen-melody', label: 'facebook/musicgen-melody' },
        { value: 'facebook/musicgen-medium', label: 'facebook/musicgen-medium' },
        { value: 'facebook/musicgen-large', label: 'facebook/musicgen-large' },
        { value: 'thepatch/vanya_ai_dnb_0.1', label: 'vanya_aidnb_0.1' },
        { value: 'thepatch/hoenn_lofi', label: 'hoenn_lofi' },
        { value: 'thepatch/budots_remix', label: 'budots_remix' },
        { value: 'thepatch/PhonkV2', label: 'PhonkV2' },
        { value: 'thepatch/bleeps-medium', label: 'bleeps-medium' },
    ];

    const handleModelChange = (e) => {
        const selectedModel = e.target.value;
        setModel(selectedModel); // Set the full path of the model
    };

    // Inside your SettingsModal component
useEffect(() => {
  chrome.storage.sync.get(['model', 'promptLength', 'duration'], (result) => {
      if (result.model) setModel(result.model);
      if (result.promptLength) setPromptLength(result.promptLength);
      if (result.duration) setDuration(result.duration);
  });
}, []);

return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent style={modalStyles}>
            <ModalHeader>Select the model, prompt length, and duration</ModalHeader>
            <ModalBody>
                <form onSubmit={handleSubmit}>
                    <FormControl>
                        <FormLabel>Model</FormLabel>
                        <select value={model} onChange={handleModelChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                            {modelMapping.map((option, index) => (
                                <option key={index} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </FormControl>

                    <FormControl mt={4}>
                        <HStack spacing={2}>
                            <Tooltip label="how long gary waits to jam" sx={tooltipStyles}>
                                <FormLabel>Prompt Length (seconds)</FormLabel>
                            </Tooltip>
                        </HStack>
                        <Input type="number" value={promptLength} onChange={(e) => setPromptLength(e.target.value)} />
                    </FormControl>

                    <FormControl mt={4} isInvalid={!isDurationValid}>
                        <HStack spacing={2}>
                            <Tooltip label="how long gary jams for" sx={tooltipStyles}>
                                <FormLabel>Duration Range (seconds)</FormLabel>
                            </Tooltip>
                        </HStack>
                        <Input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="16-18" />
                        {!isDurationValid && (
                            <FormErrorMessage>
                                use a valid duration range like '16-18' or a single number under 30 sec.
                            </FormErrorMessage>
                        )}
                    </FormControl>

                    <Button mt={4} type="submit" colorScheme="blue">Save Settings</Button>
                </form>
            </ModalBody>
        </ModalContent>
    </Modal>
);

};

export default SettingsModal;
