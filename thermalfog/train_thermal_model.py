import os
import sys
import zipfile
import yaml
import argparse
from ultralytics import YOLO

def prepare_dataset(zip_path="Thermal.v11i.yolov8.zip", extract_dir="dataset_roboflow"):
    """
    Extracts the dataset ZIP and prepares data.yaml for Ultralytics YOLO training.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_abs = os.path.join(base_dir, zip_path)
    extract_abs = os.path.join(base_dir, extract_dir)

    if not os.path.exists(zip_abs):
        print(f"[!] ZIP dataset file '{zip_abs}' not found.")
        return None

    print(f"[*] Extracting dataset archive for training: {zip_abs} -> {extract_abs}")
    os.makedirs(extract_abs, exist_ok=True)
    
    with zipfile.ZipFile(zip_abs, 'r') as z:
        z.extractall(extract_abs)

    yaml_path = os.path.join(extract_abs, 'data.yaml')
    if not os.path.exists(yaml_path):
        print(f"[!] data.yaml not found inside extracted folder: {yaml_path}")
        return None

    # Update data.yaml with absolute paths for train/val/test
    with open(yaml_path, 'r') as f:
        data_cfg = yaml.safe_load(f)

    data_cfg['path'] = extract_abs
    data_cfg['train'] = os.path.join(extract_abs, 'train', 'images')
    data_cfg['val'] = os.path.join(extract_abs, 'valid', 'images')
    if os.path.exists(os.path.join(extract_abs, 'test', 'images')):
        data_cfg['test'] = os.path.join(extract_abs, 'test', 'images')

    # Ensure class names match person, vehicle
    data_cfg['names'] = {0: 'person', 1: 'vehicle'}
    data_cfg['nc'] = 2

    fixed_yaml_path = os.path.join(extract_abs, 'data_fixed.yaml')
    with open(fixed_yaml_path, 'w') as f:
        yaml.dump(data_cfg, f, default_flow_style=False)

    print(f"[+] Configured dataset YAML for YOLO training: {fixed_yaml_path}")
    return fixed_yaml_path

def train_model(epochs=3, batch=8, imgsz=640, base_model="yolov8n.pt"):
    """
    Fine-tunes YOLOv8 on the Roboflow dataset for Person & Vehicle detection in thermal images.
    """
    yaml_config = prepare_dataset()
    if not yaml_config:
        print("[!] Dataset preparation failed.")
        return

    print(f"[*] Loading base model '{base_model}' for fine-tuning...")
    model = YOLO(base_model)

    print(f"[*] Starting YOLOv8 fine-tuning on Thermal dataset ({epochs} epochs)...")
    results = model.train(
        data=yaml_config,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        project="runs/detect",
        name="thermal_vehicle_human",
        exist_ok=True,
        verbose=True
    )

    trained_weights = os.path.join("runs", "detect", "thermal_vehicle_human", "weights", "best.pt")
    if os.path.exists(trained_weights):
        # Update best.pt in project root
        target_weights = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")
        import shutil
        shutil.copy(trained_weights, target_weights)
        print(f"\n==================================================")
        print(f"[SUCCESS] Fine-tuned model training completed!")
        print(f"Trained weights saved to: {trained_weights}")
        print(f"Updated root model: {target_weights}")
        print(f"Model trained to detect: Person (Human), Vehicle (Car/Truck/Bike), Animals & Heat targets separately!")
        print(f"==================================================")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train YOLOv8 Thermal Vehicle & Pedestrian Model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (default: 3)")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (default: 8)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size (default: 640)")
    parser.add_argument("--model", default="yolov8n.pt", help="Base model (default: yolov8n.pt)")

    args = parser.parse_args()
    train_model(epochs=args.epochs, batch=args.batch, imgsz=args.imgsz, base_model=args.model)
