# NutriVision: MNAO System Guide & Presentation Walkthrough
**Municipal Nutrition Action Office (MNAO) — Municipality of Manolo Fortich, Bukidnon**

---

## 1. Executive Summary: What is NutriVision?

**NutriVision** is an intelligent, specialized inventory and operations management system engineered specifically for the **Municipal Nutrition Action Office (MNAO)** of Manolo Fortich.

### The Purpose
Before NutriVision, tracking nutrition commodities, supplementary feeding supplies, and donor breast milk relied on paper logbooks, manual spreadsheets, and physical checks. This often led to:
- Overlooked expiration dates and wasted high-value nutrition commodities.
- Difficulty tracking which barangays received specific batches.
- Labor-intensive month-end report generation.
- Vulnerability in human donor milk cold-chain monitoring.

### The Solution
NutriVision digitizes the entire lifecycle of MNAO supplies:
1. **Prevents Expiration Waste**: Automatically enforces **FEFO (First-Expired, First-Out)** so the oldest safe stock is always dispatched first.
2. **Actionable Intelligence**: The **Inventory Advisor** monitors batches 24/7 and highlights items needing attention 30, 60, and 90 days before expiration.
3. **Dedicated Human Milk Bank Management**: Tracks donor intake, pasteurization records, freezer storage location down to the shelf level, and infant recipient dispensing.
4. **Complete Accountability**: Every single transaction—from receiving a box of Micronutrient Powder to dispensing milk—is permanently logged in a tamper-resistant audit trail.
5. **Multi-User Real-Time Cloud Synchronization**: Built with a centralized cloud database (Supabase), ensuring that whenever an administrator or nutrition worker updates inventory on one device, all other staff and office computers immediately see the exact same stock levels in real time without conflicting records.
6. **Dedicated Desktop & Web Access**: Available as a **convenient standalone desktop application** (`NutriVision.exe`) with built-in offline document OCR scanning, as well as a **web application** accessible from any modern browser.

---

## 2. Complete Module-by-Module Guide

---

### Module 1: Dashboard (Executive Command Center)

#### Purpose
The starting point for every session. Provides administrators and nutrition officers with an immediate, high-level snapshot of office operations within five seconds of signing in.

#### Key Features
- **Top Metric Cards**:
  - *Total Commodities*: Count of registered commodity types in the active catalog.
  - *Total Batches*: Active physical delivery lots currently in storage.
  - *Near Expiry*: Immediate counter of batches expiring within the next 90 days.
  - *Expired*: Urgent counter of batches that have passed expiration and require quarantine or disposal.
- **Quick Action Bar**: One-click shortcuts to key tasks:
  - `Milk Bank` (Opens Human Milk Bank module)
  - `Bulk Release` (Dispatches supplies to multiple barangays)
  - `Add Batch` (Registers a newly received delivery)
  - `Add Commodity` (Registers a new nutrition product item)
  - `Calendar` (Opens feeding program schedules)
  - `Advisor` (Opens detailed health diagnosis and action recommendations)
- **Advisor Action Summary**: Color-coded alert chips showing exact counts of Expired Batches, Nearing Expiry, Low Stock, and Upcoming Events.
- **Interactive Alert Rows**: Direct links allowing users to click on any urgent batch notice to immediately inspect and take action.

#### How to Navigate
1. Upon logging in, look at the **Top Metric Cards** for red or amber warning badges.
2. Click any chip in the **Advisor Action Summary** (e.g., `Expired Batches`) to expand and see the specific items.
3. Click any batch row to jump directly to that batch in the **Batches** module.
4. Use the green/orange top action buttons to perform high-frequency daily tasks without navigating through sidebar menus.

---

### Module 2: Inventory Advisor (Smart Operations Radar)

#### Purpose
Serves as an automated digital assistant that audits the warehouse inventory continuously. It removes the guesswork by telling staff *what* requires attention, *why*, and *what exact action to take*.

