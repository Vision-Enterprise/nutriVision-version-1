import { parseTableData, parseHtmlTableData, parseSpatialCells } from './table-parser.js';
import { SystemDialog } from '../../shared/components/dialog.component.js';
import { fetchCommodities } from '../commodities/commodities.service.js';

let cropper = null;
let stream = null;

export class ScannerComponent {
  constructor({ container, onComplete }) {
    this.container = container;
    this.onComplete = onComplete;
    this.commodities = [];
    this.scanMode = 'table';
    this.mobileSessionId = null;
    this.mobilePollTimer = null;
    this.isProcessingMobile = false;
    this.lastProcessedImageUrl = null;
    this.mobileScanCount = 0;
    this.apiBase = 'http://localhost:8000';
    this.init();
  }

  async init() {
    try {
      const { commodities } = await fetchCommodities();
      this.commodities = commodities || [];
    } catch (e) {
      console.warn("Could not fetch commodities for fuzzy matching", e);
    }
    
    this.container.innerHTML = `
      <div style="width:100%; height:100%; display:flex; flex-direction:column; padding:24px;">
        <!-- Tabs (MD3 Segmented Surface) -->
        <div style="display:flex; background:var(--color-surface-alt, #e8f5ee); border:1px solid var(--color-border, #D8E6DA); border-radius:12px; padding:4px; margin-bottom:16px; gap:4px;">
          <button class="scanner-tab-btn active" data-tab="upload" id="tab-btn-upload" style="flex:1; border:none; background:var(--color-primary, #1B7A3E); color:white; border-radius:8px; padding:9px 12px; cursor:pointer; font-weight:600; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 6px rgba(27,122,62,0.25); transition:all 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>File Import</span>
          </button>
          <button class="scanner-tab-btn" data-tab="camera" id="tab-btn-camera" style="flex:1; border:none; background:transparent; color:var(--color-text-muted, #5A7060); border-radius:8px; padding:9px 12px; cursor:pointer; font-weight:600; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            <span>Live Camera</span>
          </button>
          <button class="scanner-tab-btn" data-tab="mobile" id="tab-btn-mobile" style="flex:1; border:none; background:transparent; color:var(--color-text-muted, #5A7060); border-radius:8px; padding:9px 12px; cursor:pointer; font-weight:600; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            <span>Mobile Scanner</span>
          </button>
        </div>

        <!-- TABS CONTENT -->
        <div style="flex:1; display:flex; flex-direction:column; min-height:0;">
          <!-- 1. UPLOAD TAB -->
          <div id="tab-upload" class="drag-zone" style="display:block; background:var(--color-surface, #fff); border:2px dashed var(--color-border-strong, #B2C9B5); border-radius:16px;">
            <svg style="margin-bottom:16px; color:var(--color-text-muted, #5A7060);" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h3 style="margin:0 0 8px 0; color:var(--color-text, #1A2B1C);">Drag & drop document or click to scan file</h3>
            <p style="color:var(--color-text-muted, #5A7060); font-size:14px; margin:0 0 16px 0;">Supports PNG, JPG, JPEG</p>
            <input type="file" id="scanner-file-input" accept="image/*" style="display:none;" />
            <button class="btn" style="background:#fff; color:var(--color-text, #1A2B1C); border:1px solid var(--color-border, #D8E6DA); border-radius:8px; padding:8px 16px; font-weight:600; cursor:pointer;" onclick="document.getElementById('scanner-file-input').click()">Select File</button>
          </div>

          <!-- 2. CAMERA TAB -->
          <div id="tab-camera" style="display:none; height:100%; flex-direction:column; background:#0A120B; border-radius:16px; overflow:hidden; border:1px solid var(--color-border, #D8E6DA);">
            <div style="flex:1; position:relative;">
               <video id="scanner-video" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
            </div>
            <div style="padding:16px; background:#111;">
               <button class="btn" id="scanner-btn-capture" style="width:100%; background:var(--color-primary); color:#fff; border:none; padding:12px; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                 <span>Capture Image</span>
               </button>
            </div>
          </div>

          <!-- 3. MOBILE SCANNER TAB (MD3 NutriVision Card) -->
          <div id="tab-mobile" style="display:none; height:100%; flex-direction:column; align-items:center; justify-content:center; background:var(--color-surface, #ffffff); border:1px solid var(--color-border, #D8E6DA); border-radius:20px; padding:24px 20px; text-align:center; overflow-y:auto; box-shadow:0 4px 16px rgba(27,122,62,0.06);">
            <div style="max-width:400px; width:100%; display:flex; flex-direction:column; align-items:center;">
              <div style="width:52px; height:52px; background:var(--color-primary-bg, #E8F5E9); border:1.5px solid var(--color-border-strong, #B2C9B5); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--color-primary, #1B7A3E); margin-bottom:14px; box-shadow:0 2px 8px rgba(27,122,62,0.1);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>
              <h3 style="margin:0 0 6px 0; color:var(--color-text, #1A2B1C); font-size:17px; font-weight:700; letter-spacing:-0.2px;">Mobile Scanner Companion</h3>
              <p style="margin:0 0 16px 0; color:var(--color-text-muted, #5A7060); font-size:13px; line-height:1.4;">
                Scan with your phone to upload receipts.<br>
                <span style="font-size:11px; color:var(--color-text-subtle, #8FA892);">(Connected to local Wi-Fi. Supports continuous batch scanning.)</span>
              </p>

              <!-- QR Code Render Canvas/Box -->
              <div id="scanner-qr-container" style="background:#ffffff; padding:14px; border-radius:14px; border:1px solid var(--color-border, #D8E6DA); box-shadow:0 2px 10px rgba(27,122,62,0.06); margin-bottom:16px; min-width:210px; min-height:210px; display:flex; align-items:center; justify-content:center;">
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--color-text-muted, #5A7060);">
                  <span class="spinner" style="display:inline-block; width:20px; height:20px; border:2px solid var(--color-border, #cbd5e1); border-top:2px solid var(--color-primary, #1B7A3E); border-radius:50%; animation:spin 1s linear infinite;"></span>
                  <span style="font-size:12px;">Generating QR Code...</span>
                </div>
              </div>

              <!-- Connection Status Pill (MD3 Tonal Chip) -->
              <div id="scanner-mobile-status" style="display:inline-flex; align-items:center; gap:8px; background:var(--color-primary-bg, #E8F5E9); color:var(--color-primary-dark, #0E5C2C); border:1px solid var(--color-border-strong, #B2C9B5); padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; margin-bottom:14px;">
                <span style="width:8px; height:8px; background:var(--color-primary, #1B7A3E); border-radius:50%; display:inline-block; box-shadow:0 0 6px var(--color-primary);"></span>
                <span>Ready: Scan QR code with phone</span>
              </div>

              <!-- Direct URL for manual access -->
              <div style="display:flex; align-items:center; gap:8px; width:100%; background:var(--color-surface, #fff); border:1px solid var(--color-border, #D8E6DA); border-radius:8px; padding:6px 10px;">
                <input id="scanner-mobile-link-input" readonly style="flex:1; border:none; background:transparent; font-size:11px; font-family:monospace; color:var(--color-text, #1A2B1C); outline:none;" value="Connecting..." />
                <button id="scanner-mobile-copy-btn" style="border:none; background:var(--color-primary-bg, #E8F5E9); color:var(--color-primary, #1B7A3E); padding:5px 12px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; transition:background 0.15s ease;">Copy</button>
              </div>
            </div>
          </div>

          <!-- 4. CROP TAB -->
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
                <button class="btn" id="scanner-btn-process" style="flex:2; background:var(--color-primary); color:#fff; border:none; border-radius:6px; padding:12px; font-weight:600; cursor:pointer;">Extract Table (OCR)</button>
            </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    // Tab switching
    this.container.querySelectorAll('.scanner-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // File input change
    const fileInput = this.container.querySelector('#scanner-file-input');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.loadImage(file);
    });

    // Drag and Drop
    const dragZone = this.container.querySelector('#tab-upload');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dragZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dragZone.addEventListener(eventName, () => {
        dragZone.style.borderColor = 'var(--color-primary)';
        dragZone.style.background = 'var(--color-surface-alt, #e8f5ee)';
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dragZone.addEventListener(eventName, () => {
        dragZone.style.borderColor = 'var(--color-border-strong, #B2C9B5)';
        dragZone.style.background = 'var(--color-surface, #fff)';
      }, false);
    });
    dragZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length) this.loadImage(files[0]);
    });

    // Camera Capture
    this.container.querySelector('#scanner-btn-capture').addEventListener('click', () => {
      this.captureImage();
    });

    // Cancel Crop
    this.container.querySelector('#scanner-btn-cancel-crop').addEventListener('click', () => {
      this.destroyCropper();
      this.switchTab('upload');
    });

    // Process OCR
    this.container.querySelector('#scanner-btn-process').addEventListener('click', () => {
      this.processImage();
    });

    // Mode changer
    const modeSelect = this.container.querySelector('#adv-scan-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        this.scanMode = e.target.value;
      });
    }

    // Copy mobile URL button
    const copyBtn = this.container.querySelector('#scanner-mobile-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#scanner-mobile-link-input');
        if (input && input.value) {
          navigator.clipboard.writeText(input.value);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        }
      });
    }
  }

  switchTab(tabId) {
    if (tabId !== 'crop') {
      this.destroyCropper();
      this.stopCamera();
    }

    this.container.querySelector('#tab-upload').style.display = 'none';
    this.container.querySelector('#tab-camera').style.display = 'none';
    this.container.querySelector('#tab-mobile').style.display = 'none';
    this.container.querySelector('#tab-crop').style.display = 'none';
    this.container.querySelector('#scanner-action-bar').style.display = 'none';

    this.container.querySelectorAll('.scanner-tab-btn').forEach(btn => {
       btn.classList.remove('active');
       btn.style.background = 'transparent';
       btn.style.color = 'var(--color-text-muted, #5A7060)';
       btn.style.boxShadow = 'none';
    });

    if (tabId === 'crop') {
      this.container.querySelector('#tab-crop').style.display = 'flex';
      this.container.querySelector('#scanner-action-bar').style.display = 'flex';
    } else {
      const activeBtn = this.container.querySelector(`#tab-btn-${tabId}`);
      if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--color-primary, #1B7A3E)';
        activeBtn.style.color = '#ffffff';
        activeBtn.style.boxShadow = '0 2px 6px rgba(27,122,62,0.25)';
      }

