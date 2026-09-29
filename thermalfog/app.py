import os
import io
import time
import base64
import numpy as np
import cv2
from flask import Flask, render_template, request, jsonify, Response, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, 
            template_folder=os.path.join(BASE_DIR, 'templates'), 
            static_folder=os.path.join(BASE_DIR, 'static'))
CORS(app)

# Model Paths
MODEL_PATH_THERMAL_PT = os.path.join(BASE_DIR, 'best.pt')
MODEL_PATH_THERMAL_ONNX = os.path.join(BASE_DIR, 'best.onnx')

MODEL_PATH_GENERAL_PT = os.path.join(BASE_DIR, 'yolov8n.pt')
MODEL_PATH_GENERAL_ONNX = os.path.join(BASE_DIR, 'yolov8n.onnx')

# Global Model References
THERMAL_MODEL = None
THERMAL_ONNX_SESSION = None

GENERAL_MODEL = None
GENERAL_ONNX_SESSION = None

# SIH & Roboflow Thermal Model Classes (0: person, 1: vehicle)
THERMAL_CLASS_MAP = {
    0: ('Person', 'PEDESTRIAN'),
    1: ('Vehicle', 'VEHICLE'),
    2: ('Pedestrian', 'PEDESTRIAN'),
    3: ('Camel', 'ANIMAL'),
    4: ('Cat', 'ANIMAL'),
    5: ('Cow', 'ANIMAL'),
    6: ('Dog', 'ANIMAL'),
    7: ('Human', 'PEDESTRIAN'),
    8: ('Person', 'PEDESTRIAN')
}

# General COCO Model Classes for Vehicles & Animals
GENERAL_CLASS_MAP = {
    0: ('Person', 'PEDESTRIAN'),
    1: ('Bicycle', 'VEHICLE'),
    2: ('Car', 'VEHICLE'),
    3: ('Motorcycle', 'VEHICLE'),
    5: ('Bus', 'VEHICLE'),
    6: ('Train', 'VEHICLE'),
    7: ('Truck', 'VEHICLE'),
    14: ('Bird', 'ANIMAL'),
    15: ('Cat', 'ANIMAL'),
    16: ('Dog', 'ANIMAL'),
    17: ('Horse', 'ANIMAL'),
    18: ('Sheep', 'ANIMAL'),
    19: ('Cow', 'ANIMAL'),
    20: ('Elephant', 'ANIMAL'),
    21: ('Bear', 'ANIMAL'),
    22: ('Zebra', 'ANIMAL'),
    23: ('Giraffe', 'ANIMAL')
}

CATEGORY_CONFIG = {
    'PEDESTRIAN': {
        'label': 'Pedestrian',
        'color': '#FF2D55',
        'icon': 'fa-person-walking'
    },
    'VEHICLE': {
        'label': 'Vehicle',
        'color': '#00F0FF',
        'icon': 'fa-car'
    },
    'ANIMAL': {
        'label': 'Animal',
        'color': '#FF9500',
        'icon': 'fa-cow'
    },
    'HEAT SIGNATURE': {
        'label': 'Heat Signature',
        'color': '#AF52DE',
        'icon': 'fa-fire'
    }
}

def init_models():
    global THERMAL_MODEL, THERMAL_ONNX_SESSION, GENERAL_MODEL, GENERAL_ONNX_SESSION
    try:
        from ultralytics import YOLO
        if os.path.exists(MODEL_PATH_THERMAL_PT):
            THERMAL_MODEL = YOLO(MODEL_PATH_THERMAL_PT)
            print("[SUCCESS] Loaded Thermal PyTorch model (best.pt)")
        if os.path.exists(MODEL_PATH_GENERAL_PT):
            GENERAL_MODEL = YOLO(MODEL_PATH_GENERAL_PT)
            print("[SUCCESS] Loaded General PyTorch model (yolov8n.pt)")
    except Exception as e:
        print(f"[WARNING] PyTorch load error ({e}), loading ONNX Runtime...")

    if THERMAL_MODEL is None and os.path.exists(MODEL_PATH_THERMAL_ONNX):
        try:
            import onnxruntime as ort
            THERMAL_ONNX_SESSION = ort.InferenceSession(MODEL_PATH_THERMAL_ONNX)
            print("[SUCCESS] Loaded Thermal ONNX session (best.onnx)")
        except Exception as e:
            print(f"[ERROR] Thermal ONNX load error: {e}")

    if GENERAL_MODEL is None and os.path.exists(MODEL_PATH_GENERAL_ONNX):
        try:
            import onnxruntime as ort
            GENERAL_ONNX_SESSION = ort.InferenceSession(MODEL_PATH_GENERAL_ONNX)
            print("[SUCCESS] Loaded General ONNX session (yolov8n.onnx)")
        except Exception as e:
            print(f"[ERROR] General ONNX load error: {e}")

