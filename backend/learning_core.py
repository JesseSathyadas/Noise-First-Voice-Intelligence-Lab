import numpy as np
from collections import deque
import time
import uuid

class FeatureExtractor:
    @staticmethod
    def calculate_energy(frame: np.ndarray) -> float:
        return float(np.sum(frame ** 2) / len(frame))

    @staticmethod
    def calculate_variance(frame: np.ndarray) -> float:
        return float(np.var(frame))

    @staticmethod
    def calculate_entropy(frame: np.ndarray, bins: int = 20) -> float:
        if len(frame) == 0: return 0.0
        abs_frame = np.abs(frame)
        total_energy = np.sum(abs_frame)
        if total_energy < 1e-9: return 0.0
        hist_counts, _ = np.histogram(frame, bins=bins)
        if np.sum(hist_counts) == 0: return 0.0
        probs = hist_counts / np.sum(hist_counts)
        probs = probs[probs > 0]
        if len(probs) == 0: return 0.0
        return float(-np.sum(probs * np.log2(probs)))

    @staticmethod
    def calculate_zcr(frame: np.ndarray) -> float:
        """Zero-Crossing Rate: fraction of sign changes."""
        if len(frame) < 2: return 0.0
        # Count sign changes
        signs = np.sign(frame)
        # Handle zeros in sign (optional, but sign(0)=0)
        # Simplest: diff of signs != 0 implies crossing
        crossings = np.sum(np.abs(np.diff(signs)) > 0)
        return float(crossings / (len(frame) - 1))

    @staticmethod
    def calculate_spectral_ratios(frame: np.ndarray, sample_rate: int = 44100):
        """Returns (low_ratio, mid_ratio, high_ratio)."""
        if len(frame) == 0: return 0.0, 0.0, 0.0
        
        # FFT
        spectrum = np.abs(np.fft.rfft(frame))
        freqs = np.fft.rfftfreq(len(frame), d=1/sample_rate)
        
        # Bands
        low_mask = (freqs <= 400)
        mid_mask = (freqs > 400) & (freqs <= 2000)
        high_mask = (freqs > 2000)
        
        total_spectral_energy = np.sum(spectrum)
        if total_spectral_energy < 1e-9:
            return 0.33, 0.33, 0.34 # Flat distribution for silence
            
        low_energy = np.sum(spectrum[low_mask])
        mid_energy = np.sum(spectrum[mid_mask])
        high_energy = np.sum(spectrum[high_mask])
        
        return (
            float(low_energy / total_spectral_energy),
            float(mid_energy / total_spectral_energy),
            float(high_energy / total_spectral_energy)
        )

    @staticmethod
    def calculate_micro_jitter(frame: np.ndarray) -> float:
        """Variance of distances between local peaks."""
        if len(frame) < 10: return 0.0
        
        # Simple peak detection: value > neighbors
        # We look at absolute amplitude to capture envelope peaks
        abs_frame = np.abs(frame)
        # Find local maxima indices
        peaks = (np.diff(np.sign(np.diff(abs_frame))) < 0).nonzero()[0] + 1
        
        if len(peaks) < 2:
            return 0.0
            
        peak_dists = np.diff(peaks)
        jitter = np.var(peak_dists)
        
        # Normalize: Jitter can be large. Log scale it?
        # Or simple scaling. Let's return raw variance for now, 
        # but the vector construction will handle scaling.
        # Actually, let's log-scale it here for stability.
        return float(np.log1p(jitter))

class IdentityCluster:
    def __init__(self, embedding: np.ndarray):
        self.id = str(uuid.uuid4())[:8]
        self.centroid = embedding
        self.strength = 1.0
        self.stability = 1.0
        self.last_seen = time.time()
        self.observation_count = 1

    def update(self, embedding: np.ndarray, learning_rate=0.1):
        self.centroid = self.centroid * (1 - learning_rate) + embedding * learning_rate
        self.strength += 1.0
        self.last_seen = time.time()
        self.observation_count += 1

    def decay(self, rate=0.01):
        self.strength -= rate

class PendingIdentity:
    def __init__(self, embedding: np.ndarray):
        self.id = str(uuid.uuid4())[:8]
        self.centroid = embedding
        self.observation_count = 1
        self.first_seen = time.time()
        self.last_seen = time.time()

    def update(self, embedding: np.ndarray):
        learning_rate = 0.2
        self.centroid = self.centroid * (1 - learning_rate) + embedding * learning_rate
        self.observation_count += 1
        self.last_seen = time.time()

