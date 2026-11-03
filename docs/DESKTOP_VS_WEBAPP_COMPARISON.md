# NutriVision: Desktop vs. Web App Comparison
**Simplified Guide & Presentation Talking Points for MNAO**

---

## 1. Quick Summary: Which One to Use?

Both versions connect to the **same central Supabase cloud database**, so all inventory and batch records are **100% identical and synchronized in real time**. The main difference lies in **how they are accessed** and **how fast document OCR scanning performs**.

| Feature / Metric | 🌐 Web App (`nutrivision-mnao.vercel.app`) | 💻 Desktop App (`NutriVision.exe`) |
| :--- | :--- | :--- |
| **OCR Document Scanning** | ⏳ **Slower** (Cloud-Dependent) | ⚡ **Much Faster** (Local AI Engine) |
| **Download / Storage Size** | 🚀 **0 MB** (No download needed) | 📦 **~352 MB ZIP** (~850 MB unzipped) |
| **Access Method** | Instant click from any browser link | Download ZIP, extract, and run `.exe` |
| **Supported Devices** | Any device (Phones, Tablets, Laptops, Mac, Windows) | Windows 10 & 11 (64-bit PC/laptop only) |
| **Software Updates** | **Automatic** (Instant upon page refresh) | **Manual** (Requires downloading updated ZIP) |
| **Workspace Focus** | Runs in browser tab (with other tabs) | **Dedicated window** with taskbar icon |
| **Database Sync** | Real-time cloud sync | Real-time cloud sync |

---

## 2. The Big Difference: OCR Document & Receipt Scanning

The single most significant technical difference between the two versions is **Optical Character Recognition (OCR)** for scanning delivery receipts, invoices, and batch labels:

### 💻 Desktop App: Blazing Fast Local OCR
* **How it works**: The artificial intelligence engine (`RapidOCR`, `OpenCV`, and `ONNX Runtime`) is **bundled directly inside the software on your computer**.
* **Why it is faster**: When you scan an invoice or delivery paper, the image is processed right on your computer’s processor. It **never needs to upload large photo files across the internet**.
* **Result**: **Instant extraction** in 2–4 seconds, regardless of whether office Wi-Fi is fast or congested.

### 🌐 Web App: Slower, Cloud-Dependent OCR
* **How it works**: Web browsers cannot bundle heavy AI engines locally without crashing. Therefore, when you take a photo, the image must be uploaded over your Wi-Fi to a remote cloud server for processing.
* **Why it is slower**:
  1. **Upload lag**: Heavy smartphone camera photos (3–10 MB) take several seconds just to upload over standard office Wi-Fi.
  2. **Cloud server specs**: Processing speed depends on the cloud server’s allocated CPU and memory tier, which can queue or lag during peak hours.
* **Result**: Slower scan extraction (10–25+ seconds depending on internet connection speed).

---

## 3. Pros and Cons at a Glance

### 🌐 Web App
* **PROS**:
  * **Zero download & zero installation**: Just click the link and log in immediately.
  * **Works anywhere on any device**: Perfect for smartphones, tablets, and laptops during barangay field visits.
  * **Always up-to-date**: Automatically receives latest updates whenever the page is refreshed.
  * **Zero storage footprint**: Takes 0 MB on old office PCs with full hard drives.
* **CONS**:
  * Slower OCR invoice extraction due to Wi-Fi upload and cloud processing.
  * Runs inside browser tabs where it can be accidentally closed.

### 💻 Desktop App
* **PROS**:
  * **Much faster OCR extraction**: Scans receipts and delivery papers rapidly using local computer hardware.
  * **Dedicated workstation tool**: Has its own desktop shortcut and taskbar icon—no browser tab clutter.
  * **Fast UI responsiveness**: All buttons, icons, and interface files load directly from local storage.
* **CONS**:
  * **Large file size**: ~352 MB ZIP (~850 MB unzipped) because it bundles the Python runtime, AI models, and computer vision libraries.
  * **Windows only**: Cannot be installed on mobile phones or iPads.
  * **Manual updates**: When a new version is released, the updated ZIP must be re-downloaded.

---

## 4. Best Practice for MNAO

```
+-----------------------------------------------------------------------------------+
|                        RECOMMENDED HYBRID DEPLOYMENT                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. AT THE MNAO OFFICE DESK (Main Warehouse PC / Laptop)                          |
|     -> Use: DESKTOP APP (NutriVision.exe)                                         |
|     -> Reason: Fast local OCR scanning of delivery receipts + dedicated station   |
|                                                                                   |
|  2. ON THE GO & IN THE FIELD (Staff Phones, Tablets, Remote Laptops)              |
|     -> Use: WEB APP (nutrivision-mnao.vercel.app)                                 |
|     -> Reason: 0 MB download, instant access from any device in any barangay      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 5. 30-Second Presentation Pitch for MNAO Leadership

When explaining this to the MNAO panel, say:

> *"We built NutriVision in two versions so our office gets the best of both worlds:*
>
> *1. **The Desktop App** is built for our main warehouse computer. Because the AI scanning engine is installed right on the PC, scanning delivery receipts and batch numbers is **fast and instantaneous**, without lagging over office Wi-Fi.*
>
> *2. **The Web App** requires **zero downloads and zero storage space**. Any staff member can open it on their phone, tablet, or laptop while visiting barangays or checking milk bank records on the go.*
>
> *Best of all, **both versions connect to the exact same cloud database**, so your inventory is always 100% updated and synchronized across all devices in real time."*

---

*Document prepared for Municipal Nutrition Action Office (MNAO), Manolo Fortich.*
