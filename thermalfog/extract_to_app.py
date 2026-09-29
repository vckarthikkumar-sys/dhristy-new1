import os
import zipfile

def extract_dataset_for_app():
    zip_path = os.path.join(os.path.dirname(__file__), 'Thermal.v11i.yolov8.zip')
    custom_dir = os.path.join(os.path.dirname(__file__), 'static', 'samples', 'custom')
    os.makedirs(custom_dir, exist_ok=True)

    if not os.path.exists(zip_path):
        print(f"[!] {zip_path} not found.")
        return

    print(f"[*] Extracting all images from '{zip_path}' to app custom directory: {custom_dir}")

    extracted_count = 0
    with zipfile.ZipFile(zip_path, 'r') as z:
        for fname in z.namelist():
            if fname.lower().endswith(('.jpg', '.jpeg', '.png')) and not fname.startswith('__MACOSX'):
                base_name = os.path.basename(fname)
                if base_name:
                    out_path = os.path.join(custom_dir, base_name)
                    with open(out_path, 'wb') as f:
                        f.write(z.read(fname))
                    extracted_count += 1

    print(f"[SUCCESS] Extracted {extracted_count} Roboflow thermal images into app static directory!")

if __name__ == '__main__':
    extract_dataset_for_app()