class StochasticModel:
    def __init__(self):
        self.active_identities = []
        self.pending_identities = []
        self.learning_enabled = True
        # Adjusted threshold for 8D vector
        # With more dimensions, distance might increase.
        # We weighted ZCR/Ratios (0-1) by 1.5.
        # Energy (0-1), Entropy (0-1 approx normalized).
        # Distance of 0.25 was for 3 features.
        # New vector length ~ sqrt(1^2 + 1^2 + ...).
        # Let's bump threshold slightly or tune dynamically.
        self.params = {
            "match_threshold": 0.35, 
            "min_energy": 0.01,
            "decay_rate": 0.005
        }

    def get_feature_vector(self, frame: np.ndarray) -> np.ndarray:
        # Extract Raw Features
        energy = FeatureExtractor.calculate_energy(frame)
        variance = FeatureExtractor.calculate_variance(frame)
        entropy = FeatureExtractor.calculate_entropy(frame)
        zcr = FeatureExtractor.calculate_zcr(frame)
        low, mid, high = FeatureExtractor.calculate_spectral_ratios(frame)
        jitter = FeatureExtractor.calculate_micro_jitter(frame) # Already log1p
        
        # Normalization / Scaling
        # Energy: 0-1
        # Variance: 0-0.25 (Scale up x4)
        # Entropy: 0-4.3 (Scale down /4)
        # ZCR: 0-1
        # Ratios: 0-1
        # Jitter: 0-10+ (Scale down /10)
        
        norm_energy = energy
        norm_variance = variance * 4.0
        norm_entropy = entropy / 4.0
        norm_zcr = zcr
        norm_jitter = min(jitter / 10.0, 1.0) # Cap at 1.0
        
        # Construct Vector
        # [Energy, Variance, Entropy, ZCR, Low, Mid, High, Jitter]
        
        # Apply weighting (Structure = 1.5x)
        w_intensity = 1.0
        w_structure = 1.5
        
        vector = np.array([
            norm_energy * w_intensity,
            norm_variance * w_intensity,
            norm_entropy * w_intensity,
            norm_zcr * w_structure,
            low * w_structure,
            mid * w_structure,
            high * w_structure,
            norm_jitter * w_structure
        ])
        
        return vector, {
            "energy": energy, "variance": variance, "entropy": entropy,
            "zcr": zcr, "low": low, "mid": mid, "high": high, "jitter": jitter
        }

    def process(self, frame: np.ndarray):
        # 1. Extract Features
        features, raw_metrics = self.get_feature_vector(frame)
        current_time = time.time()
        
        matched_identity = None
        closest_dist = float('inf')
        
        # 2. Competitive Matching
        if raw_metrics["energy"] > self.params["min_energy"]:
            for identity in self.active_identities:
                dist = np.linalg.norm(identity.centroid - features)
                if dist < closest_dist:
                    closest_dist = dist
                    if dist < self.params["match_threshold"]:
                        matched_identity = identity

            # 3. Learning & Update
            if matched_identity and self.learning_enabled:
                matched_identity.update(features)
            
            # 4. Pending Identity System
            elif not matched_identity and self.learning_enabled:
                matched_pending = None
                closest_pending_dist = float('inf')
                
                for pending in self.pending_identities:
                    dist = np.linalg.norm(pending.centroid - features)
                    if dist < closest_pending_dist:
                        closest_pending_dist = dist
                        if dist < self.params["match_threshold"]:
                            matched_pending = pending
                
                if matched_pending:
                    matched_pending.update(features)
                else:
                    if closest_dist > self.params["match_threshold"]:
                        self.pending_identities.append(PendingIdentity(features))

        # 5. Decay Logic
        for identity in self.active_identities:
            if identity != matched_identity:
                identity.decay(self.params["decay_rate"])
        
        self.active_identities = [i for i in self.active_identities if i.strength > 0.0]
        self.pending_identities = [p for p in self.pending_identities if current_time - p.last_seen < 30.0]

        return {
            "features": raw_metrics, # Send raw meaningful values to frontend
            "stability": sum(i.strength for i in self.active_identities),
            "representation_count": len(self.active_identities),
            "current_identity_id": matched_identity.id if matched_identity else None,
            "match_confidence": 1.0 - min(closest_dist, 1.0),
            "pending_count": len(self.pending_identities)
        }

    # --- ADMIN API ---
    def approve_pending(self, pending_id):
        pending = next((p for p in self.pending_identities if p.id == pending_id), None)
        if pending:
            new_identity = IdentityCluster(pending.centroid)
            new_identity.observation_count = pending.observation_count
            new_identity.strength = 5.0 
            self.active_identities.append(new_identity)
            self.pending_identities.remove(pending)
            return new_identity.id
        return None

    def reject_pending(self, pending_id):
        self.pending_identities = [p for p in self.pending_identities if p.id != pending_id]

    def reset_model(self):
        self.active_identities = []
        self.pending_identities = []
