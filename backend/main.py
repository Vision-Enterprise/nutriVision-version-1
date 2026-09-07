import os
import io
import time
import uuid
import socket
from typing import Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

from services.image_processor import preprocess_receipt
from services.ocr_engine import extractor

app = FastAPI(title="NutriVision API & Mobile Companion")

# Enable CORS for all local development and LAN connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ---------------------------------------------------------------------------
# Static File Mounting for 100% Offline Libraries
# ---------------------------------------------------------------------------
current_dir = os.path.dirname(os.path.abspath(__file__))
possible_asset_paths = [
    os.path.abspath(os.path.join(current_dir, "..", "src", "assets")),
    os.path.abspath(os.path.join(os.getcwd(), "src", "assets")),
    os.path.abspath(os.path.join(current_dir, "src", "assets")),
]

assets_dir = None
for candidate in possible_asset_paths:
    if os.path.exists(candidate):
        assets_dir = candidate
        break

if not assets_dir:
    assets_dir = os.path.abspath(os.path.join(current_dir, "..", "src", "assets"))
    os.makedirs(assets_dir, exist_ok=True)

# Ensure libs directory exists
libs_dir = os.path.join(assets_dir, "libs")
os.makedirs(libs_dir, exist_ok=True)

app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# ---------------------------------------------------------------------------
# Network Helper: Detect Laptop Local Wi-Fi IPv4 Address
# ---------------------------------------------------------------------------
def get_local_ip() -> str:
    """Find the laptop's actual local IPv4 address on the Wi-Fi/LAN network using a dummy UDP socket."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Connect to a non-routable address; doesn't transmit actual packets
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# ---------------------------------------------------------------------------
# In-Memory Mobile Sessions State
# ---------------------------------------------------------------------------
mobile_sessions: Dict[str, Dict[str, Any]] = {}

def get_temp_dir() -> str:
    temp_dir = os.path.join(current_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    return temp_dir

# ---------------------------------------------------------------------------
# Existing OCR Processing Logic
# ---------------------------------------------------------------------------
def _process_image_sync(temp_path: str):
    preprocessed_path = None
    try:
        preprocessed_path = preprocess_receipt(temp_path)
        result = extractor.extract_table(preprocessed_path)
        return result
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        if preprocessed_path and os.path.exists(preprocessed_path):
            try:
                os.remove(preprocessed_path)
            except Exception:
                pass

@app.post('/api/extract-receipt')
async def process_ocr(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail='No file uploaded')

    temp_dir = get_temp_dir()
    temp_path = os.path.join(temp_dir, f'raw_{int(time.time())}_{file.filename}')
    
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
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------------------------
# Mobile QR Companion Endpoints
# ---------------------------------------------------------------------------

@app.get('/api/mobile/create-session')
def create_mobile_session():
    """Generates a unique session_id, creates a dedicated temp directory, and returns the upload URL."""
    session_id = uuid.uuid4().hex[:8]
    session_dir = os.path.join(get_temp_dir(), session_id)
    os.makedirs(session_dir, exist_ok=True)

    local_ip = get_local_ip()
    upload_url = f"http://{local_ip}:8000/api/mobile/upload-page/{session_id}"

    mobile_sessions[session_id] = {
        "status": "waiting",
        "image_count": 0,
        "latest_image_name": None,
        "latest_image_path": None,
        "latest_image_url": None,
        "created_at": time.time(),
        "local_ip": local_ip
    }

    return {
        "session_id": session_id,
        "upload_url": upload_url,
        "local_ip": local_ip
    }

@app.post('/api/mobile/upload/{session_id}')
async def upload_mobile_image(session_id: str, file: UploadFile = File(...)):
    """Accepts cropped image from mobile phone, saves to session directory, and marks ready."""
    session = mobile_sessions.get(session_id)
    if not session:
        session_dir = os.path.join(get_temp_dir(), session_id)
        os.makedirs(session_dir, exist_ok=True)
        session = {
            "status": "waiting",
            "image_count": 0,
            "latest_image_name": None,
            "latest_image_path": None,
            "latest_image_url": None,
            "created_at": time.time(),
            "local_ip": get_local_ip()
        }
        mobile_sessions[session_id] = session

    session_dir = os.path.join(get_temp_dir(), session_id)
    os.makedirs(session_dir, exist_ok=True)

    count = session["image_count"] + 1
    safe_filename = f"receipt_{count}_{int(time.time())}.jpg"
    file_path = os.path.join(session_dir, safe_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    session["status"] = "ready"
    session["image_count"] = count
    session["latest_image_name"] = safe_filename
    session["latest_image_path"] = file_path
    session["latest_image_url"] = f"/api/mobile/image/{session_id}/{safe_filename}"

    return {
        "success": True,
        "session_id": session_id,
        "image_count": count,
        "latest_image_url": session["latest_image_url"]
    }

@app.get('/api/mobile/status/{session_id}')
def get_mobile_status(session_id: str):
    """Returns the current session status, image count, and latest image URL."""
    session = mobile_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "status": session["status"],
        "image_count": session["image_count"],
        "latest_image_url": session.get("latest_image_url"),
        "has_new": session["status"] == "ready"
    }

@app.post('/api/mobile/consume/{session_id}')
def consume_mobile_status(session_id: str):
    """Marks the latest image as consumed by the desktop terminal so polling doesn't duplicate."""
    session = mobile_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session["status"] = "waiting"
    return {"success": True, "status": "waiting"}

