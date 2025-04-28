class SignalMultiply extends AudioWorkletProcessor {
  process(inputs, outputs) {
    // inputs to tablica, gdzie:
    // inputs[0] - sygnał z oscylatora
    // inputs[1] - sygnał kontrolny (amplitudy)
    const input_a = inputs[0] && inputs[0].length ? inputs[0][0] : null;
    const input_b = inputs[1] && inputs[1].length ? inputs[1][0] : null;
    const output = outputs[0];

    for (let channel = 0; channel < output.length; ++channel) {
      const out_channel = output[channel];
      for (let i = 0; i < out_channel.length; ++i) {
        const a_val = input_a ? input_a[i] : 0;
        const b_val = input_b ? input_b[i] : 0;
        out_channel[i] = a_val * b_val;
      }
    }
    return true;
  }
}

registerProcessor('signal_multiply', SignalMultiply);
