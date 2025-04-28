// main.js

// --- Global State Variables ---
const sum_generators_to_mono = true; // Controls whether generators are summed to mono or split to stereo
let audio_context = null;
let midi_player_node = null;
let is_audio_context_running = false;
let is_worklet_ready = false;
let is_playing = false;
let parsed_midi_data = null;
let current_file_name = "None";
let master_app_volume = 0.9; // change this to adjust overall app volume

// zmienne dla etykiet przycisków
let AUDIO_CONTEXT_ON_LABEL = "[ on ]";
let AUDIO_CONTEXT_OFF_LABEL = "[ off ]";
let PLAYBACK_PLAY_LABEL = "[ play ]";
let PLAYBACK_STOP_LABEL = "[ stop ]";

// --- Worklet Node References ---
let router_f1, router_f2;
let combination_tone_processor;
let freq_control_signal_a, freq_control_signal_b;
let oscillator_a, oscillator_b;
let primary_tones_envelope_control_signal;
let primary_tones_master_volume;
let master_volume_control_signal, master_volume;

// New nodes for stereo routing
let oscillator_a_volume_node, oscillator_b_volume_node;
let oscillator_a_envelope_control_signal, oscillator_b_envelope_control_signal;
let master_volume_node_channel_left, master_volume_node_channel_right;
let master_volume_control_signal_channel_left, master_volume_control_signal_channel_right;
let stereo_merger;

// --- Smooth Signal Processor Nodes ---
let smooth_freq_control_signal_a, smooth_freq_control_signal_b;
let smooth_oscillator_a_envelope_control_signal, smooth_oscillator_b_envelope_control_signal;
let smooth_primary_tones_envelope_control_signal;
let smooth_master_volume_control_signal;
let smooth_master_volume_control_signal_channel_left, smooth_master_volume_control_signal_channel_right;

// --- DOM Elements (filled on DOMContentLoaded) ---
let audio_context_toggle_button;
let playback_toggle_button;
let status_area_element;
let frequency_f1_output_element;
let frequency_f2_output_element;

let is_visualizer_running


// --- Utility Functions ---
function update_status() {
  const audio_status = is_audio_context_running ? "ON" : "OFF";
  status_area_element.textContent = `Audio Context: ${audio_status} | File: ${current_file_name}`;
}

async function load_default_midi_file() {
  try {
    const response = await fetch('bad_apple.mid');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    parsed_midi_data = parse_midi_file(arrayBuffer);
    current_file_name = 'bad_apple.mid';
    update_status();
  } catch (err) {
    console.error('Failed to load default MIDI:', err);
  }
}


