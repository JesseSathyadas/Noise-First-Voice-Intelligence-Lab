import numpy as np

class AudioProcessor:
    @staticmethod
    def process_bytes(raw_bytes: bytes) -> np.ndarray:
        """
        Convert raw bytes (Float32) to NumPy array.
        """
        # Assume 32-bit float mono
        try:
            return np.frombuffer(raw_bytes, dtype=np.float32)
        except Exception as e:
            print(f"Error processing audio bytes: {e}")
            return np.array([])
