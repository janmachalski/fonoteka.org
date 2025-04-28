// midi_utilities.js

/**
 * Base class for MIDI processing nodes.
 * Defines the basic interface for connecting nodes and processing MIDI messages.
 */
class midi_processor {
    constructor() {
        this._output_processor = null;
    }

    connect(next_processor) {
        if (next_processor && typeof next_processor.receive_midi_message === 'function') {
            this._output_processor = next_processor;
        } else if (next_processor && typeof next_processor.send_value === 'function') {
            // Allow connecting to nodes expecting send_value (like routers) for convenience,
            // though the primary flow is receive_midi_message -> send_midi_message.
            // This might need refinement based on specific chain requirements.
            console.warn(`${this.constructor.name}: Connecting to a node expecting 'send_value'. Standard connection uses 'receive_midi_message'.`);
            this._output_processor = next_processor; // Allow connection but be aware of method mismatch potential
        } else {
            console.error(`${this.constructor.name}: Cannot connect. Invalid next processor provided.`);
        }
        return next_processor;
    }

    disconnect() {
        this._output_processor = null;
    }

    /**
     * Receives a MIDI message event.
     * @param {object} midi_event - An object containing MIDI data, e.g., { data: Uint8Array }.
     */
    receive_midi_message(midi_event) {
        if (midi_event && midi_event.data) {
            this.send_midi_message(midi_event.data);
        }
    }

    /**
     * Sends MIDI data (as a Uint8Array) to the connected output processor.
     * @param {Uint8Array} midi_data - The MIDI message data bytes.
     */
    send_midi_message(midi_data) {
        if (this._output_processor && typeof this._output_processor.receive_midi_message === 'function') {
            this._output_processor.receive_midi_message({ data: midi_data });
        } else if (this._output_processor) {
             console.warn(`${this.constructor.name}: Output processor connected but lacks 'receive_midi_message' method.`);
        }
    }
}


/**
 * @class midi_pair_to_combination_tones
 * @extends midi_processor
 * @description Processes MIDI Note On messages from two specified channels (A and B)
 * to calculate two primary frequencies (f1, f2) designed to produce
 * combination tones matching the original MIDI note pitches.
 * Sends f1 to destination_A and f2 to destination_B.
 */
class midi_pair_to_combination_tones extends midi_processor {
    constructor(options = {}) {
        super();
        this.midi_channel_A = options.midi_channel_A !== undefined ? options.midi_channel_A : 0;
        this.midi_channel_B = options.midi_channel_B !== undefined ? options.midi_channel_B : 1;
        this.destination_A = options.destination_A || null;
        this.destination_B = options.destination_B || null;
        this.frequency_f1 = 0.0;
        this.frequency_f2 = 0.0;
        this.last_midi_pitch_A = -1;
        this.last_midi_pitch_A_frequency = -1;
        this.last_midi_pitch_B = -1;
        this.last_midi_pitch_B_frequency = -1;
        console.log(`${this.constructor.name}: Initialized. Listening on channels A=${this.midi_channel_A}, B=${this.midi_channel_B}`);
    }

    midi_pitch_to_frequency(midi_pitch) {
        return 440 * Math.pow(2, (midi_pitch - 69) / 12);
    }

    receive_midi_message(midi_event) {
        if (!midi_event || !midi_event.data || midi_event.data.length < 3) return;
        const data = midi_event.data;
        const status_byte = data[0];
        const command = status_byte & 0xF0;
        const channel = status_byte & 0x0F;
        const note_number = data[1];
        const velocity = data[2];

        //console.log(`${this.constructor.name}: Received MIDI - Ch: ${channel}, Cmd: ${command.toString(16)}, Note: ${note_number}, Vel: ${velocity}`);

        let pitch_changed = false;
        if (command === 0x90 && velocity > 0) {
            if (channel === this.midi_channel_A) {
                if (this.last_midi_pitch_A !== note_number) {
                    //console.log(`${this.constructor.name}: Updated pitch A to ${note_number}`);
                    this.last_midi_pitch_A = note_number;
                    pitch_changed = true;
                }
            } else if (channel === this.midi_channel_B) {
                if (this.last_midi_pitch_B !== note_number) {
                    //console.log(`${this.constructor.name}: Updated pitch B to ${note_number}`);
                    this.last_midi_pitch_B = note_number;
                    pitch_changed = true;
                }
            }
        }

        if (pitch_changed && this.last_midi_pitch_A >= 0 && this.last_midi_pitch_B >= 0) {
            this.calculate_and_send_frequencies();
        }
    }

