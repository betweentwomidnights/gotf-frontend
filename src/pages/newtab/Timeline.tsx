import React, { useEffect, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Howl } from 'howler';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '@pages/newtab/Timeline.css';
import { Button, IconButton } from "@chakra-ui/react";
import { CloseIcon, ArrowForwardIcon, DownloadIcon } from "@chakra-ui/icons";
import useStorage from '@src/shared/hooks/useStorage';
import exampleThemeStorage from '@src/shared/storages/exampleThemeStorage';
import { attachTwindStyle } from '@src/shared/style/twind';

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
            const waveformContainerId = `waveform-${audioData.taskId}`;
            const wavesurfer = WaveSurfer.create({
                container: `#${waveformContainerId}`,
                waveColor: 'red',
                progressColor: 'maroon',
                backend: 'MediaElement'
            });
            console.log(`Creating WaveSurfer for taskId: ${audioData.taskId}`, audioData);

            const howler = new Howl({
                src: [`data:audio/wav;base64,${audioData.data}`],
                format: ['wav']
            });

            wavesurfer.load(`data:audio/wav;base64,${audioData.data}`);
            waveSurferRefs.current[index] = wavesurfer;
            howlerRefs.current[index] = howler;
        });

        return () => {
            waveSurferRefs.current.forEach(wavesurfer => wavesurfer?.destroy());
            howlerRefs.current.forEach(howler => howler?.unload());
        };
    }, [timelineAudioData]);

    // Add effect for cursor synchronization
useEffect(() => {
    if (currentPlayingIndex !== null) {
        const howler = howlerRefs.current[currentPlayingIndex];
        const wavesurfer = waveSurferRefs.current[currentPlayingIndex];

        const updateWaveSurfer = () => {
            const currentTime = howler.seek(); // Get current time from Howler
            const duration = howler.duration(); // Get total duration from Howler
            const ratio = currentTime / duration; // Calculate the ratio
            wavesurfer.seekTo(ratio); // Use seekTo for setting the progress
        };

        // This will be called periodically to update WaveSurfer's cursor
        const intervalId = setInterval(updateWaveSurfer, 100); // Update every 100ms

        // Cleanup
        return () => {
            clearInterval(intervalId); // Clear the interval on cleanup
            howler.off('play'); // Remove event listener
        };
    }
}, [currentPlayingIndex]);

    const removeAudioPiece = (taskId: string) => {
        setTimelineAudioData(timelineAudioData.filter(audio => audio.taskId !== taskId));
        const index = timelineAudioData.findIndex(audio => audio.taskId === taskId);
        if (index !== -1) {
            waveSurferRefs.current[index]?.destroy();
            howlerRefs.current[index]?.unload();
            waveSurferRefs.current.splice(index, 1);
            howlerRefs.current.splice(index, 1);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
    
        // Check if there's an ongoing playback and stop it
        if (isPlaying) {
            howlerRefs.current.forEach(howler => howler.stop());
            setIsPlaying(false);
            setCurrentPlayingIndex(null);
        }
    
        // Reorder the tracks
        const reorderedData = reorder(
            timelineAudioData,
            result.source.index,
            result.destination.index
        );
        setTimelineAudioData(reorderedData);
    };

    const reorder = (list: { taskId: string, data: string }[], startIndex: number, endIndex: number): { taskId: string, data: string }[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    // Adjusted playAll function to toggle play/pause
const playAll = () => {
    if (isPlaying) {
        howlerRefs.current[currentPlayingIndex]?.pause();
        setIsPlaying(false);
    } else {
        let currentIndex = 0;
        const playNext = () => {
            if (currentIndex < howlerRefs.current.length) {
                setCurrentPlayingIndex(currentIndex);
                const howler = howlerRefs.current[currentIndex];
                howler.play();
                howler.once('end', () => {
                    currentIndex++;
                    playNext();
                });
            } else {
                setCurrentPlayingIndex(null);
                setIsPlaying(false);
            }
        };
        setIsPlaying(true);
        playNext();
    }
};

const exportToMP3 = async () => {
    const audioData = timelineAudioData.map(audio => audio.data); // Collect base64 audio data

    try {
        const response = await fetch('http://localhost:3000/combine-audio', {
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


return (
    <DragDropContext onDragEnd={onDragEnd}>
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
                                <div id={`waveform-${audio.taskId}`} className="waveform" />
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
