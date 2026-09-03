
import { parseTableData } from './table-parser.js';

let cropper = null;
let stream = null;

export class ScannerComponent {
  constructor({ container, onComplete }) {
    this.container = container;
    this.onComplete = onComplete;
    this.commodities = [];
    this.scanMode = 'table';
    this.init();
  }

  async init() {
    try {
      const response = await fetch('/api/commodities');
      const data = await response.json();
      this.commodities = data.commodities || [];
    } catch (e) {
      console.warn("Could not fetch commodities for fuzzy matching", e);
    }
    
    this.container.innerHTML = `
      <div style="width:100%; height:100%; display:flex; flex-direction:column; padding:24px;">
        <!-- Tabs -->
        <div style="display:flex; background:#f1f5f9; border-radius:8px; padding:4px; margin-bottom:16px;">
          <button class="scanner-tab-btn active" data-tab="upload" id="tab-btn-upload" style="flex:1; border:none; background:var(--color-primary); color:white; border-radius:6px; padding:8px 12px; cursor:pointer; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.1);">File Import</button>
          <button class="scanner-tab-btn" data-tab="camera" id="tab-btn-camera" style="flex:1; border:none; background:transparent; color:var(--text-main); border-radius:6px; padding:8px 12px; cursor:pointer; font-weight:600; transition:all 0.15s ease;">Live Camera</button>
        </div>

        <!-- TABS CONTENT -->
        <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
          <!-- 1. UPLOAD TAB -->
          <div id="tab-upload" class="drag-zone" style="display:block;">
            <svg style="margin-bottom:16px; color:var(--text-muted);" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h3 style="margin:0 0 8px 0; color:var(--text-main);">Drag & drop document or click to scan file</h3>
            <p style="color:var(--text-muted); font-size:14px; margin:0 0 16px 0;">Supports PNG, JPG, JPEG</p>
            <input type="file" id="scanner-file-input" accept="image/*" style="display:none;" />
            <button class="btn" style="background:#fff; color:var(--text-main); border:1px solid var(--color-border); border-radius:6px; padding:8px 16px; font-weight:600; cursor:pointer;" onclick="document.getElementById('scanner-file-input').click()">Select File</button>
          </div>

          <!-- 2. CAMERA TAB -->
          <div id="tab-camera" style="display:none; height:100%; flex-direction:column; background:#000; border-radius:8px; overflow:hidden;">
            <div style="flex:1; position:relative;">
               <video id="scanner-video" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
            </div>
            <div style="padding:16px; background:#111;">
               <button class="btn" id="scanner-btn-capture" style="width:100%; background:var(--color-primary); color:#fff; border:none; padding:12px; border-radius:6px; font-weight:600; cursor:pointer;">Capture Image</button>
            </div>
          </div>

          <!-- 3. CROP TAB -->
          <div id="tab-crop" style="display:none; height:100%; flex-direction:column; background:#f8fafc; border:1px solid var(--color-border); border-radius:8px; overflow:hidden;">
             <div style="flex:1; overflow:hidden; display:flex; justify-content:center; align-items:center; background:#000;">
                <img id="scanner-crop-img" style="max-width:100%; max-height:100%;" />
             </div>
          </div>
        </div>

        <!-- ACTION BAR -->
        <div id="scanner-action-bar" style="margin-top:24px; display:none; flex-direction:column; gap:16px;">
            <details style="border:1px solid var(--color-border); border-radius:6px; overflow:hidden; background:#f8fafc;">
               <summary style="padding:12px 16px; font-weight:600; cursor:pointer; color:var(--text-main); outline:none;">Advanced Settings</summary>
               <div style="padding:16px; border-top:1px solid var(--color-border); display:flex; flex-direction:column; gap:12px; background:#fff;">
                  <div>
                     <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Scanning Mode</label>
                     <select id="adv-scan-mode" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:4px;">
                        <option value="table">Table / Multi-Column (Auto)</option>
                        <option value="multi_line">Multi-Line Block</option>
                        <option value="single_line">Single Line Text</option>
                     </select>
                  </div>
                  <div>
                     <label style="display:block; font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Whitelist Preset</label>
                     <select id="adv-whitelist" style="width:100%; padding:8px; border:1px solid var(--color-border); border-radius:4px;">
                        <option value="">All Characters</option>
                        <option value="0123456789">Numbers Only</option>
                        <option value="0123456789/-.">Dates Only</option>
                     </select>
                  </div>
               </div>
            </details>

            <div style="display:flex; gap:12px;">
                <button class="btn" id="scanner-btn-cancel-crop" style="flex:1; background:#fff; color:var(--text-main); border:1px solid var(--color-border); border-radius:6px; padding:12px; font-weight:600; cursor:pointer;">Discard</button>
                <button class="btn-elevated" id="scanner-btn-process" style="flex:2;">Extract Table (OCR)</button>
            </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.switchTab('upload');
  }

  bindEvents() {
    this.container.querySelector('#tab-btn-upload').addEventListener('click', () => this.switchTab('upload'));
    this.container.querySelector('#tab-btn-camera').addEventListener('click', () => {
      this.switchTab('camera');
      this.startCamera();
    });

    // Drag and Drop
    const dropZone = this.container.querySelector('#tab-upload');
    dropZone.addEventListener('dragover', (e) => {
       e.preventDefault();
       dropZone.classList.add('drag-active');
    });
    dropZone.addEventListener('dragleave', (e) => {
       e.preventDefault();
       dropZone.classList.remove('drag-active');
    });
    dropZone.addEventListener('drop', (e) => {
       e.preventDefault();
       dropZone.classList.remove('drag-active');
       if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadImage(e.dataTransfer.files[0]);
       }
    });

    this.container.querySelector('#scanner-file-input').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadImage(e.target.files[0]);
      }
    });

    this.container.querySelector('#scanner-btn-capture').addEventListener('click', () => {
      this.captureImage();
    });

    this.container.querySelector('#scanner-btn-cancel-crop').addEventListener('click', () => {
      this.destroyCropper();
      this.switchTab(this.container.querySelector('.scanner-tab-btn.active').dataset.tab);
    });
    
    this.container.querySelector('#scanner-btn-process').addEventListener('click', (e) => {
      e.target.innerHTML = `<span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite;"></span> Processing...`;
      e.target.disabled = true;
      this.processImage();
    });

    this.container.querySelector('#adv-scan-mode').addEventListener('change', (e) => {
       this.scanMode = e.target.value;
    });
  }

  switchTab(tabId) {
    this.stopCamera();
    this.container.querySelector('#tab-upload').style.display = 'none';
    this.container.querySelector('#tab-camera').style.display = 'none';
    this.container.querySelector('#tab-crop').style.display = 'none';
    this.container.querySelector('#scanner-action-bar').style.display = 'none';

    this.container.querySelectorAll('.scanner-tab-btn').forEach(btn => {
       btn.classList.remove('active');
       btn.style.background = 'transparent';
       btn.style.color = 'var(--text-main)';
       btn.style.boxShadow = 'none';
    });

    if (tabId === 'crop') {
      this.container.querySelector('#tab-crop').style.display = 'flex';
      this.container.querySelector('#scanner-action-bar').style.display = 'flex';
    } else {
      const activeBtn = this.container.querySelector(`#tab-btn-${tabId}`);
      activeBtn.classList.add('active');
      activeBtn.style.background = 'var(--color-primary)';
      activeBtn.style.color = 'white';
      activeBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

      if (tabId === 'upload') this.container.querySelector('#tab-upload').style.display = 'flex';
      if (tabId === 'camera') this.container.querySelector('#tab-camera').style.display = 'flex';
    }
  }

  loadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.initCropper(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async startCamera() {
    const video = this.container.querySelector('#scanner-video');
    const captureBtn = this.container.querySelector('#scanner-btn-capture');
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      captureBtn.disabled = false;
    } catch (err) {
      alert("Camera access denied or unavailable.");
    }
  }

  stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  captureImage() {
    const video = this.container.querySelector('#scanner-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    this.initCropper(canvas.toDataURL('image/jpeg'));
  }

  initCropper(imageSrc) {
    this.switchTab('crop');
    const img = this.container.querySelector('#scanner-crop-img');
    img.src = imageSrc;
    
    this.destroyCropper();
    // Use timeout to allow flex container to settle dimensions
    setTimeout(() => {
        cropper = new Cropper(img, {
          viewMode: 1,
          dragMode: 'crop',
          autoCropArea: 0.9,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
    }, 100);
  }

  destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  }

  levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  fuzzyMatchCommodity(ocrName) {
    if (!ocrName || !this.commodities.length) return null;
    const search = ocrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const com of this.commodities) {
      const name = com.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (name.includes(search) || search.includes(name)) return com;
      
      const dist = this.levenshtein(search, name);
      if (dist < bestScore) {
        bestScore = dist;
        bestMatch = com;
      }
    }
    
    if (bestMatch && bestScore <= Math.ceil(Math.max(search.length, bestMatch.name.length) * 0.4)) {
      return bestMatch;
    }
    return null;
  }

  async processImage() {
    if (!cropper) return;
    
    const canvas = cropper.getCroppedCanvas({ width: 1200, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('file', blob, 'receipt.jpg');
      formData.append('mode', this.scanMode);
      
      const whitelist = this.container.querySelector('#adv-whitelist').value;
      if (whitelist) formData.append('whitelist', whitelist);

      try {
        const response = await fetch('http://localhost:8000/api/ocr', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('API failed');
        
        const data = await response.json();
        const parsedTable = parseTableData(data);
        
        const parsedRows = parsedTable.rows.map(r => {
           const match = this.fuzzyMatchCommodity(r.productName);
           return {
              ...r,
              commodityId: match ? match.id : null,
              productName: match ? match.name : r.productName
           };
        });
        
        const btn = this.container.querySelector('#scanner-btn-process');
        btn.innerHTML = 'Extract Table (OCR)';
        btn.disabled = false;
        
        this.destroyCropper();
        this.switchTab('upload');
        this.container.querySelector('#scanner-file-input').value = '';

        if (this.onComplete) {
           this.onComplete(parsedRows);
        }
      } catch (error) {
        console.error(error);
        alert('OCR Error. Make sure the backend server is running and returns bounding boxes.');
        const btn = this.container.querySelector('#scanner-btn-process');
        btn.innerHTML = 'Extract Table (OCR)';
        btn.disabled = false;
      }
    }, 'image/jpeg', 0.9);
  }

  unmount() {
    this.stopCamera();
    this.destroyCropper();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
