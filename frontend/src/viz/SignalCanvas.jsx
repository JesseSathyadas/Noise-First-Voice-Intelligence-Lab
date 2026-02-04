import { useEffect, useRef } from 'react';

export const SignalCanvas = ({ latestMetrics, width = 800, height = 300 }) => {
    const canvasRef = useRef(null);
    // Store history in a ref to avoid re-renders causing jitter/perf issues
    const historyRef = useRef([]);
    const maxHistory = 200; // Number of points to keep

    useEffect(() => {
        if (!latestMetrics) return;

        const history = historyRef.current;
        history.push(latestMetrics);
        if (history.length > maxHistory) {
            history.shift();
        }

        draw();
    }, [latestMetrics]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const history = historyRef.current;

        // Clear
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        if (history.length < 2) return;

        // Helper to map values to Y coords
        // We assume normalized values 0-1 mostly, or we scale dynamically?
        // Let's scale dynamically or assume ranges. 
        // Entropy usually 0-5ish? Energy 0-1? Variance 0-1?
        // Let's separate into 3 distinct bands for clarity.

        const bandHeight = height / 3;

        const drawLine = (dataKey, color, bandIndex, scaleFunc) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            const step = width / maxHistory;

            history.forEach((metric, i) => {
                let val = metric.features[dataKey];

                // Safety check
                if (val === undefined || isNaN(val)) val = 0;

                // Scale val to fit in band
                // Normalized height within band: (1 - output) * bandHeight
                const y = (bandIndex * bandHeight) + bandHeight - (scaleFunc(val) * bandHeight);
                const x = i * step;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Label
            ctx.fillStyle = color;
            ctx.font = '12px monospace';
            ctx.fillText(dataKey.toUpperCase(), 10, bandIndex * bandHeight + 20);

            // Current Value
            const currentVal = history[history.length - 1].features[dataKey];
            ctx.fillText(currentVal.toFixed(4), width - 60, bandIndex * bandHeight + 20);
        };

        // Draw Energy (Band 0) - Scale: Assume 0-0.5 is typical range for normalized float audio
        drawLine('energy', '#00ff00', 0, (v) => Math.min(v * 5, 0.9)); // Amplify small signals

        // Draw Variance (Band 1)
        drawLine('variance', '#00ffff', 1, (v) => Math.min(v * 10, 0.9));

        // Draw Entropy (Band 2) - Entropy of float32 distribution can vary.
        // For 20 bins, max entropy is log2(20) ~= 4.32.
        drawLine('entropy', '#ff00ff', 2, (v) => Math.min(v / 4.5, 0.9));

        // Draw Stability Score Overlay (White line across top or separate?)
        // Let's put Stability as a text overlay or huge number
        const stability = history[history.length - 1].stability;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(width - 150, 0, 150, 30);
        ctx.fillStyle = '#fff';
        ctx.fillText(`STABILITY: ${stability.toFixed(2)}`, width - 140, 20);
    };

    return (
        <div className="signal-canvas-container">
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ border: '1px solid #444', backgroundColor: '#000' }}
            />
        </div>
    );
};
