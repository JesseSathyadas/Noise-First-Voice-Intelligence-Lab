import { useState, useEffect, useRef } from 'react'
import './App.css'
import { AudioCapture } from './audio/AudioCapture'
import { SignalCanvas } from './viz/SignalCanvas'
import { AdminPanel } from './AdminPanel'

function App() {
    const [isCapturing, setIsCapturing] = useState(false);
    const [params, setParams] = useState({ intensity: 0.0, jitter: 0.0 });
    const [latestMetrics, setLatestMetrics] = useState(null);
    const [showAdmin, setShowAdmin] = useState(false);

    const captureRef = useRef(null);

    useEffect(() => {
        // Initialize capture instance
        // Pass callback for metrics
        captureRef.current = new AudioCapture('ws://localhost:8000/ws/audio', (metrics) => {
            setLatestMetrics(metrics);
        });
        captureRef.current.connect();

        return () => {
            if (captureRef.current) {
                captureRef.current.stop();
            }
        };
    }, []);

    const updateParams = (newParams) => {
        setParams(newParams);
        if (captureRef.current) {
            captureRef.current.sendConfig(newParams.intensity, newParams.jitter);
        }
    };

    const toggleCapture = async () => {
        if (isCapturing) {
            captureRef.current.stop();
            setIsCapturing(false);
        } else {
            await captureRef.current.start();
            setIsCapturing(true);
            // Send initial params
            captureRef.current.sendConfig(params.intensity, params.jitter);
        }
    };

    if (showAdmin) {
        return <AdminPanel onBack={() => setShowAdmin(false)} />;
    }

    return (
        <div className="app-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Noise-First Voice Intelligence Lab</h1>
                <button onClick={() => setShowAdmin(true)} style={{ backgroundColor: '#444' }}>
                    ADMIN DASHBOARD
                </button>
            </div>

            <div className="controls">
                <button onClick={toggleCapture} style={{ backgroundColor: isCapturing ? 'red' : 'green' }}>
                    {isCapturing ? 'Stop Capture' : 'Start Capture'}
                </button>
            </div>

            <div className="noise-controls" style={{ margin: '20px', padding: '20px', border: '1px solid #555' }}>
                <h3>Noise Injection Controls</h3>
                <div className="control-group">
                    <label>Amplitude Noise Intensity: {params.intensity.toFixed(2)} </label>
                    <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={params.intensity}
                        onChange={(e) => updateParams({ ...params, intensity: parseFloat(e.target.value) })}
                    />
                </div>
                <div className="control-group">
                    <label>Temporal Jitter Probability: {params.jitter.toFixed(2)} </label>
                    <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={params.jitter}
                        onChange={(e) => updateParams({ ...params, jitter: parseFloat(e.target.value) })}
                    />
                </div>
            </div>

            <div className="viz-container">
                <h3>Real-time Signal Analysis</h3>
                <SignalCanvas latestMetrics={latestMetrics} width={800} height={300} />
            </div>

            {latestMetrics && (
                <div className="memory-status" style={{
                    margin: '20px',
                    padding: '20px',
                    border: '2px solid #ccc',
                    borderColor: latestMetrics.current_identity_id ? '#0f0' : '#fa0',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '10px'
                }}>
                    <h2 style={{ color: latestMetrics.current_identity_id ? '#0f0' : '#fa0' }}>
                        IDENTITY: {latestMetrics.current_identity_id ? `DETECTED (${latestMetrics.current_identity_id})` : "UNKNOWN / PENDING"}
                    </h2>

                    <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
                        <div>
                            <h4>Confidence</h4>
                            <p style={{ fontSize: '2em', margin: '5px' }}>{(latestMetrics.match_confidence || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <h4>System Stability</h4>
                            <p style={{ fontSize: '2em', margin: '5px' }}>{latestMetrics.stability.toFixed(1)}</p>
                        </div>
                        <div>
                            <h4>Pending Proposals</h4>
                            <p style={{ fontSize: '2em', margin: '5px' }}>{latestMetrics.pending_count || 0}</p>
                        </div>
                    </div>
                    {!latestMetrics.current_identity_id && latestMetrics.pending_count > 0 && (
                        <div style={{ marginTop: '10px', color: '#fa0' }}>
                            <p>⚠️ New patterns detected. Go to ADMIN DASHBOARD to approve/reject.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="status">
                <p>Status: {isCapturing ? 'Streaming Raw Audio...' : 'Idle'}</p>
            </div>
        </div>
    )
}

export default App
