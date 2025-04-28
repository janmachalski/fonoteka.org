class signal_processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.value = options.processorOptions?.value ?? 0;
    this.port.onmessage = (event) => {
      if (typeof event.data === 'number') {
        this.value = event.data;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output) return true;

    for (let channel = 0; channel < output.length; ++channel) {
      const channelData = output[channel];
      channelData.fill(this.value);
    }

    return true;
  }
}

registerProcessor('signal_processor', signal_processor);
