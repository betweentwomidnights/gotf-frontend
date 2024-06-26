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
        timelineAudioData.forEach((audioData, index) => {
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
    
                if (!howlerRefs.current[index]) {
                    const howler = new Howl({
                        src: [`data:audio/wav;base64,${audioData.data}`],
                        format: ['wav'],
                        html5: true, // ensure HTML5 Audio is used
                        onload: () => {
                            console.log(`Howler loaded for index: ${index}`);
                        },
                        onplay: () => {
                            console.log(`Howler play event triggered for index: ${index}`);
                        },
                        onend: () => {
                            console.log(`Howler end event for index: ${index}`);
                        }
                    });
                    howlerRefs.current[index] = howler;
                    howlerMap.current.set(audioData.taskId, howler);
                }
            }
        });
    }, [timelineAudioData]);
    
      

    // Add effect for cursor synchronization
    useEffect(() => {
        let intervalId;
    
        if (currentPlayingIndex !== null && isPlaying) {
            const howler = howlerRefs.current[currentPlayingIndex];
            const wavesurfer = waveSurferRefs.current[currentPlayingIndex];
    
            const updateWaveSurfer = () => {
                const currentTime = howler.seek(); // Get current time from Howler
                const duration = howler.duration(); // Get total duration from Howler
                const ratio = currentTime / duration; // Calculate the ratio
                wavesurfer.seekTo(ratio); // Synchronize Wavesurfer cursor
            };
    
            intervalId = setInterval(updateWaveSurfer, 100); // Update every 100ms
        }
    
        return () => {
            if (intervalId) {
                clearInterval(intervalId); // Clear the interval on cleanup
            }
        };
    }, [currentPlayingIndex, isPlaying]);

    const removeAudioPiece = (taskId: string) => {
    // Update the state to filter out the removed audio piece
    const updatedAudioData = timelineAudioData.filter(audio => audio.taskId !== taskId);
    setTimelineAudioData(updatedAudioData);

    // Find the index of the audio piece to remove
    const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);
    if (index !== -1) {
        // Destroy the WaveSurfer and unload the Howler instance
        waveSurferRefs.current[index]?.destroy();
        howlerRefs.current[index]?.unload();

        // Remove the references from the refs arrays
        waveSurferRefs.current.splice(index, 1);
        howlerRefs.current.splice(index, 1);
    }

    // Update indexedDB in background script (if necessary)
    chrome.runtime.sendMessage({
        action: 'removeAudioData',
        taskId: taskId
    });
};

const onDragStart = () => {
    // Pause all Howler and WaveSurfer instances
    howlerRefs.current.forEach(howler => howler?.pause());
    waveSurferRefs.current.forEach(wavesurfer => {
        if (wavesurfer) {
            wavesurfer.pause();
        }
    });
    setIsPlaying(false);
};

