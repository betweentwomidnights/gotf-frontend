import React, { useEffect, useState, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Howl } from 'howler';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '@pages/newtab/Timeline.css';

interface TimelineProps {
    initialAudioData: { id: string, data: string }[];
}

const Timeline: React.FC<TimelineProps> = ({ initialAudioData }) => {
    const [timelineAudioData, setTimelineAudioData] = useState<{ id: string, data: string }[]>([]);
    const waveSurferRefs = useRef<WaveSurfer[]>([]);
    const howlerRefs = useRef<Howl[]>([]);

    useEffect(() => {
        const newGenerations = initialAudioData.filter(({ id }) =>
            !timelineAudioData.some(audio => audio.id === id));
        if (newGenerations.length > 0) {
            setTimelineAudioData(prevData => [...prevData, ...newGenerations]);
        }
    }, [initialAudioData]);

    useEffect(() => {
        timelineAudioData.forEach((audioData, index) => {
            const waveformContainerId = `waveform-${audioData.id}`;
            const wavesurfer = WaveSurfer.create({
                container: `#${waveformContainerId}`,
                waveColor: 'red',
                progressColor: 'maroon',
                backend: 'MediaElement'
            });

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

    const removeAudioPiece = (id: string) => {
        setTimelineAudioData(timelineAudioData.filter(audio => audio.id !== id));
        const index = timelineAudioData.findIndex(audio => audio.id === id);
        if (index !== -1) {
            waveSurferRefs.current[index]?.destroy();
            howlerRefs.current[index]?.unload();
            waveSurferRefs.current.splice(index, 1);
            howlerRefs.current.splice(index, 1);
        }
    };

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        const reorderedData = reorder(
            timelineAudioData,
            result.source.index,
            result.destination.index
        );
        setTimelineAudioData(reorderedData);
    };

    const reorder = (list: { id: string, data: string }[], startIndex: number, endIndex: number): { id: string, data: string }[] => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const playAll = () => {
        let currentIndex = 0;
        const playNext = () => {
            if (currentIndex < howlerRefs.current.length) {
                const howler = howlerRefs.current[currentIndex];
                howler.play();
                howler.once('end', () => {
                    currentIndex++;
                    playNext();
                });
            }
        };
        playNext();
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="droppable" direction="horizontal">
                {(provided) => (
                    // Apply the timeline-container class to this div
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="timeline-container"
                    >
                        {timelineAudioData.map((audio, index) => (
                            <Draggable key={audio.id} draggableId={audio.id} index={index}>
                                {(provided) => (
                                    // This div is for individual draggable items
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="relative mb-4 waveform-container" // Apply waveform-container here
                                    >
                                        <div className="absolute top-0 left-0 w-full text-center text-xs bg-gray-100 py-1 z-10">
                                            {audio.id}
                                        </div>
                                        <div id={`waveform-${audio.id}`} />
                                        <button onClick={() => removeAudioPiece(audio.id)}>Remove</button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            <button onClick={playAll}>Play All</button>
        </DragDropContext>
    );

};

export default Timeline;
