export class AudioCapture {
    constructor(wsUrl, onMetrics) {
        this.wsUrl = wsUrl;
        this.onMetrics = onMetrics;
        this.ws = null;
        this.audioContext = null;
        this.workletNode = null;
        this.stream = null;
        this.isConnected = false;
    }

    connect() {
        this.ws = new WebSocket(this.wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log("WebSocket connected");
            this.isConnected = true;
        };

        this.ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'metrics' && this.onMetrics) {
                        this.onMetrics(msg.data);
                    }
                } catch (e) {
                    console.error("Error parsing WS message", e);
                }
            }
        };

        this.ws.onclose = () => {
            console.log("WebSocket disconnected");
            this.isConnected = false;
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error", error);
        };
    }

    async start() {
        if (!this.isConnected) {
            console.warn("WebSocket not connected yet. Waiting...");
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.stream);

            // Load the worklet module from public folder
            try {
                await this.audioContext.audioWorklet.addModule('/audio-processor.js');
            } catch (e) {
                console.error("Failed to load audio-processor.js", e);
                // Fallback or alert user
                return;
            }

            // Create the Worklet Node
            this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

            // Handle messages from the processor (our raw PCM data)
            this.workletNode.port.onmessage = (event) => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    // event.data is the Float32Array buffer from the worker
                    this.ws.send(event.data.buffer);
                }
            };

            source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination); // Needed to keep graph alive

            console.log("Audio capture started via AudioWorklet: " + this.audioContext.sampleRate + "Hz");

        } catch (err) {
            console.error("Error accessing microphone or loading worklet", err);
        }
    }

    sendConfig(intensity, jitter) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const configMsg = {
                type: 'config',
                intensity: intensity,
                jitter: jitter
            };
            this.ws.send(JSON.stringify(configMsg));
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.workletNode) {
            this.workletNode.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
