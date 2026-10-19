import sys
import os
import time
import socket
import threading

# Determine base directory (supports both raw Python and PyInstaller frozen executable)
if getattr(sys, 'frozen', False):
    root_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
else:
    root_dir = os.path.dirname(os.path.abspath(__file__))

backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

def is_nutrivision_running(port: int = 8000, host: str = "127.0.0.1") -> bool:
    """Checks if the local server port is active AND running NutriVision."""
    import urllib.request
    try:
        req = urllib.request.Request(f"http://{host}:{port}/api/health", headers={'User-Agent': 'NutriVision-Desktop'})
        with urllib.request.urlopen(req, timeout=0.8) as response:
            return response.status == 200
    except Exception:
        return False

def start_backend():
    """Starts the FastAPI backend inside an isolated thread."""
    import uvicorn
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")

def launch():
    # 1. Start server if not already running
    if not is_nutrivision_running(8000):
        print("[NutriVision] Starting local FastAPI server on port 8000...")
        t = threading.Thread(target=start_backend, daemon=True)
        t.start()
        
        # Wait up to 6 seconds for the server to be fully responsive
        retries = 12
        while retries > 0 and not is_nutrivision_running(8000):
            time.sleep(0.5)
            retries -= 1
        print("[NutriVision] Backend server is active.")
    else:
        print("[NutriVision] Existing NutriVision server detected on port 8000. Connecting...")

    # 2. Launch native desktop window via pywebview (enforcing Edge WebView2)
    import webview

    window = webview.create_window(
        title="NutriVision — Commodity Inventory System",
        url="http://127.0.0.1:8000",
        width=1280,
        height=820,
        min_size=(1024, 640),
        background_color="#F4F9F5"
    )

    print("[NutriVision] Opening desktop window...")
    try:
        webview.start(gui='edgechromium', debug=False)
    except Exception:
        webview.start(debug=False)
    print("[NutriVision] Window closed. Exiting.")
    sys.exit(0)

if __name__ == '__main__':
    launch()
