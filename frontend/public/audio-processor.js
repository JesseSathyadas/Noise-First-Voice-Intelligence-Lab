class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputChannel = input[0]; // Mono

            // Copy data to buffer
            for (let i = 0; i < inputChannel.length; i++) {
                this.buffer[this.index] = inputChannel[i];
                this.index++;

                // When buffer is full, send it
                if (this.index >= this.bufferSize) {
                    this.port.postMessage(this.buffer);
                    this.index = 0;
                    // Optionally clear buffer or just overwrite next time (overwrite is faster)
                }
            }
        }
        return true; // Keep processor alive
    }
}

registerProcessor('audio-processor', AudioProcessor);