async function initialize_audio_worklets() {
    // Tworzenie procesorów sygnałowych
    freq_control_signal_a = new AudioWorkletNode(audio_context, 'signal_processor');
    freq_control_signal_b = new AudioWorkletNode(audio_context, 'signal_processor');
 console.log("[main.js - IAW] AudioContext state:", audio_context.state);
    // Tworzenie procesorów wygładzających dla sygnałów częstotliwości
    smooth_freq_control_signal_a = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 1, target_weight: 0.02 }
    });
    smooth_freq_control_signal_b = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 1, target_weight: 0.02 }
    });

    // Podłączenie procesorów sygnałowych do wygładzających
    freq_control_signal_a.connect(smooth_freq_control_signal_a);
    freq_control_signal_b.connect(smooth_freq_control_signal_b);

    // Routers for F1/F2
    router_f1 = new value_to_audio_worklet_router({ message_type: 'number', audio_worklet_destination: freq_control_signal_a });
    router_f2 = new value_to_audio_worklet_router({ message_type: 'number', audio_worklet_destination: freq_control_signal_b });

    // Patch routers to update UI
    const original_f1_send = router_f1.send_value.bind(router_f1);
    router_f1.send_value = (value) => {
      original_f1_send(value);
      if (frequency_f1_output_element) frequency_f1_output_element.textContent = Number(value).toFixed(2);
    };
    const original_f2_send = router_f2.send_value.bind(router_f2);
    router_f2.send_value = (value) => {
      original_f2_send(value);
      if (frequency_f2_output_element) frequency_f2_output_element.textContent = Number(value).toFixed(2);
    };

    // Combination tone processor
    combination_tone_processor = new midi_pair_to_combination_tones({
      midi_channel_A: 1, // f_1-f2
      midi_channel_B: 0, // 2f_1-f_2
      destination_A: router_f1,
      destination_B: router_f2
    });

    // Oscillators
    oscillator_a = new AudioWorkletNode(audio_context, 'oscillator_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { waveform: 'sine' }
    });
    oscillator_b = new AudioWorkletNode(audio_context, 'oscillator_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { waveform: 'sine' }
    });
    
    // Podłączenie wygładzonych sygnałów częstotliwości do oscylatorów (zamiast bezpośrednio z freq_control_signal)
    smooth_freq_control_signal_a.connect(oscillator_a, 0, 0);
    smooth_freq_control_signal_b.connect(oscillator_b, 0, 0);

    // Envelope control signals for both oscillators
    oscillator_a_envelope_control_signal = new AudioWorkletNode(audio_context, 'signal_processor');
    oscillator_b_envelope_control_signal = new AudioWorkletNode(audio_context, 'signal_processor');
    
    // Smooth processors dla sygnałów obwiedni
    smooth_oscillator_a_envelope_control_signal = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.99, target_weight: 0.01 }
    });
    smooth_oscillator_b_envelope_control_signal = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.99, target_weight: 0.01 }
    });
    
    // Podłączenie sygnałów obwiedni do wygładzaczy
    oscillator_a_envelope_control_signal.connect(smooth_oscillator_a_envelope_control_signal);
    oscillator_b_envelope_control_signal.connect(smooth_oscillator_b_envelope_control_signal);
    
    // Keep the legacy envelope control for backward compatibility
    primary_tones_envelope_control_signal = new AudioWorkletNode(audio_context, 'signal_processor');
    
    // Wygładzacz dla legacy envelope
    smooth_primary_tones_envelope_control_signal = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.99, target_weight: 0.01 }
    });
    
    // Podłączenie legacy envelope do wygładzacza
    primary_tones_envelope_control_signal.connect(smooth_primary_tones_envelope_control_signal);

    // Volume control nodes for each oscillator
    oscillator_a_volume_node = new AudioWorkletNode(audio_context, 'signal_multiply', { 
      numberOfInputs: 2, 
      numberOfOutputs: 1, 
      outputChannelCount: [1] 
    });
    
    oscillator_b_volume_node = new AudioWorkletNode(audio_context, 'signal_multiply', { 
      numberOfInputs: 2, 
      numberOfOutputs: 1, 
      outputChannelCount: [1] 
    });
    
    // Connect oscillators to their volume control nodes
    oscillator_a.connect(oscillator_a_volume_node, 0, 0);
    oscillator_b.connect(oscillator_b_volume_node, 0, 0);
    
    // Connect smooth envelope controls to volume nodes (zamiast bezpośrednich sygnałów)
    smooth_oscillator_a_envelope_control_signal.connect(oscillator_a_volume_node, 0, 1);
    smooth_oscillator_b_envelope_control_signal.connect(oscillator_b_volume_node, 0, 1);
    
    // Create stereo master volume controls
    master_volume_control_signal_channel_left = new AudioWorkletNode(audio_context, 'signal_processor');
    master_volume_control_signal_channel_right = new AudioWorkletNode(audio_context, 'signal_processor');
    
    // Smooth processors dla kanałów stereo
    smooth_master_volume_control_signal_channel_left = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.95, target_weight: 0.05 }
    });
    smooth_master_volume_control_signal_channel_right = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.95, target_weight: 0.05 }
    });
    
    // Podłączenie stereo master controls do wygładzaczy
    master_volume_control_signal_channel_left.connect(smooth_master_volume_control_signal_channel_left);
    master_volume_control_signal_channel_right.connect(smooth_master_volume_control_signal_channel_right);
    
    // Keep the legacy master volume control for backward compatibility
    master_volume_control_signal = new AudioWorkletNode(audio_context, 'signal_processor');
    
    // Wygładzacz dla master volume
    smooth_master_volume_control_signal = new AudioWorkletNode(audio_context, 'smooth_signal_processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { current_weight: 0.99, target_weight: 0.005 }
    });
    
    // Podłączenie master volume control do wygładzacza
    master_volume_control_signal.connect(smooth_master_volume_control_signal);
    
    // Create stereo master volume nodes
    master_volume_node_channel_left = new AudioWorkletNode(audio_context, 'signal_multiply', { 
      numberOfInputs: 2, 
      numberOfOutputs: 1, 
      outputChannelCount: [1] 
    });
    
    master_volume_node_channel_right = new AudioWorkletNode(audio_context, 'signal_multiply', { 
      numberOfInputs: 2, 
      numberOfOutputs: 1, 
      outputChannelCount: [1] 
    });
    
    // Create a channel merger for stereo output
    stereo_merger = audio_context.createChannelMerger(2);
    
    // Connect master volume nodes to the stereo merger
    master_volume_node_channel_left.connect(stereo_merger, 0, 0);  // Left channel
    master_volume_node_channel_right.connect(stereo_merger, 0, 1); // Right channel
    
    // Connect stereo merger to audio output
    stereo_merger.connect(audio_context.destination);
    
    // Initialize control signals
    oscillator_a_envelope_control_signal.port.postMessage(0);
    oscillator_b_envelope_control_signal.port.postMessage(0);
    primary_tones_envelope_control_signal.port.postMessage(0);
    
    master_volume_control_signal.port.postMessage(master_app_volume);
    master_volume_control_signal_channel_left.port.postMessage(master_app_volume);
    master_volume_control_signal_channel_right.port.postMessage(master_app_volume);
    
    // Set up the audio routing based on sum_generators_to_mono setting
    setup_audio_routing();
}

