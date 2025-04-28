// midi_player_processor.js

class MidiPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.is_playing = false;
        this.midi_events = [];
        this.current_event_index = 0;
        this.start_time = 0; // AudioContext's currentTime when playback starts
        this.last_update_time = currentTime; // Track processor time

        this.port.onmessage = this.handle_message.bind(this);
        console.log("MidiPlayerProcessor constructed.");
    }

    handle_message(event) {
        const message_data = event.data;
        // console.log(`Worklet received message: ${message_data.type}`); // Debugging

        switch (message_data.type) {
            case 'load_midi':
                this.midi_events = message_data.data || [];
                this.current_event_index = 0;
                this.is_playing = false; // Stop playback if new file loaded
                console.log(`Worklet loaded ${this.midi_events.length} MIDI events.`);
                break;
            case 'start':
                if (this.midi_events.length > 0 && !this.is_playing) {
                    this.is_playing = true;
                    this.current_event_index = 0;
                    // Use the *current* AudioContext time as the reference point for playback
                    this.start_time = currentTime;
                    this.last_update_time = this.start_time;
                    console.log(`Worklet starting playback at time ${this.start_time.toFixed(3)}s`);
                } else if (this.is_playing) {
                     console.log("Worklet already playing.");
                } else {
                    console.warn("Worklet received start command but has no MIDI events.");
                }
                break;
            case 'stop':
                if (this.is_playing) {
                    this.is_playing = false;
                    console.log("Worklet stopping playback.");
                }
                break;
            default:
                 console.warn(`Worklet received unknown message type: ${message_data.type}`);
        }
    }

    process(inputs, outputs, parameters) {
         // Update time tracking even if not playing, to keep 'currentTime' fresh conceptually
         const now = currentTime; // Capture current audio context time
         // const delta_time = now - this.last_update_time; // Time since last process call
         this.last_update_time = now;

        // If not playing or no events, do nothing but keep the processor alive
        if (!this.is_playing || this.midi_events.length === 0 || this.current_event_index >= this.midi_events.length) {
             // Check if we just finished playing all events
             if (this.is_playing && this.current_event_index >= this.midi_events.length) {
                  this.is_playing = false; // Stop playback state
                  this.port.postMessage({ type: 'playback_finished' }); // Notify main thread
                  console.log("Worklet playback finished - all events processed.");
             }
            return true; // Keep processor alive
        }

        // Calculate elapsed time since playback started
        const elapsed_playback_time = now - this.start_time;

        // Process events scheduled up to the current elapsed time
        while (this.current_event_index < this.midi_events.length) {
            const next_event = this.midi_events[this.current_event_index];

            if (next_event.time_seconds <= elapsed_playback_time) {
                // Time to send this event's message back to the main thread for logging
                this.port.postMessage({
                    type: 'log_midi',
                    data: {
                        time: next_event.time_seconds, // Use the event's scheduled time for logging consistency
                        message: next_event.message
                    }
                });
                this.current_event_index++;
            } else {
                // Next event is in the future relative to elapsed time, stop checking for now
                break;
            }
        }

        // Check if we have processed all events in this iteration
        if (this.current_event_index >= this.midi_events.length) {
             // Handled in the initial check at the beginning of the next process() call
             // This ensures the final 'playback_finished' message is sent reliably
        }

        // Keep the processor node alive
        return true;
    }
}

try {
    registerProcessor('midi-player-processor', MidiPlayerProcessor);
    // console.log("MidiPlayerProcessor registered successfully."); // Often logs before main thread confirms
} catch (error) {
     console.error("Failed to register MidiPlayerProcessor:", error);
     // Cannot communicate failure back to main thread easily from here at registration time
}