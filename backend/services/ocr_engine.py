from rapidocr import RapidOCR
from rapid_table import RapidTable
import os
import traceback
import cv2

class InventoryExtractor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InventoryExtractor, cls).__new__(cls)
            cls._instance.ocr = RapidOCR()
            cls._instance.table_engine = RapidTable()
        return cls._instance

    def extract_table(self, image_path: str):
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")

            # Validate image loads successfully with OpenCV
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Failed to decode image at {image_path} with cv2")
            print(f"DEBUG Image Shape: {img.shape}")

            # 1. OCR text detection using modern unified rapidocr
            res = self.ocr(image_path)
            
            # If no text is found, res.boxes is None
            if res.boxes is None or len(res.boxes) == 0:
                return {"html_structure": "", "raw_cells": []}

            # rapid-table strictly expects a List of Tuples containing (bboxes, texts, scores)
            formatted_ocr_result = [(res.boxes, res.txts, res.scores)]

            # 2. Table structure recognition
            table_res = self.table_engine(image_path, formatted_ocr_result)
            table_html = table_res.pred_htmls[0]

            rows = []
            for poly, text, conf in zip(res.boxes, res.txts, res.scores):
                x_coords = [pt[0] for pt in poly]
                y_coords = [pt[1] for pt in poly]
                min_x, max_x = min(x_coords), max(x_coords)
                min_y, max_y = min(y_coords), max(y_coords)
                
                rows.append({
                    "text": text,
                    "confidence": float(conf),
                    "bbox": [float(min_x), float(min_y), float(max_x), float(max_y)]
                })

            return {
                "html_structure": table_html,
                "raw_cells": rows
            }
        except Exception as e:
            traceback.print_exc()
            raise e

extractor = InventoryExtractor()