// Function to set up proper audio routing based on the sum_generators_to_mono setting
function setup_audio_routing() {
    if (sum_generators_to_mono) {
        // Mono routing: both oscillators go to both channels
        oscillator_a_volume_node.connect(master_volume_node_channel_left, 0, 0);
        oscillator_a_volume_node.connect(master_volume_node_channel_right, 0, 0);
        oscillator_b_volume_node.connect(master_volume_node_channel_left, 0, 0);
        oscillator_b_volume_node.connect(master_volume_node_channel_right, 0, 0);
        
        // Use smooth master volume control for both channels
        smooth_master_volume_control_signal.connect(master_volume_node_channel_left, 0, 1);
        smooth_master_volume_control_signal.connect(master_volume_node_channel_right, 0, 1);
    } else {
        // Stereo routing: oscillator A to left channel, oscillator B to right channel
        oscillator_a_volume_node.connect(master_volume_node_channel_left, 0, 0);
        oscillator_b_volume_node.connect(master_volume_node_channel_right, 0, 0);
        
        // Use separate smooth volume controls for each channel
        smooth_master_volume_control_signal_channel_left.connect(master_volume_node_channel_left, 0, 1);
        smooth_master_volume_control_signal_channel_right.connect(master_volume_node_channel_right, 0, 1);
    }
}

async function initialize_audio() {
  if (!audio_context) {
    try {
      audio_context = new AudioContext();
      if (audio_context.state === 'suspended') await audio_context.resume();

      // Load worklet modules
      await audio_context.audioWorklet.addModule('midi_player_processor.js');
      await audio_context.audioWorklet.addModule('oscillator_processor.js');
      await audio_context.audioWorklet.addModule('signal_processor.js');
      await audio_context.audioWorklet.addModule('smooth_processor.js');
      await audio_context.audioWorklet.addModule('signal_multiply.js');

      // Create nodes
      await initialize_audio_worklets();
      await init_tuning_system();
      
      // MIDI player
      midi_player_node = new AudioWorkletNode(audio_context, 'midi-player-processor');
      midi_player_node.port.onmessage = (event) => {
        if (event.data.type === 'log_midi' && event.data.data?.message) {
          const midi_event = { data: new Uint8Array(event.data.data.message) };
          combination_tone_processor.receive_midi_message(midi_event);
        } else if (event.data.type === 'playback_finished') {
          is_playing = false;
          playback_toggle_button.textContent = PLAYBACK_PLAY_LABEL;
          playback_toggle_button.disabled = !parsed_midi_data || !is_audio_context_running;
          
          // Reset envelope controls for both oscillators
          oscillator_a_envelope_control_signal.port.postMessage(0);
          oscillator_b_envelope_control_signal.port.postMessage(0);
          primary_tones_envelope_control_signal.port.postMessage(0);
          
          router_f1.send_value(0);
          router_f2.send_value(0);
        }
      };

      is_worklet_ready = true;
      is_visualizer_running = true; // Włącz renderowanie wizualizatora

      return true;
    } catch (err) {
      console.error('Error initializing audio:', err);
      alert(`Error initializing audio: ${err.message}`);
      if (audio_context && audio_context.state !== 'closed') await audio_context.close();
      audio_context = null;
      is_worklet_ready = false;
      is_visualizer_running = false; // Wyłącz renderowanie wizualizatora w przypadku błędu
      return false;
    }
  }
  if (audio_context.state === 'suspended') await audio_context.resume();
  is_visualizer_running = true; // Włącz renderowanie wizualizatora jeśli audio context już istniał
  return true;
}