#### Key Features
- **Four Categorized Alert Hubs**:
  1. *Expired Batches*: Identifies stocks that can no longer be distributed to children or mothers. Offers a direct button to **Archive / Log Defect**.
  2. *Nearing Expiry (90 Days)*: Warns staff weeks in advance so supplies can be prioritized for upcoming supplementary feeding programs. Offers a direct button to **Dispatch Batches**.
  3. *Low Stock Alerts*: Triggers when stock levels fall below minimum safety thresholds. Offers a direct button to **Add Stocks**.
  4. *Program Events (30 Days)*: Cross-references inventory with scheduled nutrition events on the calendar to prevent supply shortages. Offers a direct button to **View Calendar**.
- **Inventory by Commodity Overview**: Shows total quantity on hand per item, remaining units, and stock status (*Optimal*, *Low*, *Critical*).
- **Expiring Soon Radar**: A chronological timeline highlighting exact days remaining or days overdue.

#### How to Navigate
1. Click **Advisor** in the left sidebar (or click the green **Advisor** button on the Dashboard).
2. Review the top summary cards and click any status chip to expand its specific batch list.
3. Use the contextual action buttons (e.g., `Dispatch Batches` or `Archive this Batch`) to immediately resolve the issue.

---

### Module 3: Commodities Catalog (Master Item Register)

#### Purpose
The master directory of all nutrition goods approved and handled by MNAO (e.g., Micronutrient Powder, Lipid-based Nutrient Supplements, Iron with Folic Acid, Fortified Rice Porridge).

#### Key Features
- **Standardized Item Specifications**: Name, item code, dosage/unit form (box, sachet, tablet, pack), target beneficiary group, and category.
- **Real-Time Total Stock Counter**: Calculates total physical units on hand aggregated across all active batches.
- **Reorder Thresholds**: Customizable low-stock warning triggers per commodity.
- **Add / Edit Commodity Modal**: Simple form to register newly introduced nutrition programs.
- **Stock Card & Traceability**: Clean breakdown of active vs. exhausted batches associated with each item.

#### How to Navigate
1. Click **Commodities** in the left sidebar.
2. Use the search bar to locate an item by name or category.
3. Click on any commodity card/row to view its complete stock profile and associated batches.
4. Click **+ Add Commodity** in the top right corner to introduce a new supply type to the office catalog.

---

### Module 4: Batch Management (Deliveries & Expiration Tracking)

#### Purpose
Tracks every specific shipment lot received by MNAO from DOH, the Provincial Health Office, or LGU procurement.

#### Key Features
- **FEFO Color-Coded Expiration Status Badges**:
  - *Good (> 6 Months)*: Green badge. Safe for general storage.
  - *Moderate (3 - 6 Months)*: Yellow badge. Approaching priority window.
  - *Near Expiry (< 3 Months)*: Orange warning badge. Should be prioritized for immediate release.
  - *Expired*: Red alert badge. Prohibited from human consumption; highlighted for disposal.
- **Comprehensive Batch Metadata**: Batch number, supplier/source (e.g., DOH, LGU), delivery date, initial quantity received, current remaining quantity, and exact expiration date.
- **Bulk Batch Registration**: Allows receiving multiple batches from a single delivery invoice at once.
- **Void & Archive Workflow**: When removing an incorrect or expired batch, staff select from standardized audit reasons:
  - *Expired Stock*
  - *Data Entry Error*
  - *Other (with mandatory explanation)*

#### How to Navigate
1. Click **Batches** in the left sidebar.
2. Filter by commodity or expiration status using the top filter dropdowns.
3. Click **Release** on any batch row to quickly dispense units from that lot.
4. Click the **Trash / Void** icon to safely archive a batch, selecting the official reason for office audit compliance.

---

### Module 5: Releases & Bulk Distribution (Barangay Dispatch)

#### Purpose
Manages the outward distribution of nutrition commodities to the 31 barangays of Manolo Fortich, barangay nutrition scholars (BNS), rural health units (RHUs), and feeding centers.

#### Key Features
- **Strict FEFO Enforcement**: Automatically selects and suggests the earliest-expiring batch to ensure commodities are consumed before they spoil.
- **Single & Bulk Release Workflows**:
  - *Single Release*: Quick dispatch of one item to a specific recipient.
  - *Bulk Release*: Distribute multi-commodity ration packages across multiple barangays in one streamlined operation.