      if (tabId === 'upload') this.container.querySelector('#tab-upload').style.display = 'flex';
      if (tabId === 'camera') this.container.querySelector('#tab-camera').style.display = 'flex';
      if (tabId === 'mobile') {
        this.container.querySelector('#tab-mobile').style.display = 'flex';
        this.initMobileScanner();
      }
    }
  }

  async ensureQRCodeLib() {
    if (window.QRCode) return true;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/src/assets/libs/qrcode.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load local qrcode.min.js'));
      document.head.appendChild(script);
    });
  }

  async initMobileScanner(forceNew = false) {
    const qrContainer = this.container.querySelector('#scanner-qr-container');
    const linkInput = this.container.querySelector('#scanner-mobile-link-input');
    const statusPill = this.container.querySelector('#scanner-mobile-status');

    // If session already exists and active, do NOT regenerate! Continue polling the same session.
    if (this.mobileSessionId && !forceNew) {
      this.startMobilePolling();
      return;
    }

    try {
      await this.ensureQRCodeLib();

      if (statusPill) {
        statusPill.innerHTML = `<span style="width:8px; height:8px; background:var(--color-primary-light, #3FA65B); border-radius:50%; display:inline-block;"></span><span>Connecting to backend...</span>`;
      }

      // Create new session
      const res = await fetch(`${this.apiBase}/api/mobile/create-session`);
      if (!res.ok) throw new Error('Failed to create mobile session');
      const data = await res.json();

      this.mobileSessionId = data.session_id;
      this.lastProcessedImageUrl = null;
      this.isProcessingMobile = false;
      this.mobileScanCount = 0;
      const uploadUrl = data.upload_url;

      if (linkInput) linkInput.value = uploadUrl;
      if (statusPill) {
        statusPill.innerHTML = `<span style="width:8px; height:8px; background:var(--color-primary, #1B7A3E); border-radius:50%; display:inline-block; box-shadow:0 0 6px var(--color-primary);"></span><span>Ready: Scan QR code with phone</span>`;
      }

      // Render QR code
      if (qrContainer) {
        qrContainer.innerHTML = '';
        new window.QRCode(qrContainer, {
          text: uploadUrl,
          width: 200,
          height: 200,
          colorDark: '#0f172a',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      }

      // Start Polling every 1.5 seconds
      this.startMobilePolling();
    } catch (err) {
      console.error(err);
      if (qrContainer) {
        qrContainer.innerHTML = `
          <div style="color:var(--color-danger, #C62828); font-size:12px; padding:16px;">
            Failed to generate QR code.<br>Ensure backend server is running at ${this.apiBase}.
          </div>
        `;
      }
      if (statusPill) {
        statusPill.innerHTML = `<span style="color:var(--color-danger, #C62828);">Connection failed</span>`;
      }
    }
  }

  startMobilePolling() {
    this.stopMobilePolling();
    if (!this.mobileSessionId) return;

    this.mobilePollTimer = setInterval(async () => {
      if (this.isProcessingMobile) return;

      try {
        const res = await fetch(`${this.apiBase}/api/mobile/status/${this.mobileSessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'ready' && data.latest_image_url) {
          if (data.latest_image_url === this.lastProcessedImageUrl) return;

          this.isProcessingMobile = true;
          this.lastProcessedImageUrl = data.latest_image_url;
          this.mobileScanCount = data.image_count || (this.mobileScanCount + 1);

          const statusPill = this.container.querySelector('#scanner-mobile-status');
          if (statusPill) {
            statusPill.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid var(--color-primary, #1B7A3E); border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite;"></span><span>Receipt #${this.mobileScanCount} received! Extracting data...</span>`;
          }

          // Acknowledge session so backend marks status as waiting
          await fetch(`${this.apiBase}/api/mobile/consume/${this.mobileSessionId}`, { method: 'POST' });

          // Fetch the cropped image blob directly from server
          const fullImageUrl = `${this.apiBase}${data.latest_image_url}`;
          const imgRes = await fetch(fullImageUrl);
          const blob = await imgRes.blob();

          // Process the receipt directly without disturbing the desktop view
          await this.processBlob(blob, 'mobile', this.mobileScanCount);
        }
      } catch (e) {
        console.error('Mobile poll error:', e);
      } finally {
        this.isProcessingMobile = false;
      }
    }, 1500);
  }

  stopMobilePolling() {
    if (this.mobilePollTimer) {
      clearInterval(this.mobilePollTimer);
      this.mobilePollTimer = null;
    }
  }

  loadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.initCropper(e.target.result, false, 'upload');
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
      SystemDialog.alert("Camera access denied or unavailable.");
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
    this.initCropper(canvas.toDataURL('image/jpeg'), false, 'camera');
  }

  initCropper(imageSrc, autoProcess = false, sourceTab = 'upload') {
    this.sourceTab = sourceTab;
    this.switchTab('crop');
    const img = this.container.querySelector('#scanner-crop-img');
    this.destroyCropper();

    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Image is loaded into browser memory
      this.destroyCropper();
      setTimeout(() => {
        cropper = new Cropper(img, {
          viewMode: 1,
          dragMode: 'crop',
          autoCropArea: 0.98,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          checkCrossOrigin: false,
          ready: () => {
            if (autoProcess) {
              setTimeout(() => {
                const btn = this.container.querySelector('#scanner-btn-process');
                if (btn) {
                  btn.innerHTML = `<span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite;"></span> Auto-Extracting...`;
                  btn.disabled = true;
                }
                this.processImage();
              }, 250);
            }
          }
        });
      }, 100);
    };

    img.src = imageSrc;
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

  async processBlob(blob, sourceTab = 'upload', receiptIndex = null) {
    if (!blob) throw new Error('Empty receipt image data');

    const formData = new FormData();
    formData.append('file', blob, 'receipt.jpg');
    formData.append('mode', this.scanMode);
    
    const whitelist = this.container.querySelector('#adv-whitelist')?.value;
    if (whitelist) formData.append('whitelist', whitelist);

    const response = await fetch(`${this.apiBase}/api/extract-receipt`, { method: 'POST', body: formData });
    if (!response.ok) {
      let errDetail = 'API failed';
      try {
        const errJson = await response.json();
        errDetail = errJson.detail || errDetail;
      } catch (_) {}
      throw new Error(errDetail);
    }
    
    const data = await response.json();
    
    const legacyFormat = {
      words: (data.raw_cells || []).map(cell => ({
        text: cell.text,
        confidence: cell.confidence,
        bbox: [
          [cell.bbox[0], cell.bbox[1]],
          [cell.bbox[2], cell.bbox[1]],
          [cell.bbox[2], cell.bbox[3]],
          [cell.bbox[0], cell.bbox[3]]
        ]
      }))
    };
    let parsedTable;
    if (data.html_structure) {
        console.log('Using RapidTable HTML Structure parsing');
        parsedTable = parseHtmlTableData(data.html_structure);
    }
    
    if (!parsedTable || !parsedTable.rows || parsedTable.rows.length === 0) {
        console.log('Trying spatial bbox parsing on raw cells');
        if (data.raw_cells && data.raw_cells.length > 0) {
            parsedTable = parseSpatialCells(data.raw_cells);
        }
    }

    if (!parsedTable || !parsedTable.rows || parsedTable.rows.length === 0) {
        console.log('Fallback to legacy bbox parsing');
        parsedTable = parseTableData(legacyFormat);
    }
    
    console.log('PARSED TABLE RESULTS:', parsedTable);
    const parsedRows = (parsedTable?.rows || []).map(r => {
       const match = this.fuzzyMatchCommodity(r.productName);
       return {
          ...r,
          commodityId: match ? match.id : null,
          productName: match ? match.name : r.productName,
          unit: match ? (match.unit || r.unit) : r.unit
       };
    });

    if (sourceTab === 'mobile') {
      const statusPill = this.container.querySelector('#scanner-mobile-status');
      if (statusPill) {
        const receiptLabel = receiptIndex ? `Receipt #${receiptIndex}` : 'Receipt';
        statusPill.innerHTML = `<span style="width:8px; height:8px; background:var(--color-primary, #1B7A3E); border-radius:50%; display:inline-block; box-shadow:0 0 6px var(--color-primary);"></span><span>${parsedRows.length} item(s) extracted from ${receiptLabel}! Ready for next scan</span>`;
      }
    } else {
      this.destroyCropper();
      const returnTab = this.sourceTab || 'upload';
      this.switchTab(returnTab);
      const fileInput = this.container.querySelector('#scanner-file-input');
      if (fileInput) fileInput.value = '';
    }

    if (this.onComplete) {
       this.onComplete(parsedRows);
    }
    return parsedRows;
  }

  async processImage() {
    const btn = this.container.querySelector('#scanner-btn-process');
    if (btn) {
      btn.innerHTML = `<span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin 1s linear infinite;"></span> Extracting Table...`;
      btn.disabled = true;
    }

    try {
      let canvas = null;
      if (cropper) {
        try {
          canvas = cropper.getCroppedCanvas({ width: 1400, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
        } catch (canvasErr) {
          console.warn("Could not get cropped canvas from cropper:", canvasErr);
        }
      }

      if (canvas) {
        canvas.toBlob(async (blob) => {
          try {
            await this.processBlob(blob, this.sourceTab || 'upload');
          } catch (err) {
            console.error(err);
            SystemDialog.alert('OCR Error: ' + err.message);
          } finally {
            if (btn) {
              btn.innerHTML = 'Extract Table (OCR)';
              btn.disabled = false;
            }
          }
        }, 'image/jpeg', 0.92);
      } else {
        const img = this.container.querySelector('#scanner-crop-img');
        if (!img || !img.src) throw new Error('No receipt image available to process');
        const res = await fetch(img.src);
        const blob = await res.blob();
        await this.processBlob(blob, this.sourceTab || 'upload');
        if (btn) {
          btn.innerHTML = 'Extract Table (OCR)';
          btn.disabled = false;
        }
      }
    } catch (error) {
      console.error(error);
      SystemDialog.alert('OCR Error: ' + (error.message || 'Make sure the backend server is running.'));
      if (btn) {
        btn.innerHTML = 'Extract Table (OCR)';
        btn.disabled = false;
      }
    }
  }

  unmount() {
    this.stopCamera();
    this.stopMobilePolling();
    this.destroyCropper();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