    calculate_and_send_frequencies() {
        if (this.last_midi_pitch_A < 0 || this.last_midi_pitch_B < 0) return;
        this.last_midi_pitch_A_frequency = this.midi_pitch_to_frequency(this.last_midi_pitch_A);
        this.last_midi_pitch_B_frequency = this.midi_pitch_to_frequency(this.last_midi_pitch_B);
        this.frequency_f1 = this.last_midi_pitch_A_frequency + this.last_midi_pitch_B_frequency;
        this.frequency_f2 = 2 * this.last_midi_pitch_A_frequency + this.last_midi_pitch_B_frequency;
        //console.log(`${this.constructor.name}: Calculated - Freq A (MIDI ${this.last_midi_pitch_A}): ${freq_A.toFixed(2)} Hz, Freq B (MIDI ${this.last_midi_pitch_B}): ${freq_B.toFixed(2)} Hz`);

        //this.send_combination_tone_frequencies(this.freq_A, this.freq_B);
        // ZMIANA test
        this.send_combination_tone_frequencies(this.frequency_f1, this.frequency_f2);
    }

    send_combination_tone_frequencies(f1, f2) {
        //console.log(`${this.constructor.name}: Sending Frequencies - F1: ${f1.toFixed(2)} Hz (to Dest A), F2: ${f2.toFixed(2)} Hz (to Dest B)`);
        if (this.destination_A && typeof this.destination_A.send_value === 'function') {
            this.destination_A.send_value(f1);
        } else if (this.destination_A) {
             console.warn(`${this.constructor.name}: Destination A is set but lacks a send_value method.`);
        }
        if (this.destination_B && typeof this.destination_B.send_value === 'function') {
            this.destination_B.send_value(f2);
        } else if (this.destination_B) {
            console.warn(`${this.constructor.name}: Destination B is set but lacks a send_value method.`);
        }
    }

    set_destination_A(router) {
         if (router === null || (typeof router === 'object' && typeof router.send_value === 'function')) {
             this.destination_A = router;
             console.log(`${this.constructor.name}: Destination A updated.`);
         } else {
             console.error(`${this.constructor.name}: Invalid object provided for Destination A. Must have a 'send_value' method or be null.`);
         }
    }

    set_destination_B(router) {
        if (router === null || (typeof router === 'object' && typeof router.send_value === 'function')) {
            this.destination_B = router;
            console.log(`${this.constructor.name}: Destination B updated.`);
        } else {
            console.error(`${this.constructor.name}: Invalid object provided for Destination B. Must have a 'send_value' method or be null.`);
        }
    }

    set_midi_channels(channel_a, channel_b) {
         if (channel_a >= 0 && channel_a <= 15 && channel_b >= 0 && channel_b <= 15) {
             this.midi_channel_A = channel_a;
             this.midi_channel_B = channel_b;
             this.last_midi_pitch_A = -1;
             this.last_midi_pitch_B = -1;
             this.frequency_f1 = 0.0;
             this.frequency_f2 = 0.0;
             console.log(`${this.constructor.name}: Updated MIDI channels to A=${this.midi_channel_A}, B=${this.midi_channel_B}. State reset.`);
             if (this.destination_A && typeof this.destination_A.send_value === 'function') this.destination_A.send_value(0.0);
             if (this.destination_B && typeof this.destination_B.send_value === 'function') this.destination_B.send_value(0.0);
         } else {
             console.error(`${this.constructor.name}: Invalid MIDI channel number provided.`);
         }
     }
}


/**
 * @class value_to_audio_worklet_router
 * @extends midi_processor
 * @description Routes single values (e.g., frequency) to a specified AudioWorkletNode's port,
 * formatting the message as configured. Inherits from midi_processor but primarily uses
 * the `send_value` method as its input interface.
 */
class value_to_audio_worklet_router extends midi_processor {
    /**
     * @param {Object} options - Configuration options
     * @param {AudioWorkletNode | object} [options.audio_worklet_destination] - The target AudioWorkletNode or an object with a `.port.postMessage` structure.
     * @param {string} [options.message_type='number'] - The format for the message ('number', 'json', 'string').
     */
    constructor(options = {}) {
        super(); // Inherits connection methods, but input is mainly via send_value
        this.audio_worklet_destination = options.audio_worklet_destination || null;
        this.message_type = options.message_type || 'number';
        this.last_value = null;
         console.log(`${this.constructor.name}: Initialized.`);
    }

    /**
     * Receives a value and sends it to the configured AudioWorklet destination.
     * This is the primary input method for this class.
     * @param {*} value - The value to send (typically a number for frequency).
     */
    send_value(value) {
        if (!this.audio_worklet_destination || !this.audio_worklet_destination.port || typeof this.audio_worklet_destination.port.postMessage !== 'function') {
            console.warn("value_to_audio_worklet_router: Target audio worklet destination or its port/postMessage is not correctly set.");
            return;
        }

        let message;
        switch (this.message_type) {
            case 'number': message = Number(value); break;
            case 'string': message = String(value); break;
            case 'json':   message = { value: value }; break;
            default:
                console.warn(`value_to_audio_worklet_router: Unsupported message type: ${this.message_type}`);
                return;
        }

        if (this.last_value !== value) { // Optional: Send only if value changed
            this.last_value = value;
            //console.log(`${this.constructor.name}: Sending value ${value} (type: ${this.message_type}) to destination.`);
            this.audio_worklet_destination.port.postMessage(message);
        }
    }

