import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from services.image_processor import preprocess_receipt
from services.ocr_engine import extractor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

def _process_image_sync(temp_path: str):
    preprocessed_path = None
    try:
        preprocessed_path = preprocess_receipt(temp_path)
        result = extractor.extract_table(preprocessed_path)
        return result
    finally:
        # Guarantee cleanup of both temp files even if exceptions occur
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        if preprocessed_path and os.path.exists(preprocessed_path):
            try:
                os.remove(preprocessed_path)
            except:
                pass

@app.post('/api/extract-receipt')
async def process_ocr(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail='No file uploaded')

    temp_dir = os.path.join(os.getcwd(), 'temp')
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir, exist_ok=True)
        
    temp_path = os.path.join(temp_dir, f'raw_{file.filename}')
    
    try:
        contents = await file.read()
        with open(temp_path, 'wb') as f:
            f.write(contents)

        if os.path.getsize(temp_path) == 0:
            raise ValueError("Uploaded file is empty")

        # Offload CPU-bound inference to threadpool to avoid blocking ASGI loop
        result = await run_in_threadpool(_process_image_sync, temp_path)
        return result
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        # Force the exact exception string back to the frontend for debugging
        raise HTTPException(status_code=500, detail=str(e))
