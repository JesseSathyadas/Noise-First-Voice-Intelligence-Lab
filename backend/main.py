from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import json
import time
import numpy as np
from backend.audio_processor import AudioProcessor
from backend.noise_engine import NoiseEngine
from backend.learning_core import StochasticModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NoiseIntelligenceLab")

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
noise_engine = NoiseEngine(intensity=0.0, jitter_prob=0.0)
model = StochasticModel()

@app.get("/")
async def root():
    return {"message": "Noise-First Voice Intelligence Lab Backend is Running"}

@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to audio stream")
    
    try:
        while True:
            data = await websocket.receive()
            
            if "text" in data:
                # Handle Config
                try:
                    config = json.loads(data["text"])
                    if config.get("type") == "config":
                        noise_engine.amplitude_intensity = config.get("intensity", 0.0)
                        noise_engine.jitter_probability = config.get("jitter", 0.0)
                        noise_engine.update_params(noise_engine.amplitude_intensity, noise_engine.jitter_probability)
                except:
                    pass
                    
            elif "bytes" in data:
                # Handle Audio
                raw_bytes = data["bytes"]
                frame = AudioProcessor.process_bytes(raw_bytes)
                
                # Apply Noise
                noisy_frame = noise_engine.apply_noise(frame)
                
                # Learning & Processing (Using Global Model)
                metrics = model.process(noisy_frame)
                
                await websocket.send_json({
                    "type": "metrics",
                    "data": metrics
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"Error in websocket loop: {e}")

# --- Admin API ---

@app.get("/admin/status")
def get_status():
    # Helper to extract readable stats from centroid
    def extract_stats(centroid):
        # vector mapping: 
        # 0:Energy, 1:Var, 2:Ent, 3:ZCR, 4:Low, 5:Mid, 6:High, 7:Jitter
        # We need to un-weight/scale to give rough idea, or just show raw vector values
        # Since we scaled them, let's just show the structural components
        # ZCR was norm_zcr * 1.5. So zcr = vec[3] / 1.5
        # Ratios were * 1.5
        w_struct = 1.5
        return {
            "zcr": float(centroid[3]) / w_struct,
            "spectral": {
                "low": float(centroid[4]) / w_struct,
                "mid": float(centroid[5]) / w_struct,
                "high": float(centroid[6]) / w_struct
            },
            "jitter": float(centroid[7]) / w_struct
        }

    return {
        "active_identities": [
            {
                "id": i.id, 
                "strength": i.strength, 
                "stability": i.stability,
                "observations": i.observation_count,
                "last_seen": i.last_seen,
                "structure": extract_stats(i.centroid)
            } for i in model.active_identities
        ],
        "pending_identities": [
            {
                "id": p.id,
                "observations": p.observation_count,
                "age_seconds": time.time() - p.first_seen,
                "last_seen": p.last_seen,
                "structure": extract_stats(p.centroid)
            } for p in model.pending_identities
        ],
        "learning_enabled": model.learning_enabled
    }

@app.post("/admin/approve/{pending_id}")
def approve_identity(pending_id: str):
    new_id = model.approve_pending(pending_id)
    return {"status": "approved", "new_id": new_id}

@app.post("/admin/reject/{pending_id}")
def reject_identity(pending_id: str):
    model.reject_pending(pending_id)
    return {"status": "rejected"}

@app.post("/admin/reset")
def reset_system():
    model.reset_model()
    return {"status": "reset"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
