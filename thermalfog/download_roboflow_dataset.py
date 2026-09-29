import os
import sys
import glob
import argparse

def find_dataset_zip(specified_path=None):
    """
    Finds existing ZIP dataset files in the current folder.
    """
    if specified_path and os.path.exists(specified_path):
        return specified_path

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "Thermal.v11i.yolov8.zip"),
        os.path.join(base_dir, "thermal-f4xcv.zip"),
        os.path.join(base_dir, "sample_dataset.zip")
    ]

    for c in candidates:
        if os.path.exists(c):
            return c

    # Search for any *.zip file in folder
    zip_files = glob.glob(os.path.join(base_dir, "*.zip"))
    if zip_files:
        return zip_files[0]

    return None

def download_and_process_roboflow(api_key=None, zip_path=None, version_num=11, output_dir="roboflow_dataset"):
    """
    Downloads and processes Roboflow dataset 'rsh/thermal-f4xcv'
    """
    target_zip = find_dataset_zip(zip_path)

    if api_key:
        print(f"[*] Downloading Roboflow dataset 'rsh/thermal-f4xcv' (v{version_num}) using API Key...")
        try:
            from roboflow import Roboflow
            rf = Roboflow(api_key=api_key)
            project = rf.workspace("rsh").project("thermal-f4xcv")
            version = project.version(version_num)
            dataset = version.download("yolov8")
            print(f"[+] Roboflow dataset downloaded to: {dataset.location}")

            # Look for downloaded files in location
            if os.path.isdir(dataset.location):
                print(f"[*] Extracting dataset from directory: {dataset.location}")
                # Import images into app
                from extract_to_app import extract_dataset_for_app
                extract_dataset_for_app()
                return
        except Exception as e:
            print(f"[!] Roboflow library error: {e}")
            print("[*] You can also install roboflow using: pip install roboflow")

    if not target_zip or not os.path.exists(target_zip):
        print(f"\n[!] Dataset ZIP file not found.")
        print("To process the Roboflow dataset 'thermal-f4xcv':")
        print("1. Download the ZIP file from Roboflow Universe: https://universe.roboflow.com/rsh/thermal-f4xcv")
        print("2. Place the downloaded .ZIP file in this directory:")
        print(f"   {os.path.dirname(os.path.abspath(__file__))}")
        print("3. Run: python process_zip_dataset.py <your_dataset.zip>\n")
        return

    print(f"[*] Found dataset archive: {target_zip}")
    print(f"[*] Running thermal detection & fog physics telemetry...")
    from process_zip_dataset import process_zip_direct
    process_zip_direct(target_zip, output_dir=output_dir)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Download and Process Roboflow Thermal Dataset (rsh/thermal-f4xcv)")
    parser.add_argument("--api-key", help="Your Roboflow API key (optional)")
    parser.add_argument("--zip", help="Path to input dataset .zip file")
    parser.add_argument("--version", type=int, default=11, help="Roboflow dataset version number (default: 11)")
    parser.add_argument("--output", default="roboflow_dataset", help="Output directory")

    args = parser.parse_args()
    download_and_process_roboflow(api_key=args.api_key, zip_path=args.zip, version_num=args.version, output_dir=args.output)