- **Barangay Beneficiary Ledger**: Captures destination barangay, receiving personnel/officer name, purpose/program name, date, and authorized quantities.
- **Printable Distribution Receipts**: Generates clean, printable documentation for signing upon physical turnover of supplies.

#### How to Navigate
1. Click **Releases** in the left sidebar (or click the orange **Bulk Release** button on the Dashboard).
2. Select whether you are performing a **Single Release** or a **Bulk Release**.
3. Select the target barangay, receiving officer, and commodity quantities.
4. Confirm release to instantly deduct items from active inventory and generate the distribution record.

---

### Module 6: Human Milk Bank (Specialized Cold-Chain Operations)

#### Purpose
A specialized, clinically compliant module tailored for MNAO's Pasteurized Human Donor Milk (PHDM) program to support premature, low-birth-weight, and vulnerable infants.

#### Key Features
- **Four Integrated Operational Tabs**:
  1. *Log of Milk Received*: Digital entry sheet for raw donor milk donations (donor code, collection date, volume in mL, medical screening status). Includes instant **Export Excel (CSV)** and **Export Form (PDF)**.
  2. *Pasteurized Batches*: Tracks pasteurization batch codes, pooling dates, microbiological clearance status, pasteurization completion dates, and post-pasteurization shelf life.
  3. *Dispensing Ledger*: Logs every infant recipient (mother/guardian name, infant name, indication, admitting facility/barangay, prescribing doctor, quantity of bags dispensed).
  4. *Milk Bank Audit Trail*: A complete record of all donor milk activities (intakes, pasteurizations, freezer shelf relocations, infant dispenses) accessible to all health personnel.
- **Interactive Freezer & Shelf Visualizer**:
  - Visual layout of upright freezers (e.g., Upright Freezer A, Freezer B).
  - Shelf-by-shelf inspection showing exactly which pasteurized bags are stored on which shelf.
  - Drag-and-drop or one-click shelf relocation to keep physical freezers organized.

#### How to Navigate
1. Click **Milk Bank** in the left sidebar.
2. View top stat cards: *Available Pasteurized (Bags)*, *Raw / Unpasteurized (Intakes)*, *Expiring ≤ 30 Days*, and *Dispensed This Month*.
3. Switch between the 4 sub-tabs (*Log of Milk Received*, *Pasteurized Batches*, *Dispensing Ledger*, *Audit Trail*) based on your immediate task.
4. To check freezer storage, inspect the shelf cards on the right side of the Pasteurized Batches view.

---

### Module 7: Defect & Quarantine Log (Quality Control)

#### Purpose
Ensures that substandard, damaged, contaminated, or expired commodities are immediately quarantined from active circulation to protect public health.

#### Key Features
- **Defect Classifications**:
  - Expired Stock
  - Packaging Damage / Torn Foil
  - Water Damage / Moisture Infiltration
  - Pest Infestation / Foreign Material
  - Cold Chain Temperature Compromise
- **Quarantine Holding vs. Condemnation/Disposal**:
  - Quarantined items are safely subtracted from distributable stock while pending inspection.
  - Final disposal records document approved condemnation method, authorized witnessing officer, and disposal certificate details.

#### How to Navigate
1. Click **Defect Log** in the left sidebar.
2. Click **+ Log Defect** to report damaged or compromised stock.
3. Select the affected batch, quantity, defect classification, and upload or attach notes.
4. View the table of quarantined vs. disposed supplies for government compliance review.

---

### Module 8: Data Archive & Historical Records (Compliance & Recovery)

#### Purpose
A secure historical repository where depleted, voided, and archived inventory records are preserved for auditing without cluttering daily active screens.

#### Key Features
- **Segmented Filter Chips**:
  - *All Records*: Comprehensive view of all archived items.
  - *Expired Stock*: Batches archived due to expiration.
  - *Data Entry Errors*: Inadvertently created batches voided by staff.
  - *Other Voided*: Special void actions with custom administrative remarks.
  - *Depleted Batches*: Fully distributed lots where remaining stock reached zero.
  - *Archived Commodities*: Phased-out commodity lines.