const onDragEnd = (result) => {
    if (!result.destination) return;
  
    // Pause currently playing audio if any
    if (currentPlayingIndex !== null) {
      howlerRefs.current[currentPlayingIndex]?.stop();
      setCurrentPlayingIndex(null);
      setIsPlaying(false);
    }
  
    const reorderedData = reorder(
      timelineAudioData,
      result.source.index,
      result.destination.index
    );
  
    setTimelineAudioData(reorderedData);
  
    // Update WaveSurfer and Howler references based on new order
    const newWaveSurferRefs = reorderedData.map(data => waveSurferMap.current.get(data.taskId));
    const newHowlerRefs = reorderedData.map(data => howlerMap.current.get(data.taskId));
  
    // Replace the old refs with the newly ordered refs
    waveSurferRefs.current = newWaveSurferRefs;
    howlerRefs.current = newHowlerRefs;
  
    // Since we stopped all sounds, there's no need to update WaveSurfer cursors immediately
  };

    const reorder = (list: { taskId: string, data: string }[], startIndex: number, endIndex: number): { taskId: string, data: string }[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    let currentPlayPosition = 0; // Track the current play position

    const playAll = () => {
        console.log(`playAll invoked, isPlaying: ${isPlaying}, currentPlayingIndex: ${currentPlayingIndex}`);
    
        if (isPlaying) {
            // If currently playing, pause the playback
            if (currentPlayingIndex !== null) {
                const howler = howlerRefs.current[currentPlayingIndex];
                howler.pause(); // Pause the Howler instance, maintaining the current position
                setIsPlaying(false);
            }
        } else {
            // If not playing, start or resume playback
            if (currentPlayingIndex !== null) {
                // Resume playing the current Howler instance
                const howler = howlerRefs.current[currentPlayingIndex];
                howler.play();
            } else {
                // Start playing from the first audio
                playNext(0);
            }
            setIsPlaying(true);
        }
    };
    
    const playNext = (currentIndex) => {
        if (currentIndex < howlerRefs.current.length) {
            stopAllHowlersExcept(currentIndex); // Stop all other sounds
    
            const howler = howlerRefs.current[currentIndex];
            if (howler) {
                setCurrentPlayingIndex(currentIndex);
                howler.play();
                howler.once('end', () => playNext(currentIndex + 1)); // Play next track after current ends
            } else {
                playNext(currentIndex + 1); // Skip to next if current Howler instance is undefined
            }
        } else {
            setIsPlaying(false);
            setCurrentPlayingIndex(null); // Reset after all tracks have been played
        }
    };
    
    const stopAllHowlersExcept = (currentIndex) => {
        howlerRefs.current.forEach((howler, idx) => {
            if (idx !== currentIndex && howler.playing()) {
                howler.stop();
            }
        });
    };
    

// Stop (or Refresh) Button Handler
const stopPlayback = () => {
    console.log(`Stop playback invoked, currentPlayingIndex: ${currentPlayingIndex}`);
    howlerRefs.current.forEach((howler, idx) => {
        howler.stop(); // Stop all Howler instances
        console.log(`Stopping playback for index: ${idx}`);
    });

    waveSurferRefs.current.forEach((wavesurfer, idx) => {
        if (wavesurfer) {
            wavesurfer.seekTo(0); // Reset the WaveSurfer cursor to the beginning
            console.log(`Resetting WaveSurfer for index: ${idx}`);
        }
    });

    setCurrentPlayingIndex(null);
    setIsPlaying(false);
};

const exportToMP3 = async () => {
    const audioData = timelineAudioData.map(audio => audio.data); // Collect base64 audio data

    try {
        const response = await fetch('https://6070-72-211-181-187.ngrok-free.app/combine-audio', {
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
            const response = await fetch('https://6070-72-211-181-187.ngrok-free.app/crop-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // Include this header to bypass the ngrok warning
                },
                body: JSON.stringify({ audioData, start: 0, end: currentTime }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const croppedAudioBase64 = await response.text();
            const croppedAudioSrc = `data:audio/wav;base64,${croppedAudioBase64}`;

            // Directly stop the Howler instance playing the audio being cropped
            if (howlerRefs.current[index].playing()) {
                howlerRefs.current[index].stop();
            }

            // Update WaveSurfer instance with cropped audio
            waveSurferRefs.current[index].load(croppedAudioSrc);

            // Update Howler instance with cropped audio for future playback
            howlerRefs.current[index] = new Howl({
                src: [croppedAudioSrc],
                format: ['wav'],
                html5: true
            });

            // Update timelineAudioData with cropped audio
            const newTimelineAudioData = [...timelineAudioData];
            newTimelineAudioData[index].data = croppedAudioBase64;
            setTimelineAudioData(newTimelineAudioData);

            // Send cropped audio data to the background script
            chrome.runtime.sendMessage({
                action: 'saveCroppedAudio',
                taskId: taskId,
                croppedAudioData: croppedAudioBase64
            });

            // Set isPlaying to false to revert the pause button back to playAll
            setIsPlaying(false);

        } catch (error) {
            console.error('Error cropping audio:', error);
        } finally {
            setIsDebouncing(false);
        }
    } else {
        console.error('WaveSurfer instance not found for taskId:', taskId);
    }
};



// Function to undo the crop operation
const undoCrop = (taskId: string) => {
    if (isDebouncing) return;
    setIsDebouncing(true);
    chrome.runtime.sendMessage({ action: 'revertToOriginalAudio', taskId: taskId }, (response) => {
        if (response.status === 'success' && response.originalAudioData) {
            const originalAudioData = response.originalAudioData;
            const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);

            if (index !== -1) {
                waveSurferRefs.current[index]?.load(`data:audio/wav;base64,${originalAudioData}`);
                const newHowler = new Howl({ src: [`data:audio/wav;base64,${originalAudioData}`], format: ['wav'] });
                howlerRefs.current[index] = newHowler;

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

const themeScrollbarClass = theme === 'light' ? 'light-theme-scrollbar' : 'dark-theme-scrollbar';

return (
    <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <Droppable droppableId="droppable" direction="horizontal">
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className={`timeline-container ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>
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
                                            crop
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