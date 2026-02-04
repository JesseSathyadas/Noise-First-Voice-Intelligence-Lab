import numpy as np

class NoiseEngine:
    def __init__(self, intensity: float = 0.0, jitter_prob: float = 0.0):
        self.intensity = intensity
        self.jitter_prob = jitter_prob

    def update_params(self, intensity: float, jitter_prob: float):
        self.intensity = max(0.0, min(1.0, intensity))
        self.jitter_prob = max(0.0, min(1.0, jitter_prob))

    def apply_noise(self, audio_frame: np.ndarray) -> np.ndarray:
        """
        Applies stochastic noise to the audio frame.
        
        Mechanisms:
        1. Amplitude Perturbation: Multiplicative noise based on intensity.
        2. Temporal Jitter: Random index shifting based on jitter probability.
        """
        noisy_signal = audio_frame.copy()

        # 1. Amplitude Perturbation
        # Signal * (1 + N(0, intensity))
        if self.intensity > 0:
            perturbation = np.random.normal(0, self.intensity, size=noisy_signal.shape)
            noisy_signal = noisy_signal * (1 + perturbation)

        # 2. Temporal Jitter
        # Randomly shift samples by small offsets
        if self.jitter_prob > 0 and np.random.random() < self.jitter_prob:
            # Shift amount (can be negative or positive, small window)
            shift = np.random.randint(-5, 6) # -5 to +5 samples
            noisy_signal = np.roll(noisy_signal, shift)
            
            # Simple roll wraps around, which is fine for "noise loop" thesis, 
            # but ideally we'd pad, but roll is sufficient for "jitter".

        return noisy_signal.astype(np.float32)