- **Search & Inspection**: Quickly look up historical lot numbers from prior years.
- **Restore Capability**: Authorized administrators can restore an inadvertently voided batch back to active inventory with a single click.

#### How to Navigate
1. Click **Archive** in the left sidebar.
2. Use the horizontal filter tabs (e.g., `Expired Stock`, `Depleted Batches`) to view specific record categories.
3. Click **View Details** to examine the full history of when the batch was received, who voided it, and the recorded justification.

---

### Module 9: Operations Calendar (Programs & Feeding Schedules)

#### Purpose
Connects inventory availability with on-the-ground nutrition events, supplemental feeding schedules, and Barangay Nutrition Scholar (BNS) assemblies.

#### Key Features
- **Monthly / Weekly / Daily View**: Clean calendar layout displaying upcoming MNAO activities.
- **Event-Inventory Linking**: Flag events that require commodity supplies (e.g., *"Operation Timbang Plus"*, *"First 1000 Days Feeding Phase 2"*).
- **Early Supply Warning**: Alerts staff if scheduled events exceed currently available stock.

#### How to Navigate
1. Click **Calendar** in the left sidebar.
2. Click on any date to add a new nutrition event or review planned distributions.
3. Check the event badge details to confirm required commodities are reserved.

---

### Module 10: Reports & Analytics (Government Compliance)

#### Purpose
Generates official, print-ready and spreadsheet-ready reports required for LGU executive reviews, Provincial Nutrition Committee submissions, and National Nutrition Council (NNC) audits.

#### Key Features
- **Standard MNAO Report Types**:
  - Monthly Commodity Inventory Status Report
  - FEFO Expiration Compliance Analysis
  - Barangay Distribution Breakdown
  - Milk Bank Collection and Dispensing Summary
  - Waste & Defect Loss Log
- **Export Options**: Export in one click to **Microsoft Excel (.CSV)** or professional **PDF Document** with official MNAO headers.

#### How to Navigate
1. Click **Reports** in the left sidebar.
2. Select the desired report type and target date range (e.g., Current Month, Last Quarter).
3. Preview the live data on screen, then click **Export Excel (CSV)** or **Print / Export PDF**.

---

### Module 11: User Management & Role Security (Admin Only)

#### Purpose
Protects sensitive health records and prevents unauthorized inventory modifications through role-based access control.

#### Roles
1. **Administrator (MNAO Head / System Admin)**:
   - Full access to all modules, system configurations, user account creation, data restoration, and complete audit logs.
2. **Nutrition Personnel / Healthcare Staff**:
   - Access to daily inventory operations: registering intakes, dispatching barangay releases, logging milk bank activities, and viewing reports.
   - Restricted from altering user permissions or deleting master system configuration.

#### How to Navigate
1. Click **User Management** under the Administration section in the sidebar.
2. View existing active staff members and their assigned roles.
3. Click **+ Add User** to invite a new nutrition worker with specified credentials.

---

### Module 12: Central Audit Logs (Admin Only)

#### Purpose
The immutable accountability ledger. Every change made in NutriVision—who logged in, what batch was updated, how many units were released, what reason was entered for a deletion—is recorded with a millisecond timestamp and staff name.

#### Key Features
- **Tamper-Resistant Logging**: Records cannot be edited or deleted by any user.
- **Filter by Activity**: Filter specifically for Commodities, Batches & Distributions, Defects & Quarantine, or Milk Bank operations.
- **Searchable**: Search by staff name, batch code, or action description.

#### How to Navigate
1. Click **Audit Logs** in the sidebar.
2. Select an activity category from the filter dropdown (e.g., *Batches & Distributions*).
3. Review the chronological trail of actions for compliance checks.

---

## 3. Recommended 10-Minute Presentation Script & Flow

Use this structured sequence during your presentation to MNAO leadership and staff:

