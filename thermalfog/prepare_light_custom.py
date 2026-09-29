import os

def trim_custom_for_vercel(keep_count=30):
    custom_dir = os.path.join(os.path.dirname(__file__), 'static', 'samples', 'custom')
    if not os.path.exists(custom_dir):
        return

    files = sorted([f for f in os.listdir(custom_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    if len(files) <= keep_count:
        return

    to_remove = files[keep_count:]
    for f in to_remove:
        try:
            os.remove(os.path.join(custom_dir, f))
        except Exception:
            pass

    print(f"[+] Cleaned static/samples/custom: kept {keep_count} samples (removed {len(to_remove)} for Vercel 250MB limit)")

if __name__ == '__main__':
    trim_custom_for_vercel()
