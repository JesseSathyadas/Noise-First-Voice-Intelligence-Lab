import { useState, useEffect } from 'react';

export const AdminPanel = ({ onBack }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:8000/admin/status');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error("Failed to fetch admin status", e);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (endpoint, id) => {
        setLoading(true);
        try {
            const url = id
                ? `http://localhost:8000/admin/${endpoint}/${id}`
                : `http://localhost:8000/admin/${endpoint}`;

            await fetch(url, { method: 'POST' });
            await fetchStatus();
        } catch (e) {
            console.error("Action failed", e);
        }
        setLoading(false);
    };

    if (!status) return <div style={{ padding: '20px', color: '#fff' }}>Loading Admin Panel...</div>;

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#222',
            minHeight: '100vh',
            color: '#eee',
            fontFamily: 'monospace'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1>ADMIN: IDENTITY CONTROL</h1>
                <button onClick={onBack} style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>
                    ← Back to Dashboard
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* ACTIVE IDENTITIES */}
                <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
                    <h2 style={{ color: '#0f0' }}>ACTIVE IDENTITIES ({status.active_identities.length})</h2>
                    {status.active_identities.length === 0 && <p>No learned identities yet.</p>}
                    {status.active_identities.map(id => (
                        <div key={id.id} style={{
                            backgroundColor: '#333',
                            padding: '10px',
                            margin: '10px 0',
                            borderLeft: '4px solid #0f0'
                        }}>
                            <h3>ID: {id.id}</h3>
                            <p>Strength: {id.strength.toFixed(1)} | Stability: {id.stability.toFixed(2)}</p>
                            <p>Observation Count: {id.observations}</p>
                        </div>
                    ))}
                </div>

                {/* PENDING PROPOSALS */}
                <div style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
                    <h2 style={{ color: '#fa0' }}>PENDING PROPOSALS ({status.pending_identities.length})</h2>
                    {status.pending_identities.length === 0 && <p>No pending patterns.</p>}
                    {status.pending_identities.map(p => (
                        <div key={p.id} style={{
                            backgroundColor: '#333',
                            padding: '10px',
                            margin: '10px 0',
                            borderLeft: '4px solid #fa0'
                        }}>
                            <h3>PROPOSAL: {p.id}</h3>
                            <p>Age: {p.age_seconds.toFixed(1)}s | Observations: {p.observations}</p>
                            <div style={{ marginTop: '10px' }}>
                                <button
                                    onClick={() => handleAction('approve', p.id)}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: '#0a0', color: 'white', border: 'none',
                                        padding: '5px 15px', marginRight: '10px', cursor: 'pointer'
                                    }}
                                >
                                    APPROVE
                                </button>
                                <button
                                    onClick={() => handleAction('reject', p.id)}
                                    disabled={loading}
                                    style={{
                                        backgroundColor: '#a00', color: 'white', border: 'none',
                                        padding: '5px 15px', cursor: 'pointer'
                                    }}
                                >
                                    REJECT
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '30px', padding: '20px', borderTop: '1px solid #555' }}>
                <h2>SYSTEM CONTROLS</h2>
                <button
                    onClick={() => handleAction('reset')}
                    disabled={loading}
                    style={{
                        backgroundColor: '#d00', color: 'white', border: 'none',
                        padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer'
                    }}
                >
                    RESET ALL SYSTEM MEMORY
                </button>
            </div>
        </div>
    );
};
