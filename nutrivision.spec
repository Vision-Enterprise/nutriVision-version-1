# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

root_dir = os.path.abspath(SPECPATH)
backend_dir = os.path.join(root_dir, "backend")

# Collect submodules and data files for rapidocr, rapid_table, and uvicorn
rapidocr_datas = collect_data_files('rapidocr')
rapid_table_datas = collect_data_files('rapid_table')
webview_datas = collect_data_files('webview')

datas = [
    (os.path.join(root_dir, 'dist', 'index.html'), 'dist'),
    (os.path.join(root_dir, 'dist', 'assets'), os.path.join('dist', 'assets')),
    (os.path.join(root_dir, 'src', 'assets'), os.path.join('src', 'assets')),
    (backend_dir, 'backend'),
] + rapidocr_datas + rapid_table_datas + webview_datas

hidden_imports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'fastapi.staticfiles',
    'starlette',
    'starlette.concurrency',
    'rapidocr',
    'rapid_table',
    'onnxruntime',
    'cv2',
    'PIL',
    'webview',
    'webview.platforms.winforms',
    'webview.platforms.edgechromium',
    'pythonnet',
    'clr_loader',
    'clr',
] + collect_submodules('uvicorn') + collect_submodules('rapidocr') + collect_submodules('rapid_table')

a = Analysis(
    ['desktop.py'],
    pathex=[root_dir, backend_dir],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'tkinter', 'unittest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NutriVision',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,  # No console terminal window; clean native desktop GUI
    icon=os.path.join(root_dir, 'src', 'assets', 'logo-icon.png') if os.path.exists(os.path.join(root_dir, 'src', 'assets', 'logo-icon.png')) else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='NutriVisionApp',
)
