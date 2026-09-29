import os
import sys
import io
import json
import zipfile
import argparse
import requests
import cv2
import numpy as np

# Try importing local inference pipeline from app.py
try:
    from app import run_inference
    HAS_LOCAL_APP = True
except ImportError:
    HAS_LOCAL_APP = False

def process_zip_api(zip_path, server_url="http://127.0.0.1:5000", conf_thresh=0.25, iou_thresh=0.45):
    """
    Programmatically uploads a ZIP dataset to the REST API endpoint and runs detection on each extracted image.
    """
    print(f"[*] Uploading dataset archive '{zip_path}' to REST API: {server_url}/api/upload_dataset")
    upload_url = f"{server_url.rstrip('/')}/api/upload_dataset"
    detect_url = f"{server_url.rstrip('/')}/api/detect"

    with open(zip_path, 'rb') as f:
        files = {'dataset_zip': (os.path.basename(zip_path), f, 'application/zip')}
        resp = requests.post(upload_url, files=files)

    if resp.status_code != 200:
        print(f"[!] Upload failed with status code {resp.status_code}: {resp.text}")
        return None

    upload_res = resp.json()
    imported_files = upload_res.get('files', [])
    print(f"[+] Successfully imported {len(imported_files)} images via REST API!")

    results = []
    output_dir = "dataset_output_api"
    os.makedirs(output_dir, exist_ok=True)

    for fname in imported_files:
        print(f"[*] Running thermal detection on sample: custom/{fname}")
        payload = {
            'sample_path': f"custom/{fname}",
            'conf_threshold': conf_thresh,
            'iou_threshold': iou_thresh,
            'enhance_fog': True,
            'show_fog_mask': True
        }
        det_resp = requests.post(detect_url, json=payload)
        if det_resp.status_code == 200:
            res = det_resp.json()
            results.append({
                'filename': fname,
                'target_count': res.get('target_count', 0),
                'fog_density': res.get('fog_info', {}).get('score', 0),
                'fog_level': res.get('fog_info', {}).get('level', 'N/A'),
                'visibility_m': res.get('fog_info', {}).get('visibility_meters', 0),
                'threat_level': res.get('threat_level', 'UNKNOWN'),
                'detections': res.get('detections', [])
            })

    report_path = os.path.join(output_dir, "dataset_api_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"[SUCCESS] REST API processing complete. Report saved to: {report_path}")
    return results

def process_zip_direct(zip_path, output_dir="dataset_output", conf_thresh=0.25, iou_thresh=0.45):
    """
    Directly extracts and processes a ZIP dataset in Python using app.py functions without needing a running web server.
    """
    if not HAS_LOCAL_APP:
        print("[!] app.py import failed. Make sure you are running this in the thermal-fog-detection directory.")
        return None

    print(f"[*] Extracting dataset archive '{zip_path}'...", flush=True)
    os.makedirs(output_dir, exist_ok=True)
    images_dir = os.path.join(output_dir, "extracted_images")
    annotated_dir = os.path.join(output_dir, "annotated_images")
    custom_ui_dir = os.path.join(os.path.dirname(__file__), 'static', 'samples', 'custom')
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(annotated_dir, exist_ok=True)
    os.makedirs(custom_ui_dir, exist_ok=True)

    extracted_files = []
    with zipfile.ZipFile(zip_path, 'r') as z:
        for member in z.namelist():
            if member.lower().endswith(('.jpg', '.jpeg', '.png')) and not member.startswith('__MACOSX'):
                base_name = os.path.basename(member)
                if base_name:
                    target_path = os.path.join(images_dir, base_name)
                    ui_path = os.path.join(custom_ui_dir, base_name)
                    img_data = z.read(member)
                    with open(target_path, 'wb') as f:
                        f.write(img_data)
                    with open(ui_path, 'wb') as f:
                        f.write(img_data)
                    extracted_files.append((base_name, target_path))

    print(f"[+] Found {len(extracted_files)} image files in ZIP archive.", flush=True)

    dataset_summary = {
        'total_images': len(extracted_files),
        'total_targets_detected': 0,
        'category_totals': {'PEDESTRIAN': 0, 'VEHICLE': 0, 'ANIMAL': 0, 'HEAT SIGNATURE': 0},
        'items': []
    }

    for base_name, img_path in extracted_files:
        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            print(f"[!] Failed to read image: {img_path}")
            continue

        res = run_inference(img_bgr, conf_thresh=conf_thresh, iou_thresh=iou_thresh, enhance_fog=True, show_fog_mask=True)
        
        # Save annotated image
        b64_str = res['annotated_image'].split(',')[-1]
        img_bytes = io.BytesIO(np.frombuffer(cv2.imdecode(np.frombuffer(base64_decode(b64_str), np.uint8), cv2.IMREAD_COLOR)))
        annotated_out_path = os.path.join(annotated_dir, f"annotated_{base_name}")
        
        # Save decoded annotated image from OpenCV directly
        _, dec_img = cv2.imencode('.jpg', cv2.imdecode(np.frombuffer(base64_decode(b64_str), np.uint8), cv2.IMREAD_COLOR))
        with open(annotated_out_path, 'wb') as f:
            f.write(dec_img)

        targets = res['target_count']
        fog_info = res['fog_info']
        dataset_summary['total_targets_detected'] += targets

        for cat, cnt in res['category_counts'].items():
            dataset_summary['category_totals'][cat] = dataset_summary['category_totals'].get(cat, 0) + cnt

        print(f"  [+] {base_name}: {targets} targets | Fog: {fog_info['score']}% ({fog_info['level']}) | Vis: {fog_info['visibility_meters']}m | Threat: {res['threat_level']}")

        dataset_summary['items'].append({
            'filename': base_name,
            'target_count': targets,
            'category_counts': res['category_counts'],
            'fog_density_percent': fog_info['score'],
            'fog_level': fog_info['level'],
            'transmittance_tau': fog_info['transmittance_tau'],
            'visibility_meters': fog_info['visibility_meters'],
            'threat_level': res['threat_level'],
            'detections': res['detections']
        })

    summary_file = os.path.join(output_dir, "dataset_summary.json")
    with open(summary_file, 'w') as f:
        json.dump(dataset_summary, f, indent=2)

    print(f"\n==================================================")
    print(f"[SUCCESS] Dataset ZIP Processing Completed!")
    print(f"Total Images: {dataset_summary['total_images']}")
    print(f"Total Detections: {dataset_summary['total_targets_detected']}")
    print(f"Category Breakdown: {dataset_summary['category_totals']}")
    print(f"Summary Report: {summary_file}")
    print(f"Annotated Images Saved To: {annotated_dir}")
    print(f"==================================================")

    return dataset_summary

def base64_decode(b64_str):
    import base64
    return base64.b64decode(b64_str)

def create_sample_zip(zip_filename="sample_dataset.zip"):
    """
    Creates a sample ZIP archive from available sample images for quick testing.
    """
    samples_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'samples')
    if not os.path.exists(samples_dir):
        print("[!] static/samples folder not found.")
        return None

    sample_files = [f for f in os.listdir(samples_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not sample_files:
        print("[!] No sample images found to zip.")
        return None

    zip_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), zip_filename)
    with zipfile.ZipFile(zip_path, 'w') as z:
        for sf in sample_files:
            sf_path = os.path.join(samples_dir, sf)
            z.write(sf_path, arcname=sf)

    print(f"[+] Created test sample ZIP dataset: {zip_path} (Contains {len(sample_files)} images)")
    return zip_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Thermal Fog Detection ZIP Dataset Processor")
    parser.add_argument("zip_path", nargs="?", help="Path to input .ZIP dataset file")
    parser.add_argument("--mode", choices=["direct", "api"], default="direct", help="Processing mode: 'direct' (Python local) or 'api' (REST endpoint)")
    parser.add_argument("--server", default="http://127.0.0.1:5000", help="Flask REST API URL")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold")
    parser.add_argument("--output", default="dataset_output", help="Output directory")

    args = parser.parse_args()

    zip_file = args.zip_path
    if not zip_file:
        print("[*] No ZIP path specified. Generating a test dataset ZIP file...")
        zip_file = create_sample_zip("sample_dataset.zip")

    if not zip_file or not os.path.exists(zip_file):
        print(f"[!] ZIP file not found: {zip_file}")
        sys.exit(1)

    if args.mode == "api":
        process_zip_api(zip_file, server_url=args.server, conf_thresh=args.conf, iou_thresh=args.iou)
    else:
        process_zip_direct(zip_file, output_dir=args.output, conf_thresh=args.conf, iou_thresh=args.iou)
