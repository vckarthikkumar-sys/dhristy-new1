import os
import numpy as np
import cv2

def apply_thermal_colormap(gray):
    # Apply INFERNO or JET or IRONBOW colormap for realistic thermal look
    thermal = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
    return thermal

def generate_sample_images():
    samples_dir = os.path.join(os.path.dirname(__file__), 'static', 'samples')
    os.makedirs(samples_dir, exist_ok=True)

    h, w = 640, 640

    # Sample 1: Pedestrian crossing in moderate thermal fog
    img1 = np.full((h, w), 40, dtype=np.uint8) # dark cold background
    # Add road gradient
    cv2.rectangle(img1, (0, 300), (640, 640), 60, -1)
    # Add human silhouettes (bright hot signatures 200-255)
    # Human 1 (center)
    cv2.ellipse(img1, (300, 320), (12, 12), 0, 0, 360, 240, -1) # Head
    cv2.rectangle(img1, (285, 332), (315, 450), 220, -1) # Body
    cv2.rectangle(img1, (288, 450), (300, 520), 230, -1) # Leg 1
    cv2.rectangle(img1, (300, 450), (312, 520), 230, -1) # Leg 2
    
    # Human 2 (side)
    cv2.ellipse(img1, (450, 340), (10, 10), 0, 0, 360, 230, -1)
    cv2.rectangle(img1, (438, 350), (462, 440), 210, -1)
    cv2.rectangle(img1, (440, 440), (450, 490), 220, -1)
    cv2.rectangle(img1, (452, 440), (462, 490), 220, -1)

    # Add Gaussian Fog layer
    fog1 = np.random.normal(70, 30, (h, w)).astype(np.uint8)
    fog1 = cv2.GaussianBlur(fog1, (51, 51), 0)
    img1_fog = cv2.addWeighted(img1, 0.7, fog1, 0.3, 0)
    
    thermal1 = apply_thermal_colormap(img1_fog)
    cv2.imwrite(os.path.join(samples_dir, 'sample_pedestrian_fog.jpg'), thermal1)

    # Sample 2: Cow / Animal on road in dense thermal fog
    img2 = np.full((h, w), 35, dtype=np.uint8)
    cv2.rectangle(img2, (0, 280), (640, 640), 55, -1)
    # Cow silhouette
    cv2.ellipse(img2, (250, 380), (70, 40), 0, 0, 360, 235, -1) # body
    cv2.ellipse(img2, (170, 350), (25, 25), 0, 0, 360, 245, -1) # head
    cv2.rectangle(img2, (200, 420), (215, 490), 220, -1) # legs
    cv2.rectangle(img2, (230, 420), (245, 490), 220, -1)
    cv2.rectangle(img2, (270, 420), (285, 490), 220, -1)
    cv2.rectangle(img2, (300, 420), (315, 490), 220, -1)

    # Dog silhouette
    cv2.ellipse(img2, (480, 430), (30, 20), 0, 0, 360, 240, -1)
    cv2.ellipse(img2, (445, 415), (12, 12), 0, 0, 360, 250, -1)

    fog2 = np.random.normal(90, 40, (h, w)).astype(np.uint8)
    fog2 = cv2.GaussianBlur(fog2, (71, 71), 0)
    img2_fog = cv2.addWeighted(img2, 0.6, fog2, 0.4, 0)

    thermal2 = apply_thermal_colormap(img2_fog)
    cv2.imwrite(os.path.join(samples_dir, 'sample_animals_fog.jpg'), thermal2)

    # Sample 3: Multiple heat targets in zero visibility fog
    img3 = np.full((h, w), 50, dtype=np.uint8)
    cv2.ellipse(img3, (180, 330), (14, 14), 0, 0, 360, 255, -1)
    cv2.rectangle(img3, (165, 344), (195, 460), 235, -1)
    
    cv2.ellipse(img3, (380, 350), (12, 12), 0, 0, 360, 250, -1)
    cv2.rectangle(img3, (368, 362), (392, 470), 230, -1)

    fog3 = np.random.normal(110, 50, (h, w)).astype(np.uint8)
    fog3 = cv2.GaussianBlur(fog3, (91, 91), 0)
    img3_fog = cv2.addWeighted(img3, 0.5, fog3, 0.5, 0)

    thermal3 = apply_thermal_colormap(img3_fog)
    cv2.imwrite(os.path.join(samples_dir, 'sample_dense_fog_heat.jpg'), thermal3)

    print("Generated thermal fog samples successfully in:", samples_dir)

if __name__ == '__main__':
    generate_sample_images()
