# Noise-First Voice Intelligence Lab

A real-time audio processing system that learns to recognize voice patterns through noise-robust feature extraction and unsupervised clustering.

## Overview

This project implements a **noise-first** approach to voice intelligence, where the system:
- Captures live audio from the microphone
- Injects configurable stochastic noise (for robustness training)
- Extracts structural voice features that survive noise
- Learns identity clusters without requiring labels or speech-to-text
- Provides an admin interface for semi-supervised identity management

## Features

### Audio Processing
- **Real-time capture** via AudioWorklet (high-performance, off-main-thread)
- **Noise injection**: Configurable amplitude perturbation and temporal jitter
- **Structural feature extraction**:
  - Energy & Variance (intensity)
  - Shannon Entropy (complexity)
  - Zero-Crossing Rate (texture)
  - Spectral Ratios (low/mid/high frequency distribution)
  - Temporal Micro-Jitter (rhythm consistency)

### Identity Learning
- **Unsupervised clustering** of voice patterns
- **Competitive matching** against known identities
- **Pending identity queue** for admin approval (no auto-learning)
- **Weighted distance metric** that prioritizes structure over volume

### Admin Dashboard
- View active and pending identities
- Approve or reject new identity proposals
- Reset system memory
- Visualize structural differences between voices

## Tech Stack

- **Frontend**: React + Vite, HTML5 Canvas visualization
- **Backend**: FastAPI, Python, NumPy
- **Communication**: WebSocket for real-time audio streaming

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Modern browser with WebAudio API support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JesseSathyadas/Noise-First-Voice-Intelligence-Lab.git
   cd Noise-First-Voice-Intelligence-Lab
   ```

2. **Install backend dependencies**
   ```bash
   pip install fastapi uvicorn numpy
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the backend**
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser**
   - Main Dashboard: http://localhost:5173
   - Click "Start Capture" to begin
   - Use noise sliders to test robustness
   - Click "Admin Dashboard" to manage identities

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI server & WebSocket endpoint
│   ├── learning_core.py     # Feature extraction & identity clustering
│   ├── noise_engine.py      # Stochastic noise injection
│   └── audio_processor.py   # Audio byte processing
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main dashboard
│   │   ├── AdminPanel.jsx   # Identity management UI
│   │   ├── audio/           # AudioWorklet capture
│   │   └── viz/             # Real-time visualization
│   └── public/
│       └── audio-processor.js  # AudioWorklet processor
```

## How It Works

1. **Capture**: Audio is captured via AudioWorklet and streamed over WebSocket
2. **Noise**: Configurable noise is injected to simulate real-world conditions
3. **Features**: 8-dimensional feature vector extracted per audio frame
4. **Match**: Features compared against known identity clusters
5. **Learn**: Unmatched patterns queue for admin approval
6. **Visualize**: Live graphs show energy, entropy, and identity status

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
