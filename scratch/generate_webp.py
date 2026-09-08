import os
from PIL import Image

base_dir = os.path.abspath('public/images/vinsho')

converted_count = 0

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.lower().endswith(('.jpg', '.jpeg', '.png')):
            original_path = os.path.join(root, file)
            webp_path = os.path.splitext(original_path)[0] + '.webp'
            
            try:
                with Image.open(original_path) as img:
                    img.save(webp_path, 'WEBP', quality=85)
                    converted_count += 1
                    print(f"Generated WebP: {os.path.relpath(webp_path, base_dir)}")
            except Exception as e:
                print(f"Error converting {file}: {e}")

print(f"\n=== WEBP OPTIMIZATION SUMMARY ===")
print(f"Total WebP images generated alongside originals: {converted_count}")
