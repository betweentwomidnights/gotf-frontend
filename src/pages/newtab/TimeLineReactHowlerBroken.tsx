import React, { useEffect, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Howl } from 'howler';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '@pages/newtab/Timeline.css';
import { Button, IconButton, Spinner } from "@chakra-ui/react";
import { CloseIcon, ArrowForwardIcon, DownloadIcon, RepeatIcon, EditIcon, ArrowBackIcon } from "@chakra-ui/icons";
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import { attachTwindStyle } from '@src/shared/style/twind';
import ReactHowler from 'react-howler';

declare module 'wavesurfer.js' {
    interface WaveSurfer {
      container?: HTMLElement | string;
      // Add other missing properties here
    }
  }


interface TimelineProps {
    initialAudioData: { taskId: string, data: string }[];
}

const Timeline: React.FC<TimelineProps> = ({ initialAudioData }) => {
    
    const [timelineAudioData, setTimelineAudioData] = useState<{ taskId: string, data: string }[]>([]);
    const waveSurferRefs = useRef<WaveSurfer[]>([]);
    const howlerRefs = useRef<Howl[]>([]);
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const theme = useStorage(exampleThemeStorage);

    // New state for tracking generation status
    const [audioGenerationStatus, setAudioGenerationStatus] = useState({});

    const waveSurferMap = useRef(new Map());
    const howlerMap = useRef(new Map());


    const [isDebouncing, setIsDebouncing] = useState(false);

    // New state to manage ReactHowler instances
    const [audioPlayers, setAudioPlayers] = useState({});

    


// New useEffect hook for debugging
useEffect(() => {
    console.log('audioGenerationStatus updated:', audioGenerationStatus);
}, [audioGenerationStatus]);

useEffect(() => {
    const messageListener = (message, sender, sendResponse) => {
        console.log("Message received:", message);
        if (message.action === 'generationStarted') {
            setAudioGenerationStatus(prev => ({ ...prev, [message.taskId]: 'generating' }));
            setTimelineAudioData(prevData => [...prevData, { taskId: message.taskId, data: '' }]);
            console.log('Generation started for:', message.taskId);
        } else if (message.action === 'generationCompleted') {
            if (message.data) {
                setAudioGenerationStatus(prev => ({ ...prev, [message.taskId]: 'completed' }));
                setTimelineAudioData(prevData => 
                    prevData.map(item => 
                        item.taskId === message.taskId ? { ...item, data: message.data } : item
                    )
                );
            } else {
                console.error('Received undefined data for taskId:', message.taskId);
                // Handle the undefined data scenario
            }
        }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
}, []);

    useEffect(() => {
        const newGenerations = initialAudioData.filter(({ taskId }) =>
            !timelineAudioData.some(audio => audio.taskId === taskId));
        if (newGenerations.length > 0) {
            console.log("New generations:", newGenerations);
            setTimelineAudioData(prevData => [...prevData, ...newGenerations]);
        }
    }, [initialAudioData]);

    useEffect(() => {
        const newAudioPlayers = { ...audioPlayers };
    
        timelineAudioData.forEach((audioData, index) => {
            // Set up WaveSurfer instances
            if (!waveSurferRefs.current[index] && audioData.data) {
                const waveformContainerId = `waveform-${audioData.taskId}`;
                const wavesurfer = WaveSurfer.create({
                    container: `#${waveformContainerId}`,
                    waveColor: 'red',
                    progressColor: 'maroon',
                    backend: 'MediaElement',
                    interact: true
                });
    
                wavesurfer.on('ready', () => {
                    console.log(`WaveSurfer ready for taskId: ${audioData.taskId}`);
                });
    
                wavesurfer.load(`data:audio/wav;base64,${audioData.data}`);
                waveSurferRefs.current[index] = wavesurfer;
                waveSurferMap.current.set(audioData.taskId, wavesurfer);
            }
    
            // Set up ReactHowler instances
            if (!newAudioPlayers[audioData.taskId]) {
                newAudioPlayers[audioData.taskId] = {
                    src: `data:audio/wav;base64,${audioData.data}`,
                    playing: false
                };
            }
        });
    
        setAudioPlayers(newAudioPlayers);
    }, [timelineAudioData]);
    
    
      

    // Add effect for cursor synchronization
    useEffect(() => {
        let intervalId;
    
        if (currentPlayingIndex !== null && isPlaying) {
            const howler = howlerRefs.current[currentPlayingIndex];
            const wavesurfer = waveSurferRefs.current[currentPlayingIndex];
    
            const updateWaveSurfer = () => {
                if (howler.playing()) {
                    const currentTime = howler.seek(); // Get current time from Howler
                    const duration = howler.duration(); // Get total duration from Howler
                    const ratio = currentTime / duration; // Calculate the ratio
                    wavesurfer.seekTo(ratio); // Synchronize Wavesurfer cursor
                }
            };
    
            intervalId = setInterval(updateWaveSurfer, 100); // Update every 100ms
        }
    
        return () => {
            if (intervalId) {
                clearInterval(intervalId); // Clear the interval on cleanup
            }
        };
    }, [currentPlayingIndex, isPlaying]);

    const removeAudioPiece = (taskId) => {
        // Update timelineAudioData to remove the selected audio piece
        const updatedAudioData = timelineAudioData.filter(audio => audio.taskId !== taskId);
        setTimelineAudioData(updatedAudioData);
    
        // Destroy the WaveSurfer instance
        const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);
        if (index !== -1) {
            waveSurferRefs.current[index]?.destroy();
            waveSurferRefs.current.splice(index, 1);
        }
    
        // Update audioPlayers state to remove the corresponding ReactHowler instance
        const newAudioPlayers = { ...audioPlayers };
        delete newAudioPlayers[taskId];
        setAudioPlayers(newAudioPlayers);
    
        // Update indexedDB in background script (if necessary)
        chrome.runtime.sendMessage({
            action: 'removeAudioData',
            taskId: taskId
        });
    };
    

    const onDragStart = () => {
        // Pause all audio players using the audioPlayers state
        const newAudioPlayers = { ...audioPlayers };
        Object.keys(newAudioPlayers).forEach(taskId => {
            newAudioPlayers[taskId].playing = false;
        });
        setAudioPlayers(newAudioPlayers);
    
        // Pause WaveSurfer instances
        waveSurferRefs.current.forEach(wavesurfer => wavesurfer?.pause());
        
        setIsPlaying(false);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
    
        const reorderedData = reorder(
            timelineAudioData,
            result.source.index,
            result.destination.index
        );
        setTimelineAudioData(reorderedData);
    
        // Reorder WaveSurfer references
        waveSurferRefs.current = reorderedData.map(data =>
            waveSurferMap.current.get(data.taskId)
        );
    
        // Reorder ReactHowler instances in the audioPlayers state
        const newAudioPlayers = {};
        reorderedData.forEach(data => {
            newAudioPlayers[data.taskId] = audioPlayers[data.taskId];
        });
        setAudioPlayers(newAudioPlayers);
    
        // Reset playing state
        setIsPlaying(false);
    };

    const reorder = (list: { taskId: string, data: string }[], startIndex: number, endIndex: number): { taskId: string, data: string }[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const playAll = () => {
        if (isPlaying) {
            // Pause all audio players
            const newAudioPlayers = { ...audioPlayers };
            Object.keys(newAudioPlayers).forEach(taskId => {
                newAudioPlayers[taskId].playing = false;
            });
            setAudioPlayers(newAudioPlayers);
    
            setIsPlaying(false);
        } else {
            let currentIndex = currentPlayingIndex !== null ? currentPlayingIndex : 0;
            const playNext = () => {
                if (currentIndex < timelineAudioData.length) {
                    // Update audioPlayers state to play the current audio
                    const newAudioPlayers = { ...audioPlayers };
                    Object.keys(newAudioPlayers).forEach((taskId, index) => {
                        newAudioPlayers[taskId].playing = index === currentIndex;
                    });
                    setAudioPlayers(newAudioPlayers);
    
                    setCurrentPlayingIndex(currentIndex);
    
                    // Set a timeout to simulate the 'end' event and play the next audio
                    const duration = howlerRefs.current[currentIndex].duration();
                    setTimeout(() => {
                        currentIndex++;
                        playNext();
                    }, duration * 1000);
                } else {
                    setCurrentPlayingIndex(null);
                    setIsPlaying(false);
                }
            };
    
            setIsPlaying(true);
            playNext();
        }
    };
    

// Stop (or Refresh) Button Handler
const stopPlayback = () => {
    if (currentPlayingIndex !== null) {
        // Pause all audio players by updating the audioPlayers state
        const newAudioPlayers = { ...audioPlayers };
        Object.keys(newAudioPlayers).forEach(taskId => {
            newAudioPlayers[taskId].playing = false;
        });
        setAudioPlayers(newAudioPlayers);

        // Reset all WaveSurfer instances
        waveSurferRefs.current.forEach(wavesurfer => {
            if (wavesurfer) {
                wavesurfer.seekTo(0);
            }
        });

        setCurrentPlayingIndex(null); // Reset the playing index
        setIsPlaying(false); // Update playing state
    }
};

const exportToMP3 = async () => {
    const audioData = timelineAudioData.map(audio => audio.data); // Collect base64 audio data

    try {
        const response = await fetch('http://34.125.129.105:3000/combine-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioClips: audioData }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const combinedAudioBase64 = await response.text();

        // Convert base64 to a Blob
        const byteCharacters = atob(combinedAudioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });

        // Create a temporary download link and trigger the download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'combined_audio.mp3'; // Name of the downloaded file
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exporting to MP3:', error);
    }
};

useEffect(() => {
    const appContainer = document.getElementById('app');
    if (appContainer) {
        attachTwindStyle(appContainer, document);
    }
}, []);


// Function to handle the crop operation
const cropAudio = async (taskId: string) => {
    if (isDebouncing) return;
    setIsDebouncing(true);

    const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);
    if (index !== -1 && waveSurferRefs.current[index]) {
        const currentTime = waveSurferRefs.current[index].getCurrentTime();
        const audioData = timelineAudioData[index].data;

        try {
            const response = await fetch('http://34.125.129.105:3000/crop-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioData, start: 0, end: currentTime }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const croppedAudioBase64 = await response.text();
            const croppedAudioSrc = `data:audio/wav;base64,${croppedAudioBase64}`;

            // Update WaveSurfer instance
            waveSurferRefs.current[index].load(croppedAudioSrc);

            // Update Howler instance
            const newHowler = new Howl({ src: [croppedAudioSrc], format: ['wav'] });
            howlerRefs.current[index] = newHowler;
            howlerMap.current.set(taskId, newHowler);

            // Update timelineAudioData
            const newTimelineAudioData = [...timelineAudioData];
            newTimelineAudioData[index].data = croppedAudioBase64;
            setTimelineAudioData(newTimelineAudioData);

            // Send cropped audio data to the background script
            chrome.runtime.sendMessage({
                action: 'saveCroppedAudio',
                taskId: taskId,
                croppedAudioData: croppedAudioBase64
            });
            
        } catch (error) {
            console.error('Error cropping audio:', error);
        } finally {
            setTimeout(() => {
                setIsDebouncing(false);
            }, 1000);
        }
    } else {
        console.error('WaveSurfer instance not found for taskId:', taskId);
    }
};


// Function to undo the crop operation
const undoCrop = (taskId) => {
    if (isDebouncing) return;
    setIsDebouncing(true);
    chrome.runtime.sendMessage({ action: 'revertToOriginalAudio', taskId: taskId }, (response) => {
        if (response.status === 'success' && response.originalAudioData) {
            const originalAudioData = response.originalAudioData;
            const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);

            if (index !== -1) {
                waveSurferRefs.current[index]?.load(`data:audio/wav;base64,${originalAudioData}`);

                // Update ReactHowler instance in the audioPlayers state
                const newAudioPlayers = { ...audioPlayers };
                newAudioPlayers[taskId] = { ...newAudioPlayers[taskId], src: `data:audio/wav;base64,${originalAudioData}` };
                setAudioPlayers(newAudioPlayers);

                const updatedTimelineAudioData = [...timelineAudioData];
                updatedTimelineAudioData[index].data = originalAudioData;
                setTimelineAudioData(updatedTimelineAudioData);
            }
        }
    });
    setTimeout(() => {
        setIsDebouncing(false);
    }, 1000); // 1 second debounce period
};



return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <Droppable droppableId="droppable" direction="horizontal">
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="timeline-container">
                    {timelineAudioData.map((audio, index) => (
                        <Draggable key={audio.taskId} draggableId={audio.taskId} index={index}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`relative mb-4 p-2 rounded-lg waveform-container shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-black'}`}
                                >
                                    {audioGenerationStatus[audio.taskId] === 'generating' ? (
                                        <Spinner size="xl" thickness="4px" speed="0.65s" color="red.500" />
                                    ) : (
                                        <>
                                            <ReactHowler
                                                src={audioPlayers[audio.taskId]?.src}
                                                playing={audioPlayers[audio.taskId]?.playing}
                                                html5={true}
                                            />
                                            <div id={`waveform-${audio.taskId}`} className="waveform">
                                                <IconButton
                                                    aria-label="Remove audio"
                                                    icon={<CloseIcon />}
                                                    onClick={() => removeAudioPiece(audio.taskId)}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    position="relative"
                                                    top="2"
                                                    right="2"
                                                />
                                                <Button
                                                    onClick={() => cropAudio(audio.taskId)}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    isDisabled={isDebouncing}
                                                >
                                                    Crop
                                                </Button>
                                                <IconButton
                                                    aria-label="Undo crop"
                                                    icon={<ArrowBackIcon />}
                                                    onClick={() => undoCrop(audio.taskId)}
                                                    size="sm"
                                                    colorScheme="white"
                                                    variant="ghost"
                                                    isDisabled={isDebouncing}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
        <div className="flex justify-center space-x-4 mt-4">
            <Button
                leftIcon={<RepeatIcon />} 
                onClick={stopPlayback}
                colorScheme="maroon"
                variant="outline"
            >
                Stop
            </Button>
            <Button
                leftIcon={isPlaying ? null : <ArrowForwardIcon />}
                onClick={playAll}
                colorScheme="red"
                variant="outline"
            >
                {isPlaying ? 'Pause' : 'Play All'}
            </Button>
            <Button
                leftIcon={<DownloadIcon />}
                onClick={exportToMP3}
                colorScheme="red"
                variant="solid"
            >
                Export to MP3
            </Button>
        </div>
    </DragDropContext>
);

};

export default Timeline;