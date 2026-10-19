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

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Checks if the local server port is already active."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def start_backend():
    """Starts the FastAPI backend inside an isolated thread."""
    import uvicorn
    from main import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")

def launch():
    # 1. Start server if not already running
    if not is_port_in_use(8000):
        print("[NutriVision] Starting local FastAPI server on port 8000...")
        t = threading.Thread(target=start_backend, daemon=True)
        t.start()
        
        # Wait up to 5 seconds for the server to be responsive
        retries = 10
        while retries > 0 and not is_port_in_use(8000):
            time.sleep(0.5)
            retries -= 1
        print("[NutriVision] Backend server is active.")
    else:
        print("[NutriVision] Existing server detected on port 8000. Connecting...")

    # 2. Launch native desktop window via pywebview
    import webview

    logo_icon = os.path.join(root_dir, "src", "assets", "logo-icon.png")
    
    window = webview.create_window(
        title="NutriVision — Commodity Inventory System",
        url="http://127.0.0.1:8000",
        width=1280,
        height=820,
        min_size=(1024, 640),
        background_color="#F4F9F5"
    )

    print("[NutriVision] Opening desktop window...")
    webview.start(debug=False)
    print("[NutriVision] Window closed. Exiting.")
    sys.exit(0)

if __name__ == '__main__':
    launch()
