import React, { useState, useEffect, useRef, useCallback } from 'react';
import Waveform from './Waveform';
import interact from 'interactjs';

interface Track {
    id: string;
    startTime: number;
    duration: number;
}

interface TimelineProps {
    audioDataArray: string[];
}

const Timeline: React.FC<TimelineProps> = ({ audioDataArray }) => {
    const [tracks, setTracks] = useState<Track[]>([]);

    const mainTimelineRef = useRef<HTMLDivElement>(null);
    const pixelsPerSecond = 100;
    const totalSeconds = 120;
    const timelineWidth = totalSeconds * pixelsPerSecond;

    const updateTrackInTimeline = useCallback((audioSrc: string, startTime: number, duration: number) => {
        setTracks(prevTracks => {
            const existingTrackIndex = prevTracks.findIndex(track => track.id === audioSrc);
            if (existingTrackIndex !== -1) {
                // Update existing track's start time and duration
                const updatedTracks = [...prevTracks];
                updatedTracks[existingTrackIndex] = { ...prevTracks[existingTrackIndex], startTime, duration };
                return updatedTracks;
            } else {
                // Add new track
                return [...prevTracks, { id: audioSrc, startTime, duration }];
            }
        });
    }, []);

    // This effect sets up the dropzone once on component mount
    useEffect(() => {
        if (!mainTimelineRef.current) return;

        const dropzone = interact(mainTimelineRef.current)
            .dropzone({
                accept: '.waveform-container',
                overlap: 0.1,
                ondrop: function (event) {
                    const draggableElement = event.relatedTarget as HTMLElement;
                    const audioSrc = draggableElement.getAttribute('data-audio-src');
                    const duration = parseFloat(draggableElement.getAttribute('data-duration')!) || 0;
                    const rect = mainTimelineRef.current.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const startTime = x / pixelsPerSecond;

                    updateTrackInTimeline(audioSrc, startTime, duration);
                }
            });

        return () => { // Cleanup dropzone when component unmounts
            dropzone.unset();
        };
    }, [updateTrackInTimeline, pixelsPerSecond]);

    const generateTimeMarkers = (): JSX.Element[] => {
        return Array.from({ length: totalSeconds + 1 }, (_, i) => (
            <div key={i} className="time-marker" style={{ left: `${i * pixelsPerSecond}px` }}>{i}s</div>
        ));
    };

    return (
        <div className="timeline-container" style={{ width: `${timelineWidth}px` }}>
            <div className="main-timeline" ref={mainTimelineRef}>
                {generateTimeMarkers()}
                {tracks.map((track, index) => (
                    <div
                        key={index}
                        className="waveform-container"
                        data-audio-src={track.id}
                        style={{
                            position: 'absolute',
                            left: `${track.startTime * pixelsPerSecond}px`,
                            width: `${track.duration * pixelsPerSecond}px`
                        }}>
                        <Waveform audioSrc={track.id} onDurationChange={(duration) => updateTrackInTimeline(track.id, track.startTime, duration)} />
                    </div>
                ))}
                
            </div>
            <div className="audio-list-container">
                {audioDataArray.map((audioData, index) => (
                    <div key={index} className="waveform-container" data-audio-src={`data:audio/wav;base64,${audioData}`}>
                        <Waveform audioSrc={`data:audio/wav;base64,${audioData}`} onDurationChange={() => { }} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timeline;