@app.get('/api/mobile/image/{session_id}/{filename}')
def get_mobile_image(session_id: str, filename: str):
    """Serves the uploaded mobile receipt image to the desktop client."""
    file_path = os.path.join(get_temp_dir(), session_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")
    return FileResponse(file_path, media_type="image/jpeg")

# ---------------------------------------------------------------------------
# Mobile Web App Companion UI (GET /api/mobile/upload-page/{session_id})
# ---------------------------------------------------------------------------

@app.get('/api/mobile/upload-page/{session_id}', response_class=HTMLResponse)
def render_mobile_upload_page(session_id: str):
    """Delivers a responsive Material Design 3 mobile web companion matching the NutriVision theme."""
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>NutriVision Scanner</title>
  <!-- 100% Offline Local Cropper.js Assets (Zero External CDNs) -->
  <link rel="stylesheet" href="/assets/libs/cropper.min.css" />
  <script src="/assets/libs/cropper.min.js"></script>
  <style>
    :root {{
      /* Material Design 3 / NutriVision Brand Tokens */
      --md-sys-color-primary: #1B7A3E;
      --md-sys-color-primary-dark: #0E5C2C;
      --md-sys-color-primary-light: #3FA65B;
      --md-sys-color-primary-container: #E8F5E9;
      --md-sys-color-on-primary: #FFFFFF;
      --md-sys-color-on-primary-container: #0E5C2C;
      
      --md-sys-color-surface: #FFFFFF;
      --md-sys-color-surface-dim: #F4FBF7;
      --md-sys-color-surface-container: #EDFBF4;
      --md-sys-color-surface-container-high: #E8F5EE;
      --md-sys-color-outline: #D8E6DA;
      --md-sys-color-outline-variant: #B2C9B5;
      
      --md-sys-color-on-surface: #1A2B1C;
      --md-sys-color-on-surface-variant: #5A7060;
      
      --md-sys-shape-corner-small: 8px;
      --md-sys-shape-corner-medium: 14px;
      --md-sys-shape-corner-large: 20px;
      --md-sys-shape-corner-extra-large: 28px;
      --md-sys-shape-corner-full: 9999px;
      
      --md-elevation-1: 0 1px 3px rgba(27, 122, 62, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
      --md-elevation-2: 0 3px 8px rgba(27, 122, 62, 0.12), 0 2px 4px rgba(0, 0, 0, 0.04);
      --md-elevation-3: 0 6px 18px rgba(27, 122, 62, 0.14), 0 3px 6px rgba(0, 0, 0, 0.06);
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }}

    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }}

    /* MD3 Top App Bar */
    .top-app-bar {{
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--md-elevation-1);
    }}

    .brand-section {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .brand-logo-img {{
      height: 34px;
      width: auto;
      max-width: 120px;
      object-fit: contain;
      display: block;
    }}

    .brand-title-wrap {{
      display: flex;
      flex-direction: column;
    }}

    .brand-title {{
      font-size: 16px;
      font-weight: 700;
      color: var(--md-sys-color-primary-dark);
      letter-spacing: -0.2px;
      line-height: 1.2;
    }}

    .brand-subtitle {{
      font-size: 11px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      letter-spacing: 0.2px;
    }}

    /* MD3 Assist Chip */
    .session-chip {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-primary-dark);
      border: 1px solid var(--md-sys-color-outline-variant);
      padding: 5px 10px;
      border-radius: var(--md-sys-shape-corner-small);
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
    }}

    .chip-indicator {{
      width: 7px;
      height: 7px;
      background: var(--md-sys-color-primary);
      border-radius: 50%;
    }}

    /* Content Area */
    .main-container {{
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px;
      max-width: 480px;
      margin: 0 auto;
      width: 100%;
    }}

    /* MD3 Card */
    .md-card {{
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      border-radius: var(--md-sys-shape-corner-extra-large);
      padding: 32px 24px;
      box-shadow: var(--md-elevation-2);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 100%;
    }}

    /* STAGE 1: Launchpad */
    #stage-launchpad {{
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: mdFadeIn 0.25s ease-out;
    }}

    .camera-avatar-ring {{
      width: 88px;
      height: 88px;
      background: var(--md-sys-color-primary-container);
      border: 2px solid var(--md-sys-color-primary-light);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: var(--md-sys-color-primary);
      box-shadow: 0 4px 12px rgba(27, 122, 62, 0.12);
    }}

    .headline-medium {{
      font-size: 20px;
      font-weight: 700;
      color: var(--md-sys-color-on-surface);
      margin-bottom: 8px;
    }}

    .body-medium {{
      font-size: 14px;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.5;
      margin-bottom: 28px;
    }}

    /* MD3 Buttons */
    .btn-filled {{
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-on-primary);
      border: none;
      border-radius: var(--md-sys-shape-corner-full);
      padding: 16px 28px;
      font-size: 16px;
      font-weight: 600;
      width: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 3px 10px rgba(27, 122, 62, 0.3);
      transition: background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
    }}

    .btn-filled:active {{
      background: var(--md-sys-color-primary-dark);
      transform: scale(0.98);
      box-shadow: 0 1px 4px rgba(27, 122, 62, 0.2);
    }}

    .btn-outlined {{
      background: transparent;
      color: var(--md-sys-color-primary);
      border: 1.5px solid var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-full);
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background-color 0.15s ease;
    }}

    .btn-outlined:active {{
      background: var(--md-sys-color-primary-container);
    }}

    .helper-tip {{
      margin-top: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--md-sys-color-on-surface-variant);
      font-size: 12px;
      line-height: 1.4;
      background: var(--md-sys-color-surface-dim);
      padding: 10px 14px;
      border-radius: var(--md-sys-shape-corner-medium);
      border: 1px solid var(--md-sys-color-outline);
    }}

    /* STAGE 3: Cropping Studio */
    #stage-cropping {{
      display: none;
      flex-direction: column;
      flex: 1;
      animation: mdFadeIn 0.25s ease-out;
    }}

    .cropper-container-wrapper {{
      flex: 1;
      min-height: 380px;
      max-height: 58vh;
      background: #000;
      border-radius: var(--md-sys-shape-corner-large);
      overflow: hidden;
      border: 1px solid var(--md-sys-color-outline);
      box-shadow: var(--md-elevation-1);
      position: relative;
    }}

    .crop-target-img {{
      max-width: 100%;
      display: block;
    }}

    /* MD3 Segmented / Tonal Toolbar */
    .tool-bar {{
      display: flex;
      justify-content: center;
      gap: 8px;
      margin: 12px 0;
    }}

    .tool-button {{
      background: var(--md-sys-color-surface);
      border: 1px solid var(--md-sys-color-outline);
      color: var(--md-sys-color-on-surface);
      padding: 8px 14px;
      border-radius: var(--md-sys-shape-corner-medium);
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: var(--md-elevation-1);
    }}

    .tool-button:active {{
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-primary-dark);
    }}

    .crop-actions-group {{
      display: flex;
      gap: 12px;
      margin-top: auto;
      padding-top: 8px;
    }}

    /* STAGE 4: Success Screen */
    #stage-success {{
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      animation: mdFadeIn 0.25s ease-out;
    }}

    .success-icon-badge {{
      width: 80px;
      height: 80px;
      background: var(--md-sys-color-primary-container);
      border: 2.5px solid var(--md-sys-color-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-primary);
      margin-bottom: 20px;
      box-shadow: 0 4px 14px rgba(27, 122, 62, 0.16);
      animation: mdScaleBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }}

    .count-indicator {{
      background: var(--md-sys-color-surface-dim);
      border: 1px solid var(--md-sys-color-outline);
      color: var(--md-sys-color-primary-dark);
      padding: 6px 14px;
      border-radius: var(--md-sys-shape-corner-full);
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 26px;
    }}

    /* Spinner */
    .md-spinner {{
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid #ffffff;
      border-radius: 50%;
      animation: mdSpin 0.8s linear infinite;
    }}

    @keyframes mdSpin {{
      to {{ transform: rotate(360deg); }}
    }}

    @keyframes mdFadeIn {{
      from {{ opacity: 0; transform: translateY(6px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}

    @keyframes mdScaleBounce {{
      0% {{ transform: scale(0.4); opacity: 0; }}
      70% {{ transform: scale(1.08); }}
      100% {{ transform: scale(1); opacity: 1; }}
    }}
  </style>
</head>
<body>

  <!-- Top App Bar with NutriVision Logo & Title -->
  <header class="top-app-bar">
    <div class="brand-section">
      <img src="/assets/logo.png" alt="NutriVision" class="brand-logo-img" onerror="this.style.display='none';" />
      <div class="brand-title-wrap">
        <span class="brand-title">NutriVision Scanner</span>
        <span class="brand-subtitle">Mobile Receipt Intake</span>
      </div>
    </div>
    <div class="session-chip" title="Active Connection Session">
      <span class="chip-indicator"></span>
      <span>#{session_id}</span>
    </div>
  </header>

  <!-- Native Hardware Camera Trigger -->
  <input type="file" id="mobile-file-input" accept="image/*" capture="environment" style="display:none;" />

  <main class="main-container">

    <!-- STAGE 1: Launchpad -->
    <section id="stage-launchpad">
      <div class="md-card">
        <div class="camera-avatar-ring">
          <!-- Vector Camera Icon (No Emojis) -->
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
        <h2 class="headline-medium">Ready to Scan</h2>
        <p class="body-medium">
          Place delivery receipt on a flat surface with good lighting for clear table extraction.
        </p>
        <button class="btn-filled" id="btn-open-camera">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>Snap Receipt</span>
        </button>
        <div class="helper-tip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Uses native camera autofocus and flash for optimal OCR clarity.</span>
        </div>
      </div>
    </section>

    <!-- STAGE 3: Cropping Studio -->
    <section id="stage-cropping">
      <div class="cropper-container-wrapper">
        <img id="crop-target-img" class="crop-target-img" alt="Receipt Preview" />
      </div>

      <!-- Toolbar with Vector Icons -->
      <div class="tool-bar">
        <button class="tool-button" id="btn-rot-left" title="Rotate Left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Rotate Left</span>
        </button>
        <button class="tool-button" id="btn-rot-right" title="Rotate Right">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          <span>Rotate Right</span>
        </button>
        <button class="tool-button" id="btn-reset-crop" title="Reset Bounds">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
            <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
          </svg>
          <span>Reset</span>
        </button>
      </div>

      <div class="crop-actions-group">
        <button class="btn-outlined" id="btn-retake-photo" style="flex: 1;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Discard</span>
        </button>
        <button class="btn-filled" id="btn-upload-cropped" style="flex: 2;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload & Send</span>
        </button>
      </div>
    </section>

    <!-- STAGE 4: Success & Continuous Scan Screen -->
    <section id="stage-success">
      <div class="md-card">
        <div class="success-icon-badge">
          <!-- Vector Checkmark Icon -->
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h2 class="headline-medium">Transferred to Terminal</h2>
        <p class="body-medium">
          Receipt image successfully transmitted to the desktop workstation for table OCR extraction.
        </p>
        <div class="count-indicator" id="batch-counter-badge">
          1 Receipt Sent in this Session
        </div>
        <button class="btn-filled" id="btn-scan-another">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span>Scan Another Receipt</span>
        </button>
      </div>
    </section>

  </main>

  <script>
    const sessionId = "{session_id}";
    let cropperInstance = null;
    let uploadedCount = 0;

    // Element references
    const fileInput = document.getElementById('mobile-file-input');
    const stageLaunchpad = document.getElementById('stage-launchpad');
    const stageCropping = document.getElementById('stage-cropping');
    const stageSuccess = document.getElementById('stage-success');
    const cropTargetImg = document.getElementById('crop-target-img');
    const btnSend = document.getElementById('btn-upload-cropped');
    const batchBadge = document.getElementById('batch-counter-badge');

    // Stage switcher
    function setStage(stage) {{
      stageLaunchpad.style.display = stage === 'launchpad' ? 'flex' : 'none';
      stageCropping.style.display = stage === 'cropping' ? 'flex' : 'none';
      stageSuccess.style.display = stage === 'success' ? 'flex' : 'none';
    }}

    // Trigger Camera
    document.getElementById('btn-open-camera').addEventListener('click', () => {{
      fileInput.click();
    }});

    // Capture Handler
    fileInput.addEventListener('change', (e) => {{
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {{
        initCropper(event.target.result);
      }};
      reader.readAsDataURL(file);
    }});

    // Initialize Cropper.js (Local 100% Offline Asset)
    function initCropper(imageSrc) {{
      setStage('cropping');
      cropTargetImg.src = imageSrc;

      if (cropperInstance) {{
        cropperInstance.destroy();
        cropperInstance = null;
      }}

      setTimeout(() => {{
        cropperInstance = new Cropper(cropTargetImg, {{
          viewMode: 1,
          dragMode: 'crop',
          autoCropArea: 0.96,
          responsive: true,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        }});
      }}, 100);
    }}

    // Toolbar Rotations & Reset
    document.getElementById('btn-rot-left').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.rotate(-90);
    }});
    document.getElementById('btn-rot-right').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.rotate(90);
    }});
    document.getElementById('btn-reset-crop').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.reset();
    }});

    // Discard / Retake
    document.getElementById('btn-retake-photo').addEventListener('click', () => {{
      if (cropperInstance) {{
        cropperInstance.destroy();
        cropperInstance = null;
      }}
      fileInput.value = '';
      setStage('launchpad');
    }});

    // Upload Cropped Image
    btnSend.addEventListener('click', () => {{
      if (!cropperInstance) return;

      btnSend.disabled = true;
      btnSend.innerHTML = '<span class="md-spinner"></span><span>Sending...</span>';

      const canvas = cropperInstance.getCroppedCanvas({{
        maxWidth: 1600,
        maxHeight: 2400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      }});

      canvas.toBlob(async (blob) => {{
        if (!blob) {{
          alert('Could not process cropped image. Please try again.');
          btnSend.disabled = false;
          btnSend.innerHTML = '<span>Upload & Send</span>';
          return;
        }}

        const formData = new FormData();
        formData.append('file', blob, 'mobile_receipt.jpg');

        try {{
          const res = await fetch('/api/mobile/upload/' + sessionId, {{
            method: 'POST',
            body: formData
          }});

          if (!res.ok) throw new Error('Upload error: ' + res.status);
          
          const result = await res.json();
          uploadedCount = result.image_count || (uploadedCount + 1);
          batchBadge.textContent = uploadedCount + (uploadedCount === 1 ? ' Receipt Sent in this Session' : ' Receipts Sent in this Session');

          if (cropperInstance) {{
            cropperInstance.destroy();
            cropperInstance = null;
          }}
          fileInput.value = '';
          btnSend.disabled = false;
          btnSend.innerHTML = '<span>Upload & Send</span>';
          setStage('success');
        }} catch (err) {{
          console.error(err);
          alert('Failed to transmit receipt. Check Wi-Fi connection to server.');
          btnSend.disabled = false;
          btnSend.innerHTML = '<span>Upload & Send</span>';
        }}
      }}, 'image/jpeg', 0.92);
    }});

    // Continuous Batch Scanning Loop
    document.getElementById('btn-scan-another').addEventListener('click', () => {{
      setStage('launchpad');
      fileInput.click();
    }});
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

if __name__ == '__main__':
    import uvicorn
    # Bind to 0.0.0.0 so external mobile devices on Wi-Fi/LAN can reach the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
