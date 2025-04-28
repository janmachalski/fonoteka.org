class OscillatorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.phase = 0;
    this.sample_rate = sampleRate;
    this.waveform = (options.processorOptions.waveform ?? 'sine').toLowerCase();

    // Parametry rolloffu
    this.high_frequency_threshold = options.processorOptions.high_frequency_threshold || 1000;
    this.high_frequency_rolloff = options.processorOptions.high_frequency_rolloff || -6; // dB per octave
  }

  computeGain(freq) {
    if (freq <= this.high_frequency_threshold) {
      return 1.0; // Brak tłumienia
    }
    // Liczba oktaw powyżej progu
    const octaves = Math.log2(freq / this.high_frequency_threshold);
    // Gain w skali liniowej
    const gain = Math.pow(10, (this.high_frequency_rolloff / 20) * octaves);
    return gain;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0 || !input[0] || input[0].length === 0) {
      output[0].fill(0);
      return true;
    }

    const freq_input = input[0];
    const out_channel = output[0];

    for (let i = 0; i < out_channel.length; ++i) {
      let freq = freq_input[i];

      if (!isFinite(freq) || freq <= 0) {
        out_channel[i] = 0;
        continue;
      }

      const phase_inc = freq / this.sample_rate;
      this.phase += phase_inc;
      if (this.phase >= 1.0) this.phase -= 1.0;
      if (this.phase < 0.0) this.phase += 1.0;

      let sample;
      switch (this.waveform) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * this.phase);
          break;
        case 'square':
          sample = this.phase < 0.5 ? 1.0 : -1.0;
          break;
        case 'saw':
          sample = 2.0 * this.phase - 1.0;
          break;
        case 'triangle':
          sample = 1.0 - 4.0 * Math.abs(this.phase - 0.5);
          break;
        default:
          sample = 0;
      }

      const gain = this.computeGain(freq);
      out_channel[i] = sample * gain;
    }

    return true;
  }
}

registerProcessor('oscillator_processor', OscillatorProcessor);
