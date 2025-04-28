// frequency_visualizer.js

class ToneVisualizer {
  constructor(container_element_id) {
    // DOM setup
    this.container = document.getElementById(container_element_id);
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.height = 150; // Zwiększona wysokość do 150px
    this.container.appendChild(this.canvas);
    
    // Get actual canvas dimensions after styling is applied
    this.resize_observer = new ResizeObserver(() => this.resize_canvas());
    this.resize_observer.observe(this.container);
    
    // Canvas context
    this.ctx = this.canvas.getContext('2d');
    
    // Visualization properties
    this.midi_units = 128; // MIDI note range
    this.note_colors = {
      primary: {
        border: 'rgba(175, 238, 238, 0.9)', // PaleTurquoise z większą nieprzezroczystością
        glow: 'rgba(175, 238, 238, 0.4)',   // Efekt poświaty
        text: 'rgba(255, 191, 0, 0.9)'      // Amber tekst
      },
      secondary: {
        border: 'rgba(255, 191, 0, 0.9)',   // Amber z większą nieprzezroczystością
        glow: 'rgba(255, 191, 0, 0.4)',     // Efekt poświaty
        text: 'rgba(175, 238, 238, 0.9)'    // PaleTurquoise tekst
      }
    };
    
    // Track visible notes
    this.visible_notes = {
      primary: [],
      secondary: []
    };
    
    // History for afterimage effect
    this.history = [];
    this.max_history = 5;
    
    // Margins
    this.vertical_margin = 5; // Margines górny i dolny w pikselach
    
    // Initialize
    this.resize_canvas();
    this.draw();
  }
  
  resize_canvas() {
    const rect = this.container.getBoundingClientRect();
    // Set actual pixel dimensions for crisp rendering
    this.canvas.width = rect.width;
    this.canvas.height = 150; // Zwiększona wysokość do 150px
    this.draw();
  }
  
  midi_to_canvas_x(midi_number) {
    // Convert MIDI note number to x position on canvas
    return (midi_number / this.midi_units) * this.canvas.width;
  }
  
  frequency_to_midi(frequency) {
    // Convert frequency to approximate MIDI note number (float)
    // A4 (440Hz) is MIDI note 69
    return frequency > 0 ? 69 + 12 * Math.log2(frequency / 440) : 0;
  }
  
  get_note_name(midi_number) {
    const note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const note = note_names[midi_number % 12];
    const octave = Math.floor(midi_number / 12) - 1;
    return `${note}${octave}`;
  }
  
  update_tones(combination_tone_processor, is_playing) {
  // Zapisz aktualny stan dźwięków do historii dla efektu powidoku
  this.history.unshift({...this.visible_notes});
  if (this.history.length > this.max_history) {
    this.history.pop();
  }
  
  // Wyczyść poprzednie dźwięki
  this.visible_notes = {
    primary: [],
    secondary: []
  };
  
  // Aktualizuj dźwięki tylko gdy odtwarzanie jest aktywne
  if (is_playing && combination_tone_processor) {
    // Aktualizacja primary tones (MIDI pitches)
    if (combination_tone_processor.frequency_f1 > 0) {
      this.visible_notes.primary.push({
        frequency: combination_tone_processor.frequency_f1,
        midi_value: this.frequency_to_midi(combination_tone_processor.frequency_f1)
      });
    }
    
    if (combination_tone_processor.frequency_f2 > 0) {
      this.visible_notes.primary.push({
        frequency: combination_tone_processor.frequency_f2,
        midi_value: this.frequency_to_midi(combination_tone_processor.frequency_f2)
      });
    }
    
    // Aktualizacja secondary tones (combination tones)
    if (combination_tone_processor.last_midi_pitch_A_frequency > 0) {
      this.visible_notes.secondary.push({
        frequency: combination_tone_processor.last_midi_pitch_A_frequency,
        midi_value: this.frequency_to_midi(combination_tone_processor.last_midi_pitch_A_frequency)
      });
    }
    
    if (combination_tone_processor.last_midi_pitch_B_frequency > 0) {
      this.visible_notes.secondary.push({
        frequency: combination_tone_processor.last_midi_pitch_B_frequency,
        midi_value: this.frequency_to_midi(combination_tone_processor.last_midi_pitch_B_frequency)
      });
    }
  }
  
  // Zawsze rysuj aktualny stan (nawet gdy jest pusty)
  // To pozwoli na stopniowe wygaszanie wizualizacji przez historię
  this.draw();
}
  
  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas with slight fade effect for glow trail
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'; // Bardziej półprzezroczysty dla lepszego efektu powidoku
    ctx.fillRect(0, 0, width, height);
    
    // Draw afterimages from history
    this.draw_history();
    
    // Draw MIDI note scale (now in the middle)
    this.draw_midi_scale();
    
