/**
 * NutriVision Module Manual & Navigation Guides (#95)
 *
 * Contextual instructions explaining how to navigate and operate every
 * page and full-screen workspace in NutriVision.
 */

export const MODULE_GUIDES_ORDER = [
  'dashboard',
  'advisor',
  'commodities',
  'batches',
  'batches-workspace',
  'releases',
  'bulk-release',
  'archive',
  'milk',
  'calendar',
  'reports',
  'defects',
  'users',
  'audit-logs',
  'account',
];

export const MODULE_GUIDES = {
  dashboard: {
    key: 'dashboard',
    title: 'Dashboard',
    icon: 'dashboard',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Provides an at-a-glance operational command center of MNAO commodity stock health, urgent expiration alerts, distribution charts, and recent staff activity.',
    navigation: [
      {
        label: 'Quick Action Bar',
        detail: 'Top shortcut buttons let you jump straight to Milk Bank, Bulk Release, or Bulk Batch Registration (+ Add Batch).',
      },
      {
        label: '4 Summary KPI Cards',
        detail: 'Shows live counts of Registered Commodities, Active In-Stock Batches, Near-Expiry Batches, and Expired Batches.',
      },
      {
        label: 'Inventory Advisor Banner',
        detail: 'Highlights priority stock alerts and links directly to the full Inventory Advisor action center.',
      },
      {
        label: 'Analytics & Activity Feed',
        detail: 'Displays visual inventory breakdown charts alongside the latest recorded actions across staff.',
      },
      {
        label: 'Return Home Anytime',
        detail: 'Click the NutriVision sidebar logo or the Municipal Nutrition Action Office header emblem from any screen to return here.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Check Daily Stock Health First',
        detail: 'Review the Near Expiry and Expired KPI cards at the start of shifts to see if any batches need immediate dispatch or archiving.',
      },
      {
        stepTitle: 'Act on Advisor Warnings',
        detail: 'If the Advisor summary card shows Near-Expiry or Expired items, click View Full Analysis or Bulk Release to prioritize FEFO dispatch.',
      },
      {
        stepTitle: 'Launch Common Tasks in One Click',
        detail: 'Use + Add Batch to log newly delivered supplies or Bulk Release to prepare multi-batch barangay distributions.',
      },
    ],
    rulesAndBadges: [
      'KPI counts strictly include active batches with remaining stock (> 0 units) whose parent commodity is active.',
      'Perishable items (such as 7-Day Nutribuns) automatically follow their custom Commodity Shelf-Life Policy.',
    ],
    relatedRoutes: [
      { route: 'advisor', label: 'Inventory Advisor' },
      { route: 'batches', label: 'Batches' },
      { route: 'releases', label: 'Releases' },
    ],
  },

  advisor: {
    key: 'advisor',
    title: 'Inventory Advisor',
    icon: 'insights',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Analyzes active MNAO stock health and guides staff on exactly which batches to release first (FEFO) or remove from active circulation.',
    navigation: [
      {
        label: 'Interactive Status Chips',
        detail: 'Click Expired, Near Expiry, Moderate, or Good summary chips to expand a drill-down list of matching batches.',
      },
      {
        label: 'Batch Drill-Down Cards',
        detail: 'Click any batch card inside the drill-down panel to jump straight to Batch Management with that exact row highlighted.',
      },
      {
        label: 'Analytics Carousel Tabs',
        detail: 'Switch between Barangay Distribution, Stock Levels by Commodity, and Expiration Status Breakdown charts.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Inspect Urgent Categories',
        detail: 'Click the Expired or Near Expiry chip to see every batch requiring immediate attention, along with remaining days and stock count.',
      },
      {
        stepTitle: 'Dispatch Near-Expiry Stock (FEFO)',
        detail: 'Use the Bulk Release shortcut to allocate Near-Expiry batches to barangays before newer deliveries are touched.',
      },
      {
        stepTitle: 'Isolate & Archive Expired Batches',
        detail: 'Click an expired batch card to jump to Batches, then void/archive it under Expired Stock so it cannot be accidentally released.',
      },
    ],
    rulesAndBadges: [
      'FEFO (First-Expired, First-Out): Always prioritize Near-Expiry and Moderate batches for barangay distribution.',
      'Expired batches (0 days or overdue) are blocked from distribution and should be archived or logged for disposal.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'bulk-release', label: 'Bulk Release' },
      { route: 'archive', label: 'Archive' },
    ],
  },

  commodities: {
    key: 'commodities',
    title: 'Commodity Management',
    icon: 'inventory_2',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Maintains the master catalog of nutrition commodities, product photos, measurement units, SKU codes, and custom perishable shelf-life policies.',
    navigation: [
      {
        label: 'Cards vs. Table View Toggle',
        detail: 'Switch between the visual Photo Card Grid (default) and the compact Table View; your preference is saved automatically.',
      },
      {
        label: 'Search & Category Filter',
        detail: 'Filter catalog items by name, SKU code, or nutrition category (Vitamins, Minerals, Bakery / Perishables, Therapeutics, etc.).',
      },
      {
        label: 'Lightbox Photo Preview',
        detail: 'Click any commodity photo card to inspect a full-resolution preview along with category, SKU, and live stock summary.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Register a New Commodity',
        detail: 'Click + Add Commodity, enter the name, category, and base unit (e.g., Pack, Tablet, Piece). An SKU code is generated automatically.',
      },
      {
        stepTitle: 'Upload a Commodity Photo (Optional)',
        detail: 'Drag-and-drop or browse a product image in the modal. If left blank, NutriVision assigns a clean category artwork illustration.',
      },
      {
        stepTitle: 'Configure Perishable Shelf-Life Policy',
        detail: 'For short-lived goods like E-Nutribun (7-day weekly dispatch), set custom Shelf-Life & Traffic-Light thresholds in the commodity form.',
      },
      {
        stepTitle: 'Edit or Archive Safely',
        detail: 'Use Edit to update details/photos, or Archive when a commodity is discontinued and has zero remaining active stock.',
      },
    ],
    rulesAndBadges: [
      'Active-Stock Archive Guard: A commodity cannot be archived while it still has active batches with stock > 0. Release or void remaining batches first.',
      'Archived commodities can be restored anytime from the Archive module.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'archive', label: 'Archive' },
    ],
  },

  batches: {
    key: 'batches',
    title: 'Batch Management',
    icon: 'package_2',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Tracks every physical delivery batch, remaining stock quantity, auto-formatted batch code, and real-time Traffic-Light expiration status.',
    navigation: [
      {
        label: 'Expiration Guide Bar',
        detail: 'Displays standard Traffic-Light thresholds: Good (> 6 months), Moderate (3–6 months), Near Expiry (1–90 days), and Expired (≤ 0 days).',
      },
      {
        label: 'Commodity, Status & Search Filters',
        detail: 'Narrow down batches by specific commodity, Traffic-Light status, or partial batch code / commodity keyword.',
      },
      {
        label: '+ Add Batch Button',
        detail: 'Opens the full-screen Bulk Batch Registration spreadsheet & scanner workspace for single or multi-batch intake.',
      },
      {
        label: 'Row Action Buttons',
        detail: 'Each batch row offers single-batch Release, Edit (delivery/expiry/supplier corrections), and Void / Archive.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Log Incoming Deliveries',
        detail: 'Click + Add Batch to open the Bulk Batch Registration workspace and record one or multiple delivered batches at once.',
      },
      {
        stepTitle: 'Release a Single Batch Quickly',
        detail: 'Click the Release icon on a valid batch row to dispatch stock to a single barangay. For multi-batch dispatches, go to Releases -> Bulk Release.',
      },
      {
        stepTitle: 'Correct or Void Batches',
        detail: 'Use Edit to fix clerical dates/suppliers, or Void to move expired stock or data-entry mistakes into the Archive with a documented reason.',
      },
    ],
    rulesAndBadges: [
      'Delivery Date and Expiration Date are mandatory on all batches to ensure accurate FEFO sorting and audit traceability.',
      'Expired batches cannot be released; void them under Expired Stock or log damaged stock in Defect Log.',
    ],
    relatedRoutes: [
      { route: 'releases', label: 'Releases Ledger' },
      { route: 'commodities', label: 'Commodities' },
      { route: 'defects', label: 'Defect Log' },
    ],
  },

  'batches-workspace': {
    key: 'batches-workspace',
    title: 'Bulk Batch Registration',
    icon: 'qr_code_scanner',
    theme: 'green',
    adminOnly: false,
    purpose:
      'High-speed spreadsheet and scanner intake workspace for registering multiple incoming commodity deliveries in one transaction.',
    navigation: [
      {
        label: 'Left Collapsible Scanner Pane',
        detail: 'Scan barcodes or parse delivery receipt text into rows, or click the hamburger button to collapse the pane for a full-width grid.',
      },
      {
        label: 'fx Formula Bar & Inline Cell Expansion',
        detail: 'Click any cell to view/edit full text in the top fx bar; long commodity names and notes also expand inline while focused.',
      },
      {
        label: 'Live Batch Code Preview',
        detail: 'Automatically builds standardized codes (SKU-DELyymm-EXPyymm-SUP) as you fill in Commodity, Dates, and Supplier.',
      },
      {
        label: 'Footer Breakdown Pills',
        detail: 'Shows X Batches · Y Commodities along with sky-blue New (Flagged) vs. Existing catalog counts and Total Units.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Select or Type a Commodity',
        detail: 'Pick an existing catalog item or type a brand-new commodity name. New items turn sky-blue (New Flagged) and auto-infer Category & Unit.',
      },
      {
        stepTitle: 'Complete Mandatory Columns (*)',
        detail: 'Enter Category, Unit, Quantity (> 0), Delivery Date, and Expiration Date. Supplier and Notes are optional.',
      },
      {
        stepTitle: 'Add, Split, or Remove Rows',
        detail: 'Click + Add New Row Manually for more items, use the Split icon to divide a delivery across two expiry dates, or Delete unneeded rows.',
      },
      {
        stepTitle: 'Register All Batches',
        detail: 'Once the status pill turns ready, click Register All Batches. Any flagged new commodities are automatically added to the catalog too.',
      },
    ],
    rulesAndBadges: [
      'Sky-blue rows indicate new commodities not yet in your catalog — NutriVision creates them automatically when you save.',
      'Duplicate batch codes within the same commodity are merged or flagged to keep batch identifiers unique.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'commodities', label: 'Commodities' },
    ],
  },

  releases: {
    key: 'releases',
    title: 'Releases Ledger',
    icon: 'local_shipping',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Records and audits all commodity dispatches distributed from MNAO to the 22 barangays of Manolo Fortich, and launches multi-batch Bulk Release.',
    navigation: [
      {
        label: 'Top-Right Bulk Release Button',
        detail: 'Opens the full-screen Bulk Release Manifest workspace to dispatch multiple batches to a barangay in one manifest.',
      },
      {
        label: 'Commodity, Barangay & Search Filters',
        detail: 'Filter the release ledger by specific commodity, destination barangay, recipient name, or batch code.',
      },
      {
        label: 'Expandable Ledger Rows',
        detail: 'Click any release row in the table to toggle its hidden detail drawer showing Supplier / Source and Release Notes.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Dispatch Multiple Batches',
        detail: 'Click Bulk Release in the top-right corner to select active batches, set quantities, and record a barangay distribution.',
      },
      {
        stepTitle: 'Verify Past Barangay Distributions',
        detail: 'Select a Barangay from the dropdown or type a recipient/BNS name in the search box to audit historical dispatches.',
      },
      {
        stepTitle: 'Inspect Supplier & Notes',
        detail: 'Click any row in the ledger to view which supplier provided the batch and any remarks entered during release.',
      },
    ],
    rulesAndBadges: [
      'Every confirmed release automatically deducts stock from the source batch; batches reaching 0 units transition cleanly to Depleted in Archive.',
      'Export formal Barangay Distribution Summary sheets anytime from the Reports module.',
    ],
    relatedRoutes: [
      { route: 'bulk-release', label: 'Open Bulk Release' },
      { route: 'batches', label: 'Batch Management' },
      { route: 'reports', label: 'Reports' },
    ],
  },

  'bulk-release': {
    key: 'bulk-release',
    title: 'Bulk Release Manifest',
    icon: 'shopping_cart_checkout',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Dispatches multiple active commodity batches to a single destination barangay in one FEFO-guided release transaction.',
    navigation: [
      {
        label: 'Left Panel — Active Batch Selector',
        detail: 'Displays non-expired in-stock batches sorted by FEFO (Nearest Expiry First), with search, commodity filter, and sort selector.',
      },
      {
        label: 'Right Panel — Dispatch Cart & Destination Form',
        detail: 'Shows full unwrapped commodity names and batch codes for every selected batch, per-batch Release Qty inputs, and barangay recipient fields.',
      },
      {
        label: 'Back to Releases Button',
        detail: 'Exits the workspace and returns directly to the updated Releases Ledger.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Select Batches Following FEFO',
        detail: 'Check one or more batches on the left table (starting from the top FEFO rows so nearest-expiry items leave first).',
      },
      {
        stepTitle: 'Set Release Quantities in Dispatch Cart',
        detail: 'In the right-hand Dispatch Cart, enter the exact Release Qty for each selected batch (up to its available active stock).',
      },
      {
        stepTitle: 'Enter Barangay & Recipient Details',
        detail: 'Choose the destination Barangay, enter the receiving BNS / official Recipient Name, verify the Release Date, and add optional notes.',
      },
      {
        stepTitle: 'Confirm & Release Stock',
        detail: 'Click Confirm & Release Stock to deduct quantities, log audit entries, and record all dispatches to the Releases Ledger.',
      },
    ],
    rulesAndBadges: [
      'FEFO Default Sort: Batches closest to expiration appear at the top so staff naturally prevent stock wastage.',
      'Release quantities cannot exceed available active units on hand.',
    ],
    relatedRoutes: [
      { route: 'releases', label: 'Releases Ledger' },
      { route: 'batches', label: 'Batch Management' },
    ],
  },

  archive: {
    key: 'archive',
    title: 'Archive',
    icon: 'archive',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Preserves historical, depleted, expired, and voided batches alongside archived commodities so active views stay clean without losing audit history.',
    navigation: [
      {
        label: 'Search & Category Dropdown',
        detail: 'Search across batch codes, commodities, void reasons, or staff names, or switch categories from the dropdown.',
      },
      {
        label: 'Quick Filter Pills',
        detail: 'One-click pills filter between All Records, Expired Stock, Data Entry Errors, Other Voided, Depleted Batches, and Archived Commodities.',
      },
      {
        label: 'Restore & History Actions',
        detail: 'Depleted batches let you inspect full release history; Archived Commodities offer a 1-click Restore button.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Audit Expired or Voided Stock',
        detail: 'Click Expired Stock or Data Entry Errors pills to review why batches were removed and which staff member recorded the action.',
      },
      {
        stepTitle: 'Trace Fully Consumed Batches',
        detail: 'Select Depleted Batches to inspect batches whose stock reached 0 through legitimate barangay releases.',
      },
      {
        stepTitle: 'Restore a Discontinued Commodity',
        detail: 'Open Archived Commodities and click Restore if MNAO resumes receiving that commodity in future deliveries.',
      },
    ],
    rulesAndBadges: [
      'NutriVision never hard-deletes inventory history — archived and voided records remain permanently traceable for COA/MNAO audits.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'commodities', label: 'Commodities' },
    ],
  },

  milk: {
    key: 'milk',
    title: 'Milk Bank',
    icon: 'water_drop',
    theme: 'blue',
    adminOnly: false,
    purpose:
      'Manages human donor breastmilk intake (Form MH.MNAO.FM.002.00), pasteurized BM-XXX batches, Virtual Freezer shelf mapping, infant dispensing, and Milk Bank audit reports.',
    navigation: [
      {
        label: 'Top 4 Milk Metrics Cards',
        detail: 'Live volume indicators for Available Pasteurized Milk (mL), Active Pasteurized Batches, Raw Milk Awaiting Pasteurization, and Total Dispensed.',
      },
      {
        label: 'Tab 1 — Freezer Inventory',
        detail: 'Interactive Virtual Freezer Map + Pasteurized Batch table with 1-year expiry Traffic-Light badges, shelf relocation, and Dispense triggers.',
      },
      {
        label: 'Tab 2 — Donation Intake',
        detail: 'Logs expressed breastmilk from donor mothers (real Donor Name, barangay, volume mL, expression date) and pools raw milk into pasteurized batches.',
      },
      {
        label: 'Tab 3 — Dispense Log',
        detail: 'Chronological ledger of milk dispensed to recipient infants with clinical indication and printable PDF summaries.',
      },
      {
        label: 'Tab 4 — Audit Trail',
        detail: 'Read-only chronological log of all Milk Bank actions with action filter and Export PDF official print preview.',
      },
      {
        label: 'Tab 5 — Analytics & Distribution',
        detail: 'Executive distribution charts across barangays, individual Top Donor Mothers volume charts, award recognition podium (1st, 2nd, 3rd), and printable Award Giving summary PDF.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Record Donor Milk Intake',
        detail: 'Open Donation Intake, enter the Donor Name, Barangay, Volume (mL), and Expression Date, then save the donation entry.',
      },
      {
        stepTitle: 'Pasteurize & Assign Freezer Shelf',
        detail: 'Pool raw donor milk into a pasteurized batch (BM-XXX), pick a Freezer Unit & Shelf Location; expiry auto-sets to 1 year from pasteurization.',
      },
      {
        stepTitle: 'Dispense Pasteurized Milk to Infants',
        detail: 'In Freezer Inventory, click Dispense on a valid non-expired batch, record recipient infant details, barangay, indication, and mL dispensed.',
      },
      {
        stepTitle: 'Review Distribution & Honor Top Donors',
        detail: 'Open Analytics & Distribution to review barangay infant dispensing charts, award citations for top donor mothers, and export official Award Giving summary PDFs.',
      },
      {
        stepTitle: 'Export Official Milk Bank PDFs',
        detail: 'Use Export PDF inside Dispense Log or Audit Trail to preview and print official MNAO Milk Bank documentation.',
      },
    ],
    rulesAndBadges: [
      '1-Year Pasteurized Expiry Policy: Pasteurized breastmilk expires strictly 1 year from pasteurization date and follows the 4-tier Traffic-Light system.',
      'Expired pasteurized batches (≤ 0 days left) are automatically blocked from infant dispensing.',
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'reports', label: 'Reports' },
    ],
  },

  calendar: {
    key: 'calendar',
    title: 'Program Calendar',
    icon: 'calendar_month',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Unifies MNAO nutrition program schedules, assigned responsible personnel, batch delivery dates, and upcoming batch expirations on one offline-ready calendar.',
    navigation: [
      {
        label: 'Color Legend Chips',
        detail: 'Blue = Batch Delivery, Green/Yellow/Orange/Red = Batch Expiration Traffic-Light status, Purple = Scheduled Program Event.',
      },
      {
        label: 'Month / Week / List View Switcher',
        detail: 'Use top-right calendar controls to toggle between Monthly grid, Weekly schedule, and List Month agenda view (showing Person in Charge pills).',
      },
      {
        label: '+ Add Event & Event Details Modal',
        detail: 'Click + Add Event to schedule an activity, or click any calendar chip to inspect full batch/event details, Edit Event, or Delete Event.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Schedule a Program Event',
        detail: 'Click + Add Event, enter the Event Title, assign a required Person in Charge (pick MNAO staff, click Assign to me, or type a BNS name), and set Date/Time.',
      },
      {
        stepTitle: 'Inspect or Update Existing Events',
        detail: 'Click any purple Program Event on the calendar to view its Person in Charge and notes, then click Edit Event to update details or reassign staff.',
      },
      {
        stepTitle: 'Monitor Upcoming Expirations',
        detail: 'Switch to List Month view to scan all batch expirations and scheduled barangay nutrition activities for the entire month.',
      },
    ],
    rulesAndBadges: [
      'Person in Charge is mandatory on all Program Events so every scheduled barangay or office activity has clear accountability.',
      'Offline-Ready: Custom events save locally when internet drops and sync automatically to Supabase once back online.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'advisor', label: 'Inventory Advisor' },
    ],
  },

  reports: {
    key: 'reports',
    title: 'Analytics & Reporting',
    icon: 'assessment',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Generates, previews, and exports official MNAO inventory, expiration status, and barangay distribution reports in printable PDF and CSV formats.',
    navigation: [
      {
        label: 'Left Column — Official Report Selector',
        detail: 'Choose between Batch Inventory & Expiry Status, Barangay Distribution Summary, or Commodity Stock Summary.',
      },
      {
        label: 'Right Column — Filter Parameters',
        detail: 'Refine your report by Date Range, Barangay, Commodity Category, or Expiration Status before generating.',
      },
      {
        label: 'Live Preview & Export Toolbar',
        detail: 'Review exact rows on screen, then export clean formatted PDF printouts (with MNAO header) or CSV spreadsheets.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Select Your Report Model',
        detail: 'Pick the report card matching your compliance need (e.g., Barangay Distribution Summary for monthly LGU submission).',
      },
      {
        stepTitle: 'Set Date Range & Filters',
        detail: 'Choose start/end dates or filter to a specific barangay/status, then generate the live preview table below.',
      },
      {
        stepTitle: 'Export PDF or CSV',
        detail: 'Click Export PDF for a print-ready official MNAO document with signatory blocks, or Export CSV to open in Excel/Google Sheets.',
      },
    ],
    rulesAndBadges: [
      'PDF previews work identically on both Web browsers and the standalone NutriVision Desktop app.',
    ],
    relatedRoutes: [
      { route: 'releases', label: 'Releases Ledger' },
      { route: 'batches', label: 'Batch Management' },
    ],
  },

  defects: {
    key: 'defects',
    title: 'Stock Returns & Dispositions',
    icon: 'assignment_return',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Universal inventory log sheet for managing Quarantined stock under observation, goods Returned to suppliers, and Disposed / condemned commodities.',
    navigation: [
      {
        label: '+ Log Stock Event Button',
        detail: 'Opens the event dialog to record quarantined holds, supplier returns, or condemned inventory deductions.',
      },
      {
        label: '3 KPI Summary Cards',
        detail: 'Track counts and volume in order: Quarantined (active hold), Returned (supplier returns), and Disposed (condemned).',
      },
      {
        label: 'Category Tabs: Quarantined, Returned, Disposed',
        detail: 'Instantly toggle between stock under observation, supplier returns, and write-offs with live search.',
      },
      {
        label: 'Quarantine Resolution & Slips',
        detail: 'Quarantined rows allow partial or full resolution (Restore to stock, Return to supplier, or Dispose) with on-the-fly printable slips.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Log Suspect or Defective Stock',
        detail: 'Click + Log Stock Event, select the active batch, pick the action (Quarantined, Returned, or Disposed), enter quantity, and document the reason.',
      },
      {
        stepTitle: 'Resolve Quarantined Stock',
        detail: 'Under the Quarantined tab, click Resolve to restore cleared units back to active inventory, send rejected units back to supplier, or condemn them. Any un-resolved units remain under quarantine.',
      },
      {
        stepTitle: 'Generate Official Document Slips',
        detail: 'Click [Slip] on any row to generate an on-the-fly printable document with signature blocks without bloating database storage.',
      },
    ],
    rulesAndBadges: [
      'Quarantined stock is immediately frozen out of active inventory so staff cannot accidentally distribute suspect goods.',
      'SaaS log sheet design maintains instant multi-device synchronization with zero storage bloat.',
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batch Management' },
      { route: 'archive', label: 'Archive' },
    ],
  },

  users: {
    key: 'users',
    title: 'User Management',
    icon: 'group',
    theme: 'green',
    adminOnly: true,
    purpose:
      'Administrator console for provisioning MNAO staff accounts, managing Administrator vs. Nutrition Personnel roles, and controlling active access.',
    navigation: [
      {
        label: 'Staff Summary Cards',
        detail: 'Displays counts of Total Staff, Active Accounts, Administrators, and Deactivated Accounts.',
      },
      {
        label: 'Search, Role & Status Filters',
        detail: 'Locate personnel quickly by name/email or filter by Administrator, Nutrition Personnel, Active, or Inactive.',
      },
      {
        label: '+ Add User & Activity Logs Buttons',
        detail: 'Provision new staff credentials without logging out of your Admin session, or inspect per-user activity logs.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Create a Staff Account',
        detail: 'Click + Add User, enter First Name and Last Name, use the suggested YYYYNNNN@mnao.ph Account ID (or custom email), pick a Role, and set a strong password.',
      },
      {
        stepTitle: 'Update Roles or Reset Passwords',
        detail: 'Use row action buttons on any staff record to promote/demote roles or assist personnel with credential updates.',
      },
      {
        stepTitle: 'Deactivate Former Personnel',
        detail: 'Toggle an account to Inactive when staff leave or rotate; access is revoked immediately while preserving historical audit attribution.',
      },
    ],
    rulesAndBadges: [
      'Administrator-Only Module: Nutrition Personnel cannot view or modify User Management.',
      'All new passwords enforce the 8+ character strong password checklist (uppercase, lowercase, number, and symbol).',
    ],
    relatedRoutes: [
      { route: 'audit-logs', label: 'Audit Logs' },
      { route: 'account', label: 'Account Settings' },
    ],
  },

  'audit-logs': {
    key: 'audit-logs',
    title: 'Audit Logs',
    icon: 'history',
    theme: 'green',
    adminOnly: true,
    purpose:
      'Provides Administrators with a complete, tamper-evident chronological trail of all inventory, commodity, release, defect, and Milk Bank operations.',
    navigation: [
      {
        label: 'Keyword Search Bar',
        detail: 'Search by staff member name, batch number, commodity name, barangay, or action description.',
      },
      {
        label: 'Module Category Filter',
        detail: 'Filter entries by Commodities, Batches & Releases, Defects & Quarantine, or Milk Bank operations.',
      },
      {
        label: 'Paginated Activity Ledger',
        detail: 'Shows exact Philippine local date/time, action badge, acting staff member, and detailed record summary.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Investigate Any Inventory Change',
        detail: 'Type a batch code or commodity name into the search box to see every creation, edit, release, or void event tied to it.',
      },
      {
        stepTitle: 'Filter by Operational Area',
        detail: 'Select a category dropdown filter (e.g., Batches or Defects) when conducting periodic MNAO internal reviews.',
      },
    ],
    rulesAndBadges: [
      'Administrator-Only Module: Audit entries are append-only and cannot be edited or deleted from the client.',
      'Milk Bank personnel can still view and export Milk-specific logs inside Milk Bank -> Audit Trail.',
    ],
    relatedRoutes: [
      { route: 'users', label: 'User Management' },
      { route: 'archive', label: 'Archive' },
    ],
  },

  account: {
    key: 'account',
    title: 'Account Settings',
    icon: 'manage_accounts',
    theme: 'green',
    adminOnly: false,
    purpose:
      'Lets you personalize your profile photo, update your First and Last Name, manage your MNAO Account ID / email, and update your password.',
    navigation: [
      {
        label: 'Top-Right Navbar Shortcut',
        detail: 'Click the "Hi, <FirstName>!" profile pill in the top-right header from any page to open Account Settings.',
      },
      {
        label: 'Profile Information Card',
        detail: 'Upload/remove your profile avatar (auto-cropped square), edit First Name & Last Name, and update your Office Email / Account ID.',
      },
      {
        label: 'Security & Password Card',
        detail: 'Change your login password with live feedback from the 5-rule strong password checklist.',
      },
    ],
    howToUse: [
      {
        stepTitle: 'Upload a Profile Photo',
        detail: 'Click Upload Photo, pick an image, and click Save Profile Changes — your avatar updates immediately in the top navbar.',
      },
      {
        stepTitle: 'Update Your Name or Account ID',
        detail: 'Edit First Name / Last Name (updates "Hi, <FirstName>!" live) or click Use Recommended ID to adopt the standard YYYYNNNN@mnao.ph format.',
      },
      {
        stepTitle: 'Change Password Securely',
        detail: 'Enter a new password satisfying all checklist indicators (8+ chars, upper, lower, number, special character), confirm it, and click Update Password.',
      },
    ],
    rulesAndBadges: [
      'Sign Out is located at the bottom-left footer of the navigation sidebar (or bottom nav on mobile) to prevent accidental logouts while editing settings.',
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
    ],
  },
};