init_models()

def calculate_thermal_fog_telemetry(img_bgr):
    """
    Computes Thermal Infrared Fog Physics Metrics based on LWIR atmospheric scattering,
    Laplacian edge attenuation variance, and intensity dynamic range standard deviation.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # 1. Spatial Detail Blur Attenuation (Laplacian Variance)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(1.0, laplacian_var / 800.0)
    
    # 2. Thermal Contrast Dynamic Range (Standard Deviation)
    std_dev = float(np.std(gray))
    contrast_score = min(1.0, std_dev / 65.0)

    # 3. Thermal Fog Density Index F_d (0% - 100%)
    fog_density = 100.0 * (1.0 - (0.5 * blur_score + 0.5 * contrast_score))
    fog_density = max(0.0, min(100.0, fog_density))

    # 4. Thermal Transmittance Tau (0.05 - 1.0)
    tau = max(0.05, min(1.0, 1.0 - (fog_density / 100.0)))

    # 5. Estimated Infrared Visibility Range (Koschmieder Law in LWIR)
    visibility_meters = round(150.0 * (tau ** 1.2), 1)

    # 6. Classification Level
    if fog_density >= 70.0:
        level = "DENSE THERMAL FOG"
        color = "#FF3B30" # Crimson Red
    elif fog_density >= 45.0:
        level = "MODERATE THERMAL FOG"
        color = "#FF9500" # Amber
    elif fog_density >= 25.0:
        level = "LIGHT THERMAL FOG"
        color = "#00F0FF" # Cyan
    else:
        level = "CLEAR / HIGH VISIBILITY"
        color = "#34C759" # Emerald Green

    return {
        'score': round(fog_density, 1),
        'level': level,
        'color': color,
        'transmittance_tau': round(float(tau), 2),
        'visibility_meters': visibility_meters,
        'laplacian_blur': round(float(laplacian_var), 2),
        'contrast_std': round(std_dev, 2),
        'luminance_mean': round(float(np.mean(gray)), 2)
    }

def apply_thermal_enhancement(img_bgr):
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return enhanced

def apply_fog_mask_overlay(annotated_img, gray_img, fog_score):
    """
    Generates a visual Thermal Fog Density Heatmap Overlay Mask.
    """
    if fog_score < 20.0:
        return annotated_img

    h, w, _ = annotated_img.shape
    # Local variance map
    blur = cv2.GaussianBlur(gray_img, (25, 25), 0)
    diff = cv2.absdiff(gray_img, blur)
    norm_diff = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
    fog_mask = cv2.bitwise_not(norm_diff)

    # Colorize fog mask in thermal cyan/magenta palette
    fog_heatmap = cv2.applyColorMap(fog_mask, cv2.COLORMAP_CIVIDIS)
    
    alpha = min(0.35, (fog_score / 100.0) * 0.4)
    blended = cv2.addWeighted(annotated_img, 1.0 - alpha, fog_heatmap, alpha, 0)
    return blended

def run_onnx_inference(session, img_bgr, class_map, conf_thresh=0.25):
    h, w, _ = img_bgr.shape
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (640, 640))
    input_tensor = img_resized.astype(np.float32) / 255.0
    input_tensor = np.transpose(input_tensor, (2, 0, 1))
    input_tensor = np.expand_dims(input_tensor, axis=0)

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})[0]
    preds = outputs[0].T

    boxes = []
    scores = []
    class_info_list = []

    for p in preds:
        cx, cy, w_b, h_b = p[0:4]
        cls_scores = p[4:]
        best_cls = int(np.argmax(cls_scores))
        max_score = float(cls_scores[best_cls])

        if max_score >= conf_thresh and best_cls in class_map:
            scale_x = w / 640.0
            scale_y = h / 640.0
            x1 = int((cx - w_b / 2) * scale_x)
            y1 = int((cy - h_b / 2) * scale_y)
            bw = int(w_b * scale_x)
            bh = int(h_b * scale_y)
            boxes.append([x1, y1, bw, bh])
            scores.append(max_score)
            class_info_list.append(class_map[best_cls])

    return boxes, scores, class_info_list

def run_inference(img_bgr, conf_thresh=0.25, iou_thresh=0.45, enhance_fog=True, show_fog_mask=True):
    start_time = time.time()
    proc_img = img_bgr.copy()

    # Calculate Thermal Fog Physics Metrics
    fog_info = calculate_thermal_fog_telemetry(img_bgr)

    # Automatic Fog CLAHE Enhancement when fog density > 40%
    if enhance_fog or fog_info['score'] > 40.0:
        proc_img = apply_thermal_enhancement(proc_img)

    h, w, _ = proc_img.shape
    all_boxes = []
    all_scores = []
    all_meta = []

    # 1. Thermal SIH Model Inference
    if THERMAL_MODEL is not None:
        res = THERMAL_MODEL.predict(source=proc_img, conf=conf_thresh, iou=iou_thresh, verbose=False)[0]
        for box in res.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            name, cat = THERMAL_CLASS_MAP.get(cls_id, ('Object', 'HEAT SIGNATURE'))
            all_boxes.append([x1, y1, x2 - x1, y2 - y1])
            all_scores.append(conf)
            all_meta.append((name, cat))
    elif THERMAL_ONNX_SESSION is not None:
        bxs, scs, metas = run_onnx_inference(THERMAL_ONNX_SESSION, proc_img, THERMAL_CLASS_MAP, conf_thresh)
        all_boxes.extend(bxs)
        all_scores.extend(scs)
        all_meta.extend(metas)

    # 2. General Object Model Inference
    if GENERAL_MODEL is not None:
        res = GENERAL_MODEL.predict(source=proc_img, conf=conf_thresh, iou=iou_thresh, verbose=False)[0]
        for box in res.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            if cls_id in GENERAL_CLASS_MAP:
                name, cat = GENERAL_CLASS_MAP[cls_id]
                all_boxes.append([x1, y1, x2 - x1, y2 - y1])
                all_scores.append(conf)
                all_meta.append((name, cat))
    elif GENERAL_ONNX_SESSION is not None:
        bxs, scs, metas = run_onnx_inference(GENERAL_ONNX_SESSION, proc_img, GENERAL_CLASS_MAP, conf_thresh)
        all_boxes.extend(bxs)
        all_scores.extend(scs)
        all_meta.extend(metas)

    indices = cv2.dnn.NMSBoxes(all_boxes, all_scores, conf_thresh, iou_thresh)
    
    detections = []
    annotated_img = proc_img.copy()

    # Apply Fog Heatmap Mask Overlay FIRST so boxes and text are drawn sharply on top
    if show_fog_mask and fog_info['score'] > 30.0:
        gray_orig = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        annotated_img = apply_fog_mask_overlay(annotated_img, gray_orig, fog_info['score'])

    cat_counts = {
        'PEDESTRIAN': 0,
        'VEHICLE': 0,
        'ANIMAL': 0,
        'HEAT SIGNATURE': 0
    }

    if len(indices) > 0:
        for idx in indices.flatten():
            box = all_boxes[idx]
            x1, y1, bw, bh = box
            
            # Skip dummy background boxes (e.g. >= 35% total image area)
            if (bw * bh) >= 0.35 * (w * h):
                continue

            x2 = x1 + bw
            y2 = y1 + bh
            conf = all_scores[idx]
            name, cat = all_meta[idx]

            cfg = CATEGORY_CONFIG.get(cat, CATEGORY_CONFIG['HEAT SIGNATURE'])
            color_hex = cfg['color']
            color_bgr = tuple(int(color_hex.lstrip('#')[i:i+2], 16) for i in (4, 2, 0))

            cat_counts[cat] = cat_counts.get(cat, 0) + 1

            detections.append({
                'id': len(detections) + 1,
                'category': cat,
                'class_name': name,
                'confidence': round(conf, 3),
                'bbox': [x1, y1, x2, y2],
                'color': color_hex,
                'icon': cfg['icon']
            })

            # Draw Crisp Bounding Box Rectangle (Square Frame) & Corner HUD Accents
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color_bgr, 3)
            l_len = min(18, max(6, bw // 4), max(6, bh // 4))
            cv2.line(annotated_img, (x1, y1), (x1 + l_len, y1), color_bgr, 4)
            cv2.line(annotated_img, (x1, y1), (x1, y1 + l_len), color_bgr, 4)
            cv2.line(annotated_img, (x2, y1), (x2 - l_len, y1), color_bgr, 4)
            cv2.line(annotated_img, (x2, y1), (x2, y1 + l_len), color_bgr, 4)
            cv2.line(annotated_img, (x1, y2), (x1 + l_len, y2), color_bgr, 4)
            cv2.line(annotated_img, (x1, y2), (x1, y2 - l_len), color_bgr, 4)
            cv2.line(annotated_img, (x2, y2), (x2 - l_len, y2), color_bgr, 4)
            cv2.line(annotated_img, (x2, y2), (x2, y2 - l_len), color_bgr, 4)

            label = f"[{cat}] {name} {int(conf*100)}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(annotated_img, (x1, max(0, y1 - 24)), (x1 + tw + 10, y1), color_bgr, -1)
            cv2.putText(annotated_img, label, (x1 + 5, max(14, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2, cv2.LINE_AA)

    # Top HUD Banner: Thermal Fog Telemetry
    fog_banner = f"THERMAL FOG: {fog_info['score']}% ({fog_info['level']}) | Transmittance tau: {fog_info['transmittance_tau']} | Vis Range: {fog_info['visibility_meters']}m"
    fog_banner_color = tuple(int(fog_info['color'].lstrip('#')[i:i+2], 16) for i in (4, 2, 0))
    cv2.rectangle(annotated_img, (0, 0), (w, 26), (0, 0, 0), -1)
    cv2.putText(annotated_img, fog_banner, (10, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, fog_banner_color, 1, cv2.LINE_AA)

    elapsed_ms = round((time.time() - start_time) * 1000, 1)

    # Threat Assessment
    num_targets = len(detections)
    if cat_counts['PEDESTRIAN'] > 0 or fog_info['score'] >= 70.0:
        threat_level = "HIGH HAZARD ALERT"
        threat_color = "#FF3B30"
    elif num_targets >= 1 or fog_info['score'] >= 45.0:
        threat_level = "CAUTION: HAZARD AHEAD"
        threat_color = "#FF9500"
    else:
        threat_level = "PATH CLEAR"
        threat_color = "#34C759"

    _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    _, raw_buffer = cv2.imencode('.jpg', proc_img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    raw_b64 = base64.b64encode(raw_buffer).decode('utf-8')

    return {
        'detections': detections,
        'target_count': len(detections),
        'category_counts': cat_counts,
        'inference_time_ms': elapsed_ms,
        'fog_info': fog_info,
        'threat_level': threat_level,
        'threat_color': threat_color,
        'annotated_image': f"data:image/jpeg;base64,{img_b64}",
        'raw_image': f"data:image/jpeg;base64,{raw_b64}"
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def api_status():
    engine_name = "PyTorch YOLOv8" if (THERMAL_MODEL or GENERAL_MODEL) else ("ONNX Runtime" if (THERMAL_ONNX_SESSION or GENERAL_ONNX_SESSION) else "YOLOv8 Engine")
    classes_list = {k: v[0] for k, v in THERMAL_CLASS_MAP.items()}
    return jsonify({
        'status': 'online',
        'engine': engine_name,
        'classes': classes_list,
        'models_loaded': {
            'thermal_model': THERMAL_MODEL is not None or THERMAL_ONNX_SESSION is not None,
            'general_model': GENERAL_MODEL is not None or GENERAL_ONNX_SESSION is not None
        },
        'categories': CATEGORY_CONFIG
    })

@app.route('/api/samples', methods=['GET'])
def api_samples():
    samples = [
        {
            'id': 'flir1',
            'title': 'FLIR Highway Traffic & Fog',
            'dataset': 'FLIR Thermal LWIR Benchmark',
            'filename': 'flir_highway_fog.jpg',
            'url': '/static/samples/flir_highway_fog.jpg',
            'desc': 'Real FLIR Thermal LWIR highway image with vehicles, trucks, and pedestrians in fog'
        },
        {
            'id': 'kaist1',
            'title': 'KAIST Night Cyclist & Fog',
            'dataset': 'KAIST Multispectral Dataset',
            'filename': 'kaist_night_pedestrian.jpg',
            'url': '/static/samples/kaist_night_pedestrian.jpg',
            'desc': 'KAIST White-Hot thermal infrared night vision with pedestrians and cyclists'
        },
        {
            'id': 'flir2',
            'title': 'FLIR Wildlife Thermal Fog',
            'dataset': 'Teledyne FLIR Infrared',
            'filename': 'flir_wildlife_fog.jpg',
            'url': '/static/samples/flir_wildlife_fog.jpg',
            'desc': 'FLIR thermal image of cattle and wildlife on rural road in heavy fog'
        },
        {
            'id': 'sih1',
            'title': 'SIH Pedestrian Fog Scenario',
            'dataset': 'SIH Thermal Benchmark',
            'filename': 'sample_pedestrian_fog.jpg',
            'url': '/static/samples/sample_pedestrian_fog.jpg',
            'desc': 'Pedestrians crossing roadway in moderate thermal fog condition'
        },
        {
            'id': 'sih2',
            'title': 'Zero Visibility Heat Sensor',
            'dataset': 'LWIR Infrared Sensor',
            'filename': 'sample_dense_fog_heat.jpg',
            'url': '/static/samples/sample_dense_fog_heat.jpg',
            'desc': 'Heavy fog obstacle detection using raw infrared heat intensity'
        }
    ]

    # Dynamically scan custom uploaded dataset folder (e.g. Roboflow dataset)
    custom_dir = os.path.join(app.static_folder, 'samples', 'custom')
    if os.path.exists(custom_dir):
        limit = request.args.get('limit', type=int) or 60
        search = request.args.get('search', type=str, default='').lower()
        
        count = 0
        all_custom = sorted(os.listdir(custom_dir))
        for fname in all_custom:
            if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                if search and search not in fname.lower():
                    continue
                samples.append({
                    'id': f'custom_{fname}',
                    'title': f'Roboflow: {fname[:24]}...',
                    'dataset': 'Roboflow Thermal Dataset (rsh/thermal-f4xcv)',
                    'filename': f'custom/{fname}',
                    'url': f'/static/samples/custom/{fname}',
                    'desc': f'Uploaded thermal dataset frame {fname}'
                })
                count += 1
                if count >= limit:
                    break

    return jsonify(samples)

import zipfile

@app.route('/api/upload_dataset', methods=['POST'])
def api_upload_dataset():
    custom_dir = os.path.join(app.static_folder, 'samples', 'custom')
    os.makedirs(custom_dir, exist_ok=True)
    uploaded_files = []

    if 'dataset_zip' in request.files:
        zip_file = request.files['dataset_zip']
        try:
            with zipfile.ZipFile(io.BytesIO(zip_file.read()), 'r') as z:
                for fname in z.namelist():
                    if fname.lower().endswith(('.jpg', '.jpeg', '.png')) and not fname.startswith('__MACOSX'):
                        filename = os.path.basename(fname)
                        if filename:
                            out_path = os.path.join(custom_dir, filename)
                            with open(out_path, 'wb') as f:
                                f.write(z.read(fname))
                            uploaded_files.append(filename)
        except Exception as e:
            return jsonify({'error': f'Failed to extract ZIP dataset: {e}'}), 400

    elif 'images' in request.files:
        files = request.files.getlist('images')
        for f in files:
            if f.filename:
                filename = os.path.basename(f.filename)
                out_path = os.path.join(custom_dir, filename)
                f.save(out_path)
                uploaded_files.append(filename)

    return jsonify({
        'status': 'success',
        'message': f'Successfully imported {len(uploaded_files)} dataset samples',
        'files': uploaded_files
    })

@app.route('/api/detect', methods=['POST'])
def api_detect():
    data = request.get_json(silent=True) or {}
    form = request.form or {}

    conf_thresh = float(data.get('conf_threshold') or form.get('conf_threshold') or 0.25)
    iou_thresh = float(data.get('iou_threshold') or form.get('iou_threshold') or 0.45)
    
    enhance_fog_val = data.get('enhance_fog') if 'enhance_fog' in data else form.get('enhance_fog')
    enhance_fog = str(enhance_fog_val).lower() == 'true' if enhance_fog_val is not None else True

    show_fog_mask_val = data.get('show_fog_mask') if 'show_fog_mask' in data else form.get('show_fog_mask')
    show_fog_mask = str(show_fog_mask_val).lower() == 'true' if show_fog_mask_val is not None else True

    sample_filename = data.get('sample_path') or form.get('sample_path')
    img_bgr = None

    if 'image' in request.files:
        file = request.files['image']
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img_bgr = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
    elif 'image_b64' in data or 'image_b64' in form:
        b64_str = data.get('image_b64') or form.get('image_b64')
        b64_data = b64_str.split(',')[-1]
        img_bytes = base64.b64decode(b64_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif sample_filename:
        full_path = os.path.join(app.static_folder, 'samples', sample_filename)
        img_bgr = cv2.imread(full_path)
    else:
        return jsonify({'error': 'No image input provided'}), 400

    if img_bgr is None:
        return jsonify({'error': 'Failed to decode image'}), 400

    res = run_inference(img_bgr, conf_thresh, iou_thresh, enhance_fog, show_fog_mask)
    return jsonify(res)

if __name__ == '__main__':
    print("Starting Thermal Fog Detection Server on http://127.0.0.1:5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