    // Draw tone rectangles
    this.draw_tone_set('primary');
    this.draw_tone_set('secondary');
  }
  
  draw_history() {
    const ctx = this.ctx;
    
    // Draw history with decreasing opacity
    this.history.forEach((history_frame, index) => {
      const opacity = 0.1 - (index * 0.01); // Zmniejszanie przezroczystości dla starszych klatek
      if (opacity <= 0) return;
      
      // Draw primary history
      history_frame.primary.forEach(note => {
        this.draw_note_shape(note, 'primary', opacity);
      });
      
      // Draw secondary history
      history_frame.secondary.forEach(note => {
        this.draw_note_shape(note, 'secondary', opacity);
      });
    });
  }
  
  draw_note_shape(note, tone_set, opacity = 1.0) {
    const ctx = this.ctx;
    const mid_height = this.canvas.height / 2;
    const x = this.midi_to_canvas_x(note.midi_value);
    const bar_width = 7;
    
    // Dynamicznie oblicz wysokość prostokąta w zależności od wysokości canvas
    // Prostokąt ma wysokość połowy canvas minus margines (góra i dół)
    const bar_height = (this.canvas.height / 2) - (this.vertical_margin * 2);
    
    // Determine whether to draw above or below middle line
    const y_start = tone_set === 'primary' 
      ? mid_height - bar_height - this.vertical_margin 
      : mid_height + this.vertical_margin;
    
    // Draw glow effect
    ctx.fillStyle = this.apply_opacity(this.note_colors[tone_set].glow, opacity * 0.7);
    ctx.fillRect(x - bar_width - 3, y_start, bar_width * 2 + 6, bar_height);
    
    // Draw hollow rectangle (outline only)
    ctx.strokeStyle = this.apply_opacity(this.note_colors[tone_set].border, opacity);
    ctx.lineWidth = 2;
    ctx.strokeRect(x - bar_width / 2, y_start, bar_width, bar_height);
    
    // Draw rotated frequency text
    ctx.save();
    ctx.translate(x, y_start + bar_height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '9px monospace';
    ctx.fillStyle = this.apply_opacity(this.note_colors[tone_set].text, opacity);
    ctx.textAlign = 'center';
    ctx.fillText(`${note.frequency.toFixed(1)} Hz`, 0, 3);
    ctx.restore();
  }
  
  apply_opacity(color_string, opacity) {
    // Helper to apply custom opacity to a color
    if (color_string.startsWith('rgba')) {
      // Extract rgba components
      const rgba = color_string.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (rgba) {
        return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${parseFloat(rgba[4]) * opacity})`;
      }
    }
    return color_string;
  }
  
  draw_midi_scale() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const mid_height = this.canvas.height / 2;
    
    // Draw middle line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, mid_height, width, 1);
    
    // Draw brackets at the edges
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('[', 2, mid_height + 8);
    ctx.textAlign = 'right';
    ctx.fillText(']', width - 2, mid_height + 8);
    
    // Draw A note markers (A0 = 21, A1 = 33, ..., A7 = 105)
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    for (let octave = 0; octave <= 8; octave++) {
      const midi_note = 21 + (octave * 12);
      if (midi_note < this.midi_units) {
        const x = this.midi_to_canvas_x(midi_note);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(x, mid_height - 4, 1, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`A${octave}`, x, mid_height + 15);
      }
    }
  }
  
  draw_tone_set(tone_set) {
    for (const note of this.visible_notes[tone_set]) {
      this.draw_note_shape(note, tone_set);
    }
  }
}

// Note class to represent individual tones on the visualizer
class VisualizerNote {
  constructor(frequency, use_secondary_color = false) {
    this.frequency = frequency;
    this.midi_value = this.frequency_to_midi(frequency);
    this.use_secondary_color = use_secondary_color;
  }
  
  frequency_to_midi(frequency) {
    // Convert frequency to approximate MIDI note number (float)
    // A4 (440Hz) is MIDI note 69
    return frequency > 0 ? 69 + 12 * Math.log2(frequency / 440) : 0;
  }
  
  get color_scheme() {
    return this.use_secondary_color ? 'secondary' : 'primary';
  }
  
  toggle_color() {
    this.use_secondary_color = !this.use_secondary_color;
  }
}

// Integration with the main application
document.addEventListener('DOMContentLoaded', () => {
  // Add the visualizer container to the DOM
  const visualizer_container = document.createElement('div');
  visualizer_container.id = 'frequency_visualizer_container';
  visualizer_container.style.width = '80%';
  visualizer_container.style.maxWidth = '500px';
  visualizer_container.style.margin = '20px auto';
  
  // Insert visualizer after the output display
  const output_display = document.getElementById('status_area');
  output_display.parentNode.insertBefore(visualizer_container, output_display.nextSibling);
  
  // Create visualizer instance
  const visualizer = new ToneVisualizer('frequency_visualizer_container');
  
  // Update when MIDI events occur
  if (combination_tone_processor) {
    // Original combination_tone_processor.receive_midi_message function
    const original_receive_midi = combination_tone_processor.receive_midi_message.bind(combination_tone_processor);
    
    // Override to update visualizer after processing MIDI message
    combination_tone_processor.receive_midi_message = (midi_event) => {
      original_receive_midi(midi_event);
      visualizer.update_tones(combination_tone_processor, is_playing);
    };
  }
  
  setInterval(() => {
    if (is_visualizer_running) { // Sprawdzanie czy wizualizator powinien być aktywny
      visualizer.update_tones(combination_tone_processor, is_playing);
    }
  }, 100);
});
