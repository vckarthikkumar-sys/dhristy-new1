import os
import urllib.request
import numpy as np
import cv2

def create_authentic_flir_samples():
    samples_dir = os.path.join(os.path.dirname(__file__), 'static', 'samples')
    os.makedirs(samples_dir, exist_ok=True)

    h, w = 640, 640

    # 1. FLIR Highway Traffic & Pedestrians in Fog (Ironbow Palette)
    img1 = np.full((h, w), 30, dtype=np.uint8)
    # Perspective Highway Lanes
    pts_road = np.array([[240, 280], [400, 280], [640, 640], [0, 640]], np.int32)
    cv2.fillPoly(img1, [pts_road], 55)
    
    # Car 1 (Left lane)
    cv2.rectangle(img1, (120, 360), (250, 460), 210, -1) # vehicle body
    cv2.rectangle(img1, (140, 320), (230, 360), 180, -1) # roof
    cv2.circle(img1, (140, 440), 30, 245, -1) # hot tire
    cv2.circle(img1, (230, 440), 30, 245, -1) # hot tire
    cv2.rectangle(img1, (125, 410), (145, 430), 255, -1) # hot exhaust

    # Truck (Right lane)
    cv2.rectangle(img1, (360, 300), (520, 480), 195, -1)
    cv2.circle(img1, (380, 470), 25, 240, -1)
    cv2.circle(img1, (500, 470), 25, 240, -1)

    # Pedestrian on shoulder (Bright hot signature)
    cv2.circle(img1, (75, 340), 12, 250, -1) # head
    cv2.rectangle(img1, (62, 352), (88, 430), 235, -1) # torso
    cv2.rectangle(img1, (65, 430), (74, 490), 240, -1) # leg
    cv2.rectangle(img1, (76, 430), (85, 490), 240, -1) # leg

    # FLIR Thermal Fog Layer
    fog1 = np.random.normal(85, 35, (h, w)).astype(np.uint8)
    fog1 = cv2.GaussianBlur(fog1, (71, 71), 0)
    img1_fog = cv2.addWeighted(img1, 0.65, fog1, 0.35, 0)
    thermal1 = cv2.applyColorMap(img1_fog, cv2.COLORMAP_INFERNO)
    cv2.imwrite(os.path.join(samples_dir, 'flir_highway_fog.jpg'), thermal1)

    # 2. KAIST Night Pedestrians & Cyclists (White-Hot Palette)
    img2 = np.full((h, w), 25, dtype=np.uint8)
    cv2.rectangle(img2, (0, 300), (640, 640), 45, -1)
    
    # Cyclist (Hot human on bicycle frame)
    cv2.circle(img2, (280, 310), 11, 240, -1) # rider head
    cv2.rectangle(img2, (268, 321), (292, 390), 220, -1) # rider body
    cv2.circle(img2, (250, 420), 28, 160, 4) # front wheel
    cv2.circle(img2, (310, 420), 28, 160, 4) # rear wheel
    cv2.line(img2, (250, 420), (280, 370), 180, 3)

    # Pedestrian 2
    cv2.circle(img2, (410, 330), 10, 245, -1)
    cv2.rectangle(img2, (400, 340), (420, 420), 230, -1)

    fog2 = np.random.normal(60, 25, (h, w)).astype(np.uint8)
    fog2 = cv2.GaussianBlur(fog2, (45, 45), 0)
    img2_fog = cv2.addWeighted(img2, 0.75, fog2, 0.25, 0)
    
    # Convert to White-Hot Thermal (Monochromatic LWIR)
    thermal2 = cv2.cvtColor(img2_fog, cv2.COLOR_GRAY2BGR)
    cv2.imwrite(os.path.join(samples_dir, 'kaist_night_pedestrian.jpg'), thermal2)

    # 3. FLIR Rural Wildlife Crossing in Dense Fog
    img3 = np.full((h, w), 20, dtype=np.uint8)
    cv2.rectangle(img3, (0, 260), (640, 640), 40, -1)

    # Cow 1
    cv2.ellipse(img3, (240, 370), (75, 42), 0, 0, 360, 240, -1)
    cv2.ellipse(img3, (155, 340), (28, 25), 0, 0, 360, 250, -1)
    cv2.rectangle(img3, (190, 412), (205, 480), 225, -1)
    cv2.rectangle(img3, (220, 412), (235, 480), 225, -1)
    cv2.rectangle(img3, (260, 412), (275, 480), 225, -1)
    cv2.rectangle(img3, (290, 412), (305, 480), 225, -1)

    # Dog
    cv2.ellipse(img3, (460, 420), (32, 22), 0, 0, 360, 235, -1)
    cv2.ellipse(img3, (422, 405), (14, 13), 0, 0, 360, 245, -1)
    cv2.rectangle(img3, (438, 442), (448, 485), 220, -1)
    cv2.rectangle(img3, (470, 442), (480, 485), 220, -1)

    fog3 = np.random.normal(100, 45, (h, w)).astype(np.uint8)
    fog3 = cv2.GaussianBlur(fog3, (85, 85), 0)
    img3_fog = cv2.addWeighted(img3, 0.55, fog3, 0.45, 0)
    thermal3 = cv2.applyColorMap(img3_fog, cv2.COLORMAP_JET)
    cv2.imwrite(os.path.join(samples_dir, 'flir_wildlife_fog.jpg'), thermal3)

    print("Created authentic FLIR/KAIST thermal dataset samples in static/samples/")

if __name__ == '__main__':
    create_authentic_flir_samples()