```
+-------------------------------------------------------------------------------+
|                      RECOMMENDED PRESENTATION FLOW (10 MIN)                   |
+-------------------------------------------------------------------------------+
|  1. The "Why" (1 min)       | Present the problem of manual logbooks & FEFO  |
|  2. Dashboard (2 mins)      | Walk through high-level metrics & quick actions|
|  3. Advisor in Action (2 min)| Show how the system warns before stock expires  |
|  4. Barangay Release (2 min)| Demo a First-Expired, First-Out supply dispatch|
|  5. Milk Bank Demo (2 mins) | Show donor intake & visual freezer shelves     |
|  6. Reports & Audit (1 min) | Generate a 1-click report; emphasize security  |
+-------------------------------------------------------------------------------+
```

### Minute 1: The Problem & The Vision
> *"Good day, Ma'am/Sir and the MNAO team. Today we present NutriVision—a system built specifically for Manolo Fortich to ensure that no nutrition commodity ever expires unnoticed, every sachet and bottle is accounted for across our 31 barangays, and our Human Milk Bank operations operate with clinical precision."*

### Minutes 2–3: The Dashboard & The Advisor
> *"When you open the system, the Dashboard immediately gives you the vital signs of our warehouse: total active items, total batches, and items nearing expiry. Notice our Inventory Advisor: you don't need to manually calculate dates. The system flags batches 90 days ahead, color-coding them and telling you exactly what action to take."*

### Minutes 4–5: Managing Batches & FEFO Barangay Release
> *"When a delivery arrives, we record it under Batches. When Barangay Damilag or Tankulan requests supplies, we go to Releases. NutriVision automatically suggests the batch with the earliest expiration date—our FEFO rule. This ensures we never distribute new stock while older stock sits on the shelf."*

### Minutes 6–7: Human Milk Bank & Freezers
> *"For our Human Milk Bank, NutriVision tracks the journey of every drop of breast milk: from raw donation intake, to pasteurized batches, to our digital freezer shelves. You can see at a glance what is stored on Shelf 1 or Shelf 2 of Upright Freezer A, and dispense bags directly to vulnerable infants with a complete trail."*

### Minutes 8–9: Quality Control & Data Archive
> *"If a box is damaged or water-compromised, it is logged in the Defect Log and quarantined so it cannot be accidentally released. When records are voided or depleted, they are safely preserved in our Data Archive with full audit reasons."*

### Minute 10: Reports & Summary
> *"Finally, monthly reporting that previously took hours can now be generated with one click under Reports in Excel or official PDF format. NutriVision brings speed, accuracy, and full transparency to MNAO operations."*

---

## 4. Anticipated Questions & Answers (FAQ)

**Q1: Does NutriVision require an internet connection?**
> *Yes. NutriVision connects to a secure central cloud database (Supabase). An internet connection (office Wi-Fi or mobile data hotspot) is required to retrieve and synchronize live inventory data.*
>
> *This cloud-synchronized design is deliberate and vital for MNAO: if multiple staff members record deliveries, release batches to barangays, or dispense donor milk across different laptops and tablets, everyone sees the exact same updated quantities in real time. This completely prevents duplicate distributions, inventory discrepancies, and data conflicts.*
>
> *What the Desktop App (`NutriVision.exe`) provides is a dedicated native Windows workspace: instant launch without browser bookmarks, faster rendering, and an embedded local RapidOCR computer vision engine for document and invoice scanning.*

**Q2: Can staff accidentally delete an active batch without anyone knowing?**
> *No. NutriVision does not permit silent deletions. Deleting a batch requires selecting an official reason (Expired Stock, Data Entry Error, or Other with explanation). The record is preserved in the Data Archive, and the action is permanently written to the Central Audit Log with the staff member's name and timestamp.*

**Q3: Can ordinary staff alter system users or security settings?**
> *No. User Management and Central Audit Logs are restricted strictly to Administrators. Nutrition personnel have access to daily operational modules (Batches, Commodities, Releases, Milk Bank, Reports) while administrative controls remain protected.*

**Q4: How does the system handle different units of measure?**
> *Each commodity defines its native packaging (Box, Sachet, Tablet, Bottle, Pack). Batch quantities and release balances are accurately calculated in those specific units to prevent unit confusion.*

---

*Document prepared for Municipal Nutrition Action Office (MNAO), Municipality of Manolo Fortich, Bukidnon.*  
*NutriVision Version 1.0 (Production Release)*