// --- Shutdown Audio Context ---
async function shutdown_audio() {
  // Dodanie opóźnienia 1s przed wyłączeniem audio
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (audio_context && audio_context.state !== 'closed') {
    if (midi_player_node) midi_player_node.port.postMessage({ type: 'stop' });
    await audio_context.close();
  }
  audio_context = null;
  midi_player_node = null;
  is_audio_context_running = false;
  is_worklet_ready = false;
  is_playing = false;
  is_visualizer_running = false; // Wyłącz renderowanie wizualizatora
  playback_toggle_button.textContent = PLAYBACK_PLAY_LABEL;
  playback_toggle_button.disabled = true;
  frequency_f1_output_element.textContent = '0.00';
  frequency_f2_output_element.textContent = '0.00';
  update_status();
}


// --- Setup Event Listeners on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM elements
  audio_context_toggle_button = document.getElementById('audio_context_toggle');
  playback_toggle_button = document.getElementById('playback_toggle');
  status_area_element = document.getElementById('status_area');
  frequency_f1_output_element = document.getElementById('frequency_f1_output');
  frequency_f2_output_element = document.getElementById('frequency_f2_output');

  // Ustaw początkowe etykiety przycisków
  audio_context_toggle_button.textContent = AUDIO_CONTEXT_OFF_LABEL;
  playback_toggle_button.textContent = PLAYBACK_PLAY_LABEL;

  // Load default MIDI file on startup
  load_default_midi_file();
  
  // Audio context toggle
  audio_context_toggle_button.addEventListener('click', async () => {
    audio_context_toggle_button.disabled = true;
    if (!is_audio_context_running) {
      audio_context_toggle_button.textContent = 'Initializing...';
      const ok = await initialize_audio();
      if (ok) {
        is_audio_context_running = true;
        audio_context_toggle_button.textContent = AUDIO_CONTEXT_ON_LABEL;
        if (parsed_midi_data) {
          midi_player_node.port.postMessage({ type: 'load_midi', data: parsed_midi_data });
          playback_toggle_button.disabled = false;
        }
      } else {
        audio_context_toggle_button.textContent = AUDIO_CONTEXT_OFF_LABEL;
      }
    } else {
      audio_context_toggle_button.textContent = 'Shutting down...';
      await shutdown_audio();
      audio_context_toggle_button.textContent = AUDIO_CONTEXT_OFF_LABEL;
    }
    audio_context_toggle_button.disabled = false;
    update_status();
  });

  // Playback toggle
  playback_toggle_button.addEventListener('click', () => {
    if (!is_audio_context_running || !is_worklet_ready || !parsed_midi_data) return;
    if (!is_playing) {
      // Set envelope controls for both oscillators
      oscillator_a_envelope_control_signal.port.postMessage(0.5);
      oscillator_b_envelope_control_signal.port.postMessage(0.5);
      primary_tones_envelope_control_signal.port.postMessage(1);
      
      midi_player_node.port.postMessage({ type: 'load_midi', data: parsed_midi_data });
      midi_player_node.port.postMessage({ type: 'start' });
      is_playing = true;
      playback_toggle_button.textContent = PLAYBACK_STOP_LABEL;
    } else {
      // Reset envelope controls for both oscillators
      oscillator_a_envelope_control_signal.port.postMessage(0);
      oscillator_b_envelope_control_signal.port.postMessage(0);
      primary_tones_envelope_control_signal.port.postMessage(0);
      
      midi_player_node.port.postMessage({ type: 'stop' });
      is_playing = false;
      playback_toggle_button.textContent = PLAYBACK_PLAY_LABEL;
      
      // Przy zatrzymaniu odtwarzania nie zatrzymujemy wizualizatora
      // Tylko dźwięki zostaną wyczyszczone, ale historia będzie się dalej renderować
    }
  });

  update_status();
});

// Funkcja inicjująca system strojenia
function init_tuning_system() {
    const period = 3.0 / 2.0;
    const generator = 2.0;
    const num_pitch_classes = 7;
    const kamerton = 415.0;
    const tonic_transposition = 1.0;

    const tuning = scalesmith_period_and_generator(num_pitch_classes, period, generator);
    
    // Funkcja do konwersji numeru nuty MIDI na częstotliwość zgodnie ze strojem
    const midi_pitch_to_frequency_custom = function(midi_note) {
        return get_nth_step(
            midi_note - 69,          // step - numer MIDI jako krok w skali względem tonu referencyjnego
            tuning,                  // tablica proporcji stroju
            num_pitch_classes,       // length - ilość stopni w skali w oktawie
            period,                  // equave - interwał ekwiwalencji (oktawa)
            kamerton,                // częstotliwość referencyjna (A4 = 440Hz)
            tonic_transposition      // transpozycja stroju
        );
    };

    combination_tone_processor.midi_pitch_to_frequency = midi_pitch_to_frequency_custom;

    // console.log("Init tuning:");
    // console.log(tuning);
}