    /**
     * Sets the target AudioWorkletNode or compatible object.
     * @param {AudioWorkletNode | object} worklet_node - The target node/object.
     */
    set_audio_worklet_destination(worklet_node) {
        if (worklet_node === null || (typeof worklet_node === 'object' && worklet_node.port && typeof worklet_node.port.postMessage === 'function')) {
            this.audio_worklet_destination = worklet_node;
            console.log(`${this.constructor.name}: Audio worklet destination updated.`);
        } else {
             console.error(`${this.constructor.name}: Invalid audio worklet destination provided. Must have a .port.postMessage structure or be null.`);
        }
    }

    set_message_type(type) {
        this.message_type = type;
    }

     // Override receive_midi_message to warn if used, as this class primarily uses send_value for input.
     receive_midi_message(midi_event) {
         console.warn(`${this.constructor.name}: Received MIDI message via receive_midi_message. This class typically expects input via send_value(value). Ignoring MIDI message.`);
         // Do not call super or send_midi_message to break the chain here for MIDI messages.
     }
}


// --- MIDI Parsing Utilities ---

/** Reads Variable Length Quantity from DataView */
function read_variable_length_quantity(data_view, offset_ref) {
    let value = 0;
    let byte_value;
    let bytes_read = 0;
    const max_bytes = 4; // Protect against malformed data / infinite loops

    do {
        if (offset_ref.offset >= data_view.byteLength) {
             throw new Error("Reached end of data view while reading variable length quantity.");
        }
        if (bytes_read >= max_bytes) {
             throw new Error("Variable length quantity exceeds maximum size (4 bytes).");
        }
        byte_value = data_view.getUint8(offset_ref.offset++);
        value = (value << 7) | (byte_value & 0x7F);
        bytes_read++;
    } while (byte_value & 0x80);
    return value;
}

