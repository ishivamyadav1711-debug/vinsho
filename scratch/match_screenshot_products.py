import os
import glob
from PIL import Image
import numpy as np

# Load all 52 candle images
candles_dir = r"public/products/candles"
candle_files = sorted([f for f in os.listdir(candles_dir) if f.endswith('.jpg')])

print(f"Loaded {len(candle_files)} candle images from {candles_dir}")

def get_image_vector(img_path, size=(64, 64)):
    try:
        with Image.open(img_path) as img:
            img = img.convert('RGB').resize(size)
            arr = np.array(img, dtype=np.float32)
            # Normalize
            arr = arr - np.mean(arr)
            std = np.std(arr)
            if std > 0:
                arr = arr / std
            return arr
    except Exception as e:
        print(f"Error loading {img_path}: {e}")
        return None

candle_vectors = {}
for f in candle_files:
    path = os.path.join(candles_dir, f)
    candle_vectors[f] = get_image_vector(path)

# Find all uploaded screenshot images in conversation/artifact workspace if available or temporary paths
# Wait, let's see where the input screenshot images are stored.
