import cv2
import numpy as np
import os
import tempfile

def preprocess_receipt(image_path: str) -> str:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")
        
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"OpenCV failed to decode image: {image_path}. Size: {os.path.getsize(image_path)} bytes")
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    inv = cv2.bitwise_not(binary)
    kernel = np.ones((2, 2), np.uint8)
    dilated = cv2.dilate(inv, kernel, iterations=1)
    
    result = cv2.bitwise_not(dilated)
    
    temp_dir = tempfile.gettempdir()
    base_name = os.path.basename(image_path)
    temp_path = os.path.join(temp_dir, f"preprocessed_{base_name}")
    
    cv2.imwrite(temp_path, result)
    
    return temp_path
