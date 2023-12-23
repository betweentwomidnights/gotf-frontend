import React, { useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import interact from 'interactjs';

interface WaveformProps {
    audioSrc: string;
    onDurationChange: (duration: number) => void;
}

const Waveform: React.FC<WaveformProps> = ({ audioSrc, onDurationChange }) => {
    const waveformRef = useRef<HTMLDivElement | null>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const waveformHeight = 80; // Set a constant for the height

    useEffect(() => {
        if (waveformRef.current) {
            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: 'red',
                progressColor: 'maroon',
                backend: 'MediaElement',
                height: waveformHeight,
            });

            wavesurfer.current.load(audioSrc);
            wavesurfer.current.on('ready', () => {
                const duration = wavesurfer.current.getDuration();
                onDurationChange(duration);

                // Set the height of the container directly without using getHeight()
                if (waveformRef.current) {
                    waveformRef.current.style.height = `${waveformHeight}px`;
                }
            });

            // Set up interact.js for dragging
            interact(waveformRef.current)
                .draggable({
                    onstart: function (event) {
                        const target = event.target as HTMLElement;
                        target.setAttribute('data-audio-src', audioSrc);
                        // Set initial data-x, data-y values if not set
                        target.setAttribute('data-x', target.getAttribute('data-x') || '0');
                        target.setAttribute('data-y', target.getAttribute('data-y') || '0');
                        console.log('Drag started', target); // Log when drag starts
                    },
                    inertia: true,
                    // Add onend to handle when dragging stops
                    onend: function (event) {
                        console.log('Drag ended', event.target); // Log when drag ends
                    },
                    
                    autoScroll: true,
                    listeners: {
                        move: event => {
                            const target = event.target as HTMLElement;
                            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                            target.style.transform = `translate(${x}px, ${y}px)`;
                            target.setAttribute('data-x', x.toString());
                            target.setAttribute('data-y', y.toString());
                        }

                    }
                });

            return () => {
                wavesurfer.current?.destroy();
                if (waveformRef.current) {
                    interact(waveformRef.current).unset();
                }
            };
        }
    }, [audioSrc, onDurationChange, waveformHeight]);

    return <div ref={waveformRef} className="waveform-container" style={{ height: `${waveformHeight}px` }} />;
};

export default Waveform;