/** Parses ArrayBuffer containing MIDI data into timed events */
function parse_midi_file(array_buffer) {
    const data_view = new DataView(array_buffer);
    let offset = 0;
    const events = [];
    let ticks_per_quarter_note = 120;
    let microseconds_per_quarter_note = 500000; // Default 120 BPM

    try {
        // Read Header
        if (offset + 8 > data_view.byteLength || data_view.getUint32(offset) !== 0x4D546864) throw new Error("Missing MThd header.");
        offset += 4;
        const header_length = data_view.getUint32(offset); offset += 4;
        if (offset + header_length > data_view.byteLength || header_length < 6) throw new Error("Invalid MIDI header length.");
        const format = data_view.getUint16(offset); offset += 2;
        const number_of_tracks = data_view.getUint16(offset); offset += 2;
        const division = data_view.getUint16(offset); offset += 2;
        if (division & 0x8000) {
            const frames_per_second = -((division >> 8) & 0x7F); // Negative SMPTE format
            const ticks_per_frame = division & 0xFF;
             console.warn(`SMPTE time division detected (${frames_per_second} FPS, ${ticks_per_frame} Ticks/Frame). Timing calculations may be approximate.`);
             // Estimate ticks_per_quarter_note based on a standard tempo assumption if needed,
             // but accurate SMPTE requires tracking time in seconds directly.
             // For simplicity, we'll proceed assuming microseconds_per_quarter_note dominates.
             ticks_per_quarter_note = ticks_per_frame * frames_per_second; // This is a rough relation, not always direct
        } else {
            ticks_per_quarter_note = division;
        }
        console.log(`MIDI Info: Format ${format}, Tracks ${number_of_tracks}, Division ${division} (Ticks/QN: ${ticks_per_quarter_note})`);
        offset += header_length - 6; // Skip extra header data

        // Read Tracks
        for (let track_index = 0; track_index < number_of_tracks; track_index++) {
            if (offset + 8 > data_view.byteLength || data_view.getUint32(offset) !== 0x4D54726B) throw new Error(`Track ${track_index + 1}: Missing MTrk header.`);
            offset += 4;
            const track_length = data_view.getUint32(offset); offset += 4;
            const end_of_track_offset = offset + track_length;
            if (end_of_track_offset > data_view.byteLength) throw new Error(`Track ${track_index + 1}: Declared length exceeds file size.`);

            let absolute_ticks = 0;
            let last_status_byte = null;
            const offset_ref = { offset: offset }; // Use ref object for VLQ function

            while (offset_ref.offset < end_of_track_offset) {
                const delta_ticks = read_variable_length_quantity(data_view, offset_ref);
                absolute_ticks += delta_ticks;

                let status_byte = data_view.getUint8(offset_ref.offset);
                let current_message_data = [];
                let data_byte_1_read = false;

                if (status_byte < 0x80) { // Running status
                    if (last_status_byte === null) throw new Error(`Running status used before a status byte at offset ${offset_ref.offset - 1}`);
                    current_message_data.push(status_byte); // This byte is the first data byte
                    status_byte = last_status_byte;         // Reuse previous status
                    offset_ref.offset++;                    // Increment offset as we consumed the data byte
                    data_byte_1_read = true;
                } else {
                    // Normal status byte
                    offset_ref.offset++;
                    if ((status_byte >= 0x80 && status_byte <= 0xEF) || status_byte === 0xF7) { // Store if it's a channel or SysEx End message
                        last_status_byte = status_byte;
                    } else {
                         last_status_byte = null; // Reset running status for Meta and other System messages (except F7)
                    }
                }

                const command = status_byte & 0xF0;

                if (status_byte === 0xFF) { // Meta Event
                    const meta_type = data_view.getUint8(offset_ref.offset++);
                    const meta_length = read_variable_length_quantity(data_view, offset_ref);
                    current_message_data.push(meta_type, meta_length); // Store type and length
                    const meta_event_data = [];
                    if (offset_ref.offset + meta_length > end_of_track_offset) throw new Error(`Meta event length exceeds track bounds at offset ${offset_ref.offset}`);
                    for (let i = 0; i < meta_length; i++) meta_event_data.push(data_view.getUint8(offset_ref.offset++));
                    current_message_data.push(...meta_event_data);
                    if (meta_type === 0x51 && meta_length === 3) { // Set Tempo
                        microseconds_per_quarter_note = (meta_event_data[0] << 16) | (meta_event_data[1] << 8) | meta_event_data[2];
                    } else if (meta_type === 0x2F) { // End of Track
                        // Add EoT event and stop processing this track
                        const seconds_per_tick_eot = (microseconds_per_quarter_note / 1000000) / ticks_per_quarter_note;
                        events.push({ time_seconds: absolute_ticks * seconds_per_tick_eot, message: [status_byte, ...current_message_data] });
                        break; // Exit track loop
                    }
                } else if (status_byte === 0xF0 || status_byte === 0xF7) { // System Exclusive (SysEx Start or Continuation/End)
                    const length = read_variable_length_quantity(data_view, offset_ref);
                    if (offset_ref.offset + length > end_of_track_offset) throw new Error(`SysEx event length exceeds track bounds at offset ${offset_ref.offset}`);
                    current_message_data.push(...Array.from({ length }, () => data_view.getUint8(offset_ref.offset++)));
                } else if (command >= 0x80 && command <= 0xE0) { // Channel Voice Messages
                    let bytes_needed = 2;
                    if (command === 0xC0 || command === 0xD0) bytes_needed = 1; // Program Change, Channel Pressure
                    const start_index = data_byte_1_read ? 1 : 0; // Start reading from byte 2 if byte 1 was running status
                    for (let i = start_index; i < bytes_needed; i++) {
                        if (offset_ref.offset >= end_of_track_offset) throw new Error(`Unexpected end of track reading data for message ${status_byte.toString(16)}`);
                        current_message_data.push(data_view.getUint8(offset_ref.offset++));
                    }
                } else {
                     console.warn(`Unsupported MIDI status byte ${status_byte.toString(16)} at offset ${offset_ref.offset -1}. Skipping.`);
                     // How many bytes to skip? Unknown without full spec. Attempting to continue might fail.
                     continue; // Try processing next event
                }

                // Calculate time and add event
                const seconds_per_tick = (microseconds_per_quarter_note / 1000000) / ticks_per_quarter_note;
                const absolute_time_seconds = absolute_ticks * seconds_per_tick;
                events.push({ time_seconds: absolute_time_seconds, message: [status_byte, ...current_message_data] });

                if (offset_ref.offset > end_of_track_offset) {
                    console.warn(`Track ${track_index + 1}: Read past specified end of track offset.`);
                    break;
                }
            } // End while loop for track events
            offset = end_of_track_offset; // Ensure parser starts next track correctly
        } // End for loop for tracks

    } catch (e) {
         console.error("MIDI Parsing Error:", e);
         throw e; // Re-throw the error to be caught by the caller
    }

    events.sort((a, b) => a.time_seconds - b.time_seconds);
    console.log(`Parsed ${events.length} MIDI events successfully.`);
    return events;
}