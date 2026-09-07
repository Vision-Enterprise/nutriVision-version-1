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
    """Delivers a responsive, dark-mode mobile web companion using 100% offline Cropper.js."""
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>NutriVision Mobile Intake</title>
  <!-- 100% Offline Local Cropper.js Assets (Zero External CDNs) -->
  <link rel="stylesheet" href="/assets/libs/cropper.min.css" />
  <script src="/assets/libs/cropper.min.js"></script>
  <style>
    :root {{
      --bg-base: #0b0f19;
      --bg-card: #151d2f;
      --bg-card-hover: #1e293b;
      --accent-emerald: #10b981;
      --accent-emerald-dark: #059669;
      --accent-cyan: #06b6d4;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #334155;
      --radius: 16px;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-base);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }}
    /* Header */
    .mobile-header {{
      background: rgba(21, 29, 47, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }}
    .brand-group {{
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .brand-icon {{
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent-emerald), var(--accent-cyan));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }}
    .brand-text h1 {{
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: #fff;
    }}
    .brand-text p {{
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }}
    .session-tag {{
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      font-family: monospace;
    }}
    
    /* Main Content Container */
    .content-area {{
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      max-width: 500px;
      margin: 0 auto;
      width: 100%;
    }}

    /* STAGE 1: Launchpad */
    #stage-launchpad {{
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
      padding: 30px 10px;
      animation: fadeIn 0.3s ease;
    }}
    .launch-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 36px 24px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    .camera-halo {{
      width: 96px;
      height: 96px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      border: 2px dashed rgba(16, 185, 129, 0.4);
    }}
    .camera-btn {{
      background: linear-gradient(135deg, var(--accent-emerald), var(--accent-emerald-dark));
      color: white;
      border: none;
      border-radius: 14px;
      padding: 18px 24px;
      font-size: 17px;
      font-weight: 700;
      width: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }}
    .camera-btn:active {{
      transform: scale(0.97);
    }}
    .launch-tip {{
      margin-top: 24px;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
    }}

    /* STAGE 3: Cropping Studio */
    #stage-cropping {{
      display: none;
      flex-direction: column;
      flex: 1;
      animation: fadeIn 0.3s ease;
    }}
    .cropper-frame {{
      flex: 1;
      min-height: 380px;
      max-height: 60vh;
      background: #000;
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border-color);
      position: relative;
    }}
    .crop-img-target {{
      max-width: 100%;
      display: block;
    }}
    .cropper-toolbar {{
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 14px 0;
    }}
    .tool-btn {{
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }}
    .crop-actions {{
      display: flex;
      gap: 12px;
      margin-top: auto;
      padding-top: 10px;
    }}
    .btn-retake {{
      flex: 1;
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 15px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
    }}
    .btn-send {{
      flex: 2;
      background: linear-gradient(135deg, var(--accent-emerald), var(--accent-emerald-dark));
      color: white;
      border: none;
      padding: 15px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
    }}
    .btn-send:disabled {{
      opacity: 0.6;
      cursor: not-allowed;
    }}

    /* STAGE 4: Success & Continuous Loop */
    #stage-success {{
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    }}
    .success-card {{
      background: var(--bg-card);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: var(--radius);
      padding: 40px 24px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    .check-circle {{
      width: 84px;
      height: 84px;
      background: rgba(16, 185, 129, 0.15);
      border: 3px solid var(--accent-emerald);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: var(--accent-emerald);
      margin-bottom: 20px;
      animation: bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }}
    .success-title {{
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
    }}
    .success-subtitle {{
      color: var(--text-muted);
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.4;
    }}
    .batch-counter {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--accent-cyan);
      font-weight: 600;
      margin-bottom: 28px;
    }}
    .btn-loop {{
      background: linear-gradient(135deg, var(--accent-emerald), var(--accent-emerald-dark));
      color: white;
      border: none;
      border-radius: 14px;
      padding: 16px 20px;
      font-size: 16px;
      font-weight: 700;
      width: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }}

    /* Loading Spinner */
    .spinner {{
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.3);
      border-top: 2.5px solid #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }}
    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(8px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}
    @keyframes bounce {{
      0% {{ transform: scale(0.3); opacity: 0; }}
      50% {{ transform: scale(1.1); }}
      100% {{ transform: scale(1); opacity: 1; }}
    }}
  </style>
</head>
<body>

  <!-- Branded Header -->
  <header class="mobile-header">
    <div class="brand-group">
      <div class="brand-icon">🌱</div>
      <div class="brand-text">
        <h1>NutriVision Mobile</h1>
        <p>Delivery Receipt Intake</p>
      </div>
    </div>
    <div class="session-tag" title="Local Session ID">#{session_id}</div>
  </header>

  <!-- Hidden Native Camera Trigger (Hardware Autofocus & Flash) -->
  <input type="file" id="mobile-file-input" accept="image/*" capture="environment" style="display:none;" />

  <main class="content-area">

    <!-- STAGE 1: Launchpad -->
    <section id="stage-launchpad">
      <div class="launch-card">
        <div class="camera-halo">
          <span style="font-size: 38px;">📷</span>
        </div>
        <h2 style="font-size: 21px; margin-bottom: 8px; font-weight: 700;">Ready to Scan</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 28px;">
          Hold camera flat directly above delivery receipt for clear OCR table extraction.
        </p>
        <button class="camera-btn" id="btn-open-camera">
          <span>📷 Snap Receipt</span>
        </button>
        <p class="launch-tip">
          💡 Uses native camera autofocus and flash for optimal contrast.
        </p>
      </div>
    </section>

    <!-- STAGE 3: Cropping Studio -->
    <section id="stage-cropping">
      <div class="cropper-frame">
        <img id="crop-target-img" class="crop-img-target" alt="Receipt Preview" />
      </div>

      <div class="cropper-toolbar">
        <button class="tool-btn" id="btn-rot-left">↺ Rotate Left</button>
        <button class="tool-btn" id="btn-rot-right">↻ Rotate Right</button>
        <button class="tool-btn" id="btn-reset-crop">⛶ Reset</button>
      </div>

      <div class="crop-actions">
        <button class="btn-retake" id="btn-retake-photo">Discard</button>
        <button class="btn-send" id="btn-upload-cropped">
          <span>📤 Upload & Send</span>
        </button>
      </div>
    </section>

    <!-- STAGE 4: Continuous Loop Success Screen -->
    <section id="stage-success">
      <div class="success-card">
        <div class="check-circle">✓</div>
        <h2 class="success-title">Transferred to Terminal!</h2>
        <p class="success-subtitle">
          Your cropped receipt was streamed to the desktop terminal and queued for OCR extraction.
        </p>
        <div class="batch-counter" id="batch-counter-badge">
          1 Receipt Sent in this Session
        </div>
        <button class="btn-loop" id="btn-scan-another">
          <span>📷 Scan Another Receipt</span>
        </button>
      </div>
    </section>

  </main>

  <script>
    const sessionId = "{session_id}";
    let cropperInstance = null;
    let uploadedCount = 0;

    // Elements
    const fileInput = document.getElementById('mobile-file-input');
    const stageLaunchpad = document.getElementById('stage-launchpad');
    const stageCropping = document.getElementById('stage-cropping');
    const stageSuccess = document.getElementById('stage-success');
    const cropTargetImg = document.getElementById('crop-target-img');
    const btnSend = document.getElementById('btn-upload-cropped');
    const batchBadge = document.getElementById('batch-counter-badge');

    // Stage switching helper
    function setStage(stage) {{
      stageLaunchpad.style.display = stage === 'launchpad' ? 'flex' : 'none';
      stageCropping.style.display = stage === 'cropping' ? 'flex' : 'none';
      stageSuccess.style.display = stage === 'success' ? 'flex' : 'none';
    }}

    // Trigger Native Camera
    document.getElementById('btn-open-camera').addEventListener('click', () => {{
      fileInput.click();
    }});

    // Handle Image Chosen
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

      // Give DOM time to calculate container dimensions
      setTimeout(() => {{
        cropperInstance = new Cropper(cropTargetImg, {{
          viewMode: 1,
          dragMode: 'crop',
          autoCropArea: 0.95,
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

    // Toolbar actions
    document.getElementById('btn-rot-left').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.rotate(-90);
    }});
    document.getElementById('btn-rot-right').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.rotate(90);
    }});
    document.getElementById('btn-reset-crop').addEventListener('click', () => {{
      if (cropperInstance) cropperInstance.reset();
    }});

    // Retake / Discard
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
      btnSend.innerHTML = '<span class="spinner"></span> Streaming...';

      const canvas = cropperInstance.getCroppedCanvas({{
        maxWidth: 1600,
        maxHeight: 2400,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      }});

      canvas.toBlob(async (blob) => {{
        if (!blob) {{
          alert('Could not encode cropped image. Please try again.');
          btnSend.disabled = false;
          btnSend.innerHTML = '📤 Upload & Send';
          return;
        }}

        const formData = new FormData();
        formData.append('file', blob, 'mobile_receipt.jpg');

        try {{
          const res = await fetch('/api/mobile/upload/' + sessionId, {{
            method: 'POST',
            body: formData
          }});

          if (!res.ok) throw new Error('Upload failed with status ' + res.status);
          
          const result = await res.json();
          uploadedCount = result.image_count || (uploadedCount + 1);
          batchBadge.textContent = uploadedCount + (uploadedCount === 1 ? ' Receipt Sent in this Session' : ' Receipts Sent in this Session');

          // Clean up cropper & go to Stage 4 (Continuous Loop)
          if (cropperInstance) {{
            cropperInstance.destroy();
            cropperInstance = null;
          }}
          fileInput.value = '';
          btnSend.disabled = false;
          btnSend.innerHTML = '📤 Upload & Send';
          setStage('success');
        }} catch (err) {{
          console.error(err);
          alert('Failed to transmit receipt. Check Wi-Fi connection to server.');
          btnSend.disabled = false;
          btnSend.innerHTML = '📤 Upload & Send';
        }}
      }}, 'image/jpeg', 0.92);
    }});

    // Stage 4 Continuous Batch Scanning
    document.getElementById('btn-scan-another').addEventListener('click', () => {{
      setStage('launchpad');
      // Direct trigger of camera for smooth continuous flow
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
