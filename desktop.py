import sys
import os
import time
import threading
import mimetypes

# Ensure font and asset MIME types are globally registered
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/ttf", ".ttf")
mimetypes.add_type("font/otf", ".otf")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

# Prevent 'NoneType' write errors when running without a console
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

# Determine base directory (supports both raw Python and PyInstaller frozen executable)
if getattr(sys, 'frozen', False):
    root_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    log_dir = os.path.dirname(sys.executable)
else:
    root_dir = os.path.dirname(os.path.abspath(__file__))
    log_dir = root_dir

backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

def log_msg(msg: str):
    try:
        log_file = os.path.join(log_dir, "nutrivision.log")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass

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
    try:
        import uvicorn  # type: ignore
        try:
            from backend.main import app  # type: ignore
        except ImportError:
            from main import app  # type: ignore
        log_msg("Starting uvicorn server on port 8000...")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
    except Exception as e:
        import traceback
        log_msg(f"Backend failed to start: {e}\n{traceback.format_exc()}")

def launch():
    log_msg("NutriVision launcher started.")
    # 1. Start server if not already running
    if not is_nutrivision_running(8000):
        log_msg("Port 8000 not active. Spawning backend thread...")
        t = threading.Thread(target=start_backend, daemon=True)
        t.start()
        
        # Wait up to 30 seconds for the server to be fully responsive
        retries = 60
        while retries > 0 and not is_nutrivision_running(8000):
            time.sleep(0.5)
            retries -= 1
        
        if is_nutrivision_running(8000):
            log_msg("Backend server confirmed responsive on port 8000.")
        else:
            log_msg("WARNING: Backend health check timed out after 30 seconds.")
    else:
        log_msg("Existing NutriVision server detected on port 8000. Connecting...")

    # 2. Launch native desktop window via pywebview (enforcing Edge WebView2)
    import webview  # type: ignore

    # Allow downloads so that CSV / Excel and file exports trigger file saving
    webview.settings['ALLOW_DOWNLOADS'] = True

    try:
        import importlib
        import webview.platforms.edgechromium as ec  # type: ignore
        wv2_core = importlib.import_module("Microsoft.Web.WebView2.Core")
        allow_state = getattr(wv2_core.CoreWebView2PermissionState, "Allow", 1)

        # Hook EdgeChrome.__init__ to enable browser print preview (identical to Vercel/browser experience)
        orig_init = ec.EdgeChrome.__init__
        def custom_init(self, form, window, cache_dir):
            orig_init(self, form, window, cache_dir)
            try:
                if hasattr(self, 'webview') and self.webview.CreationProperties:
                    current_args = self.webview.CreationProperties.AdditionalBrowserArguments or ''
                    if '--enable-features=msWebView2BrowserPrintPreview' not in current_args:
                        self.webview.CreationProperties.AdditionalBrowserArguments = (
                            current_args + ' --enable-features=msWebView2BrowserPrintPreview'
                        ).strip()
                        log_msg(f"Configured WebView2 browser arguments: {self.webview.CreationProperties.AdditionalBrowserArguments}")
            except Exception as ex:
                log_msg(f"Error configuring AdditionalBrowserArguments: {ex}")

        ec.EdgeChrome.__init__ = custom_init

        # Custom download handler to guarantee pre-populated filename and correct filter
        def custom_on_download_starting(self, sender, args):
            try:
                log_msg(f"Download starting: {args.ResultFilePath} (Uri: {args.DownloadOperation.Uri})")
                import winreg
                import System.Windows.Forms as WinForms  # type: ignore
                dialog = WinForms.SaveFileDialog()

                try:
                    with winreg.OpenKey(
                        winreg.HKEY_CURRENT_USER,
                        r'Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders',
                    ) as windows_key:
                        dialog.InitialDirectory = winreg.QueryValueEx(
                            windows_key, '{374DE290-123F-4565-9164-39C4925E467B}'
                        )[0]
                except Exception:
                    dialog.InitialDirectory = os.path.expanduser('~/Downloads')

                suggested_name = os.path.basename(args.ResultFilePath or '')
                ext = os.path.splitext(suggested_name)[1].lower()
                mime_type = getattr(args, 'MimeType', '') or ''
                uri = str(getattr(args.DownloadOperation, 'Uri', '') or '')
                is_pdf = ext == '.pdf' or 'pdf' in mime_type.lower() or uri.lower().endswith('.pdf')
                if not suggested_name or suggested_name.lower() in ('download', 'untitled', 'download.pdf'):
                    suggested_name = 'NutriVision_Report.pdf' if is_pdf else 'NutriVision_Export.csv'
                ext = os.path.splitext(suggested_name)[1].lower()
                if ext == '.csv':
                    dialog.Filter = "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*"
                    dialog.DefaultExt = "csv"
                elif ext == '.pdf':
                    dialog.Filter = "PDF Files (*.pdf)|*.pdf|All Files (*.*)|*.*"
                    dialog.DefaultExt = "pdf"
                else:
                    dialog.Filter = "All Files (*.*)|*.*"

                dialog.RestoreDirectory = True
                dialog.FileName = suggested_name
                dialog.Title = "Save As"

                result = dialog.ShowDialog(self.form)
                if result == WinForms.DialogResult.OK:
                    args.ResultFilePath = dialog.FileName
                    log_msg(f"Download saved to: {dialog.FileName}")
                else:
                    args.Cancel = True
                    log_msg("Download cancelled by user.")
            except Exception as ex:
                log_msg(f"Error in custom_on_download_starting: {ex}")
                pass

        ec.EdgeChrome.on_download_starting = custom_on_download_starting

        orig_on_webview_ready = ec.EdgeChrome.on_webview_ready

        def custom_on_webview_ready(self, sender, args):
            orig_on_webview_ready(self, sender, args)
            if args.IsSuccess and sender.CoreWebView2:
                try:
                    def on_permission_requested(_, p_args):
                        # Silently grant camera/microphone access in native desktop app
                        p_args.set_State(allow_state)
                    sender.CoreWebView2.PermissionRequested += on_permission_requested
                    log_msg("WebView2 camera permissions handler registered successfully.")
                except Exception as ex:
                    log_msg(f"Failed to attach PermissionRequested handler: {ex}")

                try:
                    def on_title_changed(s, _):
                        doc_title = s.DocumentTitle
                        if doc_title and doc_title.strip() and doc_title != "NutriVision":
                            self.pywebview_window.set_title(doc_title)
                    sender.CoreWebView2.DocumentTitleChanged += on_title_changed
                    log_msg("WebView2 DocumentTitleChanged handler registered successfully.")
                except Exception as ex:
                    log_msg(f"Failed to attach DocumentTitleChanged handler: {ex}")

        ec.EdgeChrome.on_webview_ready = custom_on_webview_ready
    except Exception as e:
        log_msg(f"Could not hook WebView2 customization: {e}")

    window = webview.create_window(
        title="NutriVision — Commodity Inventory System",
        url="http://127.0.0.1:8000",
        width=1280,
        height=820,
        min_size=(1024, 640),
        background_color="#F4F9F5"
    )

    log_msg("Opening desktop window via pywebview...")
    appdata_dir = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
    webview_data_dir = os.path.join(appdata_dir, 'NutriVision', 'WebViewData')
    os.makedirs(webview_data_dir, exist_ok=True)
    log_msg(f"Using persistent WebView2 storage path: {webview_data_dir}")

    try:
        webview.start(gui='edgechromium', debug=False, private_mode=False, storage_path=webview_data_dir)
    except Exception as e:
        log_msg(f"EdgeChromium GUI failed, falling back to default webview: {e}")
        webview.start(debug=False, private_mode=False, storage_path=webview_data_dir)
    log_msg("Window closed. Exiting.")
    sys.exit(0)

if __name__ == '__main__':
    launch()
