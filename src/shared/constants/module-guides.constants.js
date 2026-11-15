/**
 * NutriVision Module Guides (#95)
 *
 * Simple, non-technical step-by-step guides in English, Bisaya, and Tagalog.
 * Rule: Keep on-screen English button names inside `chips` unchanged so staff
 * always match the exact button they see on screen.
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
    summary: {
      en: 'Your home screen. See stock counts, urgent alerts, recent staff activity, and quick shortcuts in one place.',
      bis: 'Kini ang imong home screen. Makita diri ang stock, mga alert, bag-ong lihok sa staff, ug mga shortcut.',
      tl: 'Ito ang home screen. Makikita rito ang bilang ng stock, mga alert, bagong galaw ng staff, at shortcuts.',
    },
    steps: [
      {
        title: { en: 'Use the 5 top shortcut buttons', bis: 'Gamita ang 5 ka shortcut buttons sa taas', tl: 'Gamitin ang 5 shortcut buttons sa itaas' },
        detail: {
          en: 'Jump straight to Milk Bank, give out supplies (Bulk Release), log deliveries (Add Batch), register items (Add Commodity), or open Calendar.',
          bis: 'Dali nga pag-abli sa Milk Bank, paghatag og stock (Bulk Release), pagdugang og delivery (Add Batch), bag-ong item (Add Commodity), o Calendar.',
          tl: 'Mabilis na pumunta sa Milk Bank, mag-release (Bulk Release), magdagdag ng delivery (Add Batch), bagong item (Add Commodity), o Calendar.',
        },
        chips: [
          { label: 'Milk Bank', icon: 'water_drop', tone: 'blue' },
          { label: 'Bulk Release', icon: 'shopping_cart', tone: 'orange' },
          { label: 'Add Batch', icon: 'add', tone: 'green' },
          { label: 'Add Commodity', icon: 'add', tone: 'green' },
          { label: 'Calendar', icon: 'calendar_month', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Check the 4 summary boxes', bis: 'Tan-awa ang 4 ka summary boxes', tl: 'Tingnan ang 4 na summary boxes' },
        detail: {
          en: 'Shows total Commodities, active Batches, Near Expiry (orange — within 3 months), and Expired (red — needs disposal).',
          bis: 'Nagpakita sa kinatibuk-ang Commodities, active Batches, Near Expiry (orange), ug Expired (pula).',
          tl: 'Nagpapakita ng kabuuang Commodities, active Batches, Near Expiry (orange), at Expired (pula).',
        },
      },
      {
        title: { en: 'Click Advisor Action Summary chips', bis: 'I-click ang mga chip sa Advisor Action Summary', tl: 'I-click ang mga chip sa Advisor Action Summary' },
        detail: {
          en: 'Click any colored chip (Expired, Nearing Expiry, Low Stock, Program Event) to inspect items right away, or click the red Advisor button for full details.',
          bis: 'I-click ang kolor nga chip para makita dayon ang listahan, o ang pula nga Advisor button para sa tibuok detalye.',
          tl: 'I-click ang may kulay na chip para makita agad ang listahan, o ang pulang Advisor button para sa buong detalye.',
        },
        chips: [
          { label: 'Expired Batches', icon: 'error', tone: 'red' },
          { label: 'Nearing Expiry (90d)', icon: 'warning', tone: 'amber' },
          { label: 'Low Stock Alerts', icon: 'inventory_2', tone: 'orange' },
          { label: 'Program Event (30d)', icon: 'event', tone: 'purple' },
          { label: 'Advisor', icon: 'insights', tone: 'red' },
        ],
      },
      {
        title: { en: 'Check Recent Activity & Top Bar', bis: 'Tan-awa ang Recent Activity ug Top Bar', tl: 'Tingnan ang Recent Activity at Top Bar' },
        detail: {
          en: 'Scroll down to see Recent Activity (latest staff logins and updates). Use the Bell icon at the top right for alerts, or the left green bar to switch pages.',
          bis: 'Sa ubos makita ang Recent Activity sa staff. Gamita ang Bell icon sa taas para sa alerts, o ang berdeng bar sa wala para mobalhin og page.',
          tl: 'Sa ibaba makikita ang Recent Activity ng staff. Gamitin ang Bell icon sa itaas para sa alerts, o ang berdeng bar sa kaliwa para lumipat ng page.',
        },
      },
    ],
    badges: [
      { label: 'Near Expiry', tone: 'amber', meaning: { en: 'Expiring within 3 months — give out first', bis: 'Ma-expire sulod sa 3 ka bulan — ipanghatag una', tl: 'Ma-expire sa loob ng 3 buwan — unahing ipamigay' } },
      { label: 'Expired', tone: 'red', meaning: { en: 'Past expiry date — remove from active stock', bis: 'Lapas na sa petsa — kuhaa sa active stock', tl: 'Lampas na sa petsa — alisin sa active stock' } },
    ],
    relatedRoutes: [
      { route: 'advisor', label: 'Advisor' },
      { route: 'batches', label: 'Batches' },
      { route: 'milk', label: 'Milk Bank' },
    ],
  },

  advisor: {
    key: 'advisor',
    title: 'Inventory Advisor',
    icon: 'insights',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Shows which items are expired, expiring soon, or low on stock — plus charts of where supplies go.',
      bis: 'Nagpakita kung unsang items ang expired, hapit na ma-expire, o gamay na lang — apil ang mga charts.',
      tl: 'Nagpapakita kung aling items ang expired, malapit ma-expire, o paubos na — kasama ang charts.',
    },
    steps: [
      {
        title: { en: 'Click any status chip at the top', bis: 'I-click ang bisan unsang status chip sa taas', tl: 'I-click ang kahit anong status chip sa itaas' },
        detail: {
          en: 'Tap Expired Batches, Nearing Expiry (90d), Low Stock Alerts, or Program Event (30d) to open the exact list.',
          bis: 'I-click ang Expired Batches, Nearing Expiry, Low Stock Alerts, o Program Event para makita ang listahan.',
          tl: 'I-click ang Expired Batches, Nearing Expiry, Low Stock Alerts, o Program Event para makita ang listahan.',
        },
        chips: [
          { label: 'Expired Batches', icon: 'error', tone: 'red' },
          { label: 'Nearing Expiry (90d)', icon: 'warning', tone: 'amber' },
          { label: 'Low Stock Alerts', icon: 'inventory_2', tone: 'orange' },
          { label: 'Program Event (30d)', icon: 'event', tone: 'purple' },
        ],
      },
      {
        title: { en: 'Check Inventory & Expiring Soon lists', bis: 'Susiha ang Inventory ug Expiring Soon lists', tl: 'Suriin ang Inventory at Expiring Soon lists' },
        detail: {
          en: 'Left box shows stock per item (View All opens Commodities). Right box shows overdue or expiring batches (Batches button opens Batches).',
          bis: 'Sa wala makita ang stock matag item. Sa tuo makita ang hapit na ma-expire o overdue nga batches.',
          tl: 'Sa kaliwa makikita ang stock bawat item. Sa kanan makikita ang malapit ma-expire o overdue na batches.',
        },
        chips: [
          { label: 'View All', icon: 'open_in_new', tone: 'neutral' },
          { label: 'Batches', icon: 'layers', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Switch charts & filter below', bis: 'Ilisi ang chart ug gamita ang filters sa ubos', tl: 'Palitan ang chart at gamitin ang filters sa ibaba' },
        detail: {
          en: 'Pick By Barangay, Stock Status, Release History, or Expiry Check, then filter by Year, Period, or Product.',
          bis: 'Pilia ang By Barangay, Stock Status, Release History, o Expiry Check, dayon i-filter pinaagi sa Year, Period, o Product.',
          tl: 'Piliin ang By Barangay, Stock Status, Release History, o Expiry Check, tapos i-filter ayon sa Year, Period, o Product.',
        },
        chips: [
          { label: 'By Barangay', icon: 'location_on', tone: 'green' },
          { label: 'Stock Status', icon: 'inventory_2', tone: 'neutral' },
          { label: 'Release History', icon: 'trending_up', tone: 'neutral' },
          { label: 'Expiry Check', icon: 'schedule', tone: 'neutral' },
        ],
      },
    ],
    badges: [
      { label: 'Optimal Stock', tone: 'green', meaning: { en: 'Enough stock & not expired', bis: 'Sakto ang stock ug dili expired', tl: 'Sapat ang stock at hindi expired' } },
      { label: '34d overdue', tone: 'red', meaning: { en: 'Already past expiry date', bis: 'Lapas na sa expiry date', tl: 'Lampas na sa expiry date' } },
      { label: 'in 87d', tone: 'amber', meaning: { en: 'Days left before expiry — give out first', bis: 'Adlaw nga nabilin — ipanghatag una', tl: 'Araw bago ma-expire — unahing ipamigay' } },
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'batches', label: 'Batches' },
      { route: 'bulk-release', label: 'Bulk Release' },
    ],
  },

  commodities: {
    key: 'commodities',
    title: 'Commodities',
    icon: 'inventory_2',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'The master list of all nutrition items your office tracks (milk, vitamins, food packs, etc.).',
      bis: 'Listahan sa tanang klase sa nutrition items nga gi-track sa opisina.',
      tl: 'Listahan ng lahat ng nutrition items na sinusubaybayan ng opisina.',
    },
    steps: [
      {
        title: { en: 'Search, filter & switch view', bis: 'Pangita, i-filter, ug ilisi ang view', tl: 'Maghanap, mag-filter, at palitan ang view' },
        detail: {
          en: 'Use Search by name or code or All Categories dropdown to find items. Switch between Cards (pictures) or Table (list).',
          bis: 'Gamita ang Search box o All Categories dropdown para mangita. Pilia ang Cards o Table view.',
          tl: 'Gamitin ang Search box o All Categories dropdown para maghanap. Pumili ng Cards o Table view.',
        },
        chips: [
          { label: 'Cards', icon: 'grid_view', tone: 'neutral' },
          { label: 'Table', icon: 'table_rows', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Use card buttons (Stock, Graph, ⋮)', bis: 'Gamita ang buttons sa card (Stock, Graph, ⋮)', tl: 'Gamitin ang buttons sa card (Stock, Graph, ⋮)' },
        detail: {
          en: 'Click the stock box (e.g. 450 Box • 2 batches) to view its batches, Graph to see its chart, or ⋮ (3 dots) to edit or delete.',
          bis: 'I-click ang stock box para makita ang batches, Graph para sa chart, o ⋮ para mag-edit o delete.',
          tl: 'I-click ang stock box para makita ang batches, Graph para sa chart, o ⋮ para mag-edit o mag-delete.',
        },
        chips: [
          { label: 'Graph', icon: 'hub', tone: 'neutral' },
          { label: '1 urgent', icon: 'warning', tone: 'amber' },
        ],
      },
      {
        title: { en: 'Add Commodity: fill required (*) fields', bis: 'Add Commodity: sulati ang may (*) nga fields', tl: 'Add Commodity: punan ang may (*) na fields' },
        detail: {
          en: 'Click Add Commodity. Upload Photo (optional), click Auto for Code *, then enter Name *, Category * (e.g. Bakery / Perishables for 7-day items), Unit *, and optional Description.',
          bis: 'I-click ang Add Commodity. Pwede mag-Upload Photo, i-click ang Auto sa Code *, unya isulod ang Name *, Category *, Unit *, ug Description.',
          tl: 'I-click ang Add Commodity. Pwedeng mag-Upload Photo, i-click ang Auto sa Code *, tapos ilagay ang Name *, Category *, Unit *, at Description.',
        },
        chips: [
          { label: 'Add Commodity', icon: 'add', tone: 'green' },
          { label: 'Upload Photo', icon: 'upload', tone: 'neutral' },
          { label: 'Auto', icon: 'refresh', tone: 'neutral' },
        ],
      },
    ],
    badges: [
      { label: '1 urgent', tone: 'amber', meaning: { en: 'Has batches expiring soon or already expired', bis: 'May batches nga hapit na o expired na', tl: 'May batches na malapit o expired na' } },
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batches' },
      { route: 'batches-workspace', label: 'Bulk Batch Registration' },
    ],
  },

  batches: {
    key: 'batches',
    title: 'Batches',
    icon: 'layers',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Shows every delivery batch in storage, how many units are left, and when each one expires.',
      bis: 'Nagpakita sa matag delivery batch sa bodega, pila na lang ang nabilin, ug kanus-a ma-expire.',
      tl: 'Nagpapakita ng bawat delivery batch sa bodega, ilan ang natitira, at kailan ma-expire.',
    },
    steps: [
      {
        title: { en: 'Add new deliveries', bis: 'Pagdugang og bag-ong delivery', tl: 'Magdagdag ng bagong delivery' },
        detail: {
          en: 'Click + Add Batch to open Bulk Batch Registration (with Receipt Scanner or manual table).',
          bis: 'I-click ang + Add Batch para maabli ang Bulk Batch Registration (may Scanner o manual table).',
          tl: 'I-click ang + Add Batch para mabuksan ang Bulk Batch Registration (may Scanner o manual table).',
        },
        chips: [{ label: 'Add Batch', icon: 'add', tone: 'green' }],
      },
      {
        title: { en: 'Filter by status or commodity', bis: 'I-filter pinaagi sa status o item', tl: 'I-filter ayon sa status o item' },
        detail: {
          en: 'Use the dropdowns or Search bar to find Near Expiry or Expired batches quickly.',
          bis: 'Gamita ang dropdowns o Search bar para makita dayon ang hapit na ma-expire.',
          tl: 'Gamitin ang dropdowns o Search bar para makita agad ang malapit ma-expire.',
        },
      },
      {
        title: { en: 'Release or Archive', bis: 'I-release o i-archive', tl: 'I-release o i-archive' },
        detail: {
          en: 'Give out good stock via Bulk Release, or archive empty/expired batches.',
          bis: 'Ipanghatag ang maayo nga stock gamit ang Bulk Release, o i-archive ang hurot o expired.',
          tl: 'Ipamigay ang maayos na stock gamit ang Bulk Release, o i-archive ang ubos o expired.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'batches-workspace', label: 'Bulk Batch Registration' },
      { route: 'bulk-release', label: 'Bulk Release' },
      { route: 'archive', label: 'Archive' },
    ],
  },

  'batches-workspace': {
    key: 'batches-workspace',
    title: 'Bulk Batch Registration',
    icon: 'document_scanner',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Add many deliveries at once — either by scanning a delivery receipt or typing into the table.',
      bis: 'Pagdugang og daghang deliveries sa usa ka higayon — pwede mag-scan og resibo o mag-type sa table.',
      tl: 'Magdagdag ng maraming delivery nang sabay — gamit ang Receipt Scanner o pag-type sa table.',
    },
    steps: [
      {
        title: { en: 'Scan a receipt (Optional)', bis: 'Mag-scan og resibo (Opsyonal)', tl: 'Mag-scan ng resibo (Opsyonal)' },
        detail: {
          en: 'On the left side, upload a photo, use Live Camera, or Mobile Scanner to auto-fill rows.',
          bis: 'Sa wala nga bahin, pag-upload og picture, gamita ang Live Camera, o Mobile Scanner.',
          tl: 'Sa kaliwang bahagi, mag-upload ng larawan, gamitin ang Live Camera, o Mobile Scanner.',
        },
        chips: [
          { label: 'File Import', icon: 'upload_file', tone: 'green' },
          { label: 'Live Camera', icon: 'photo_camera', tone: 'neutral' },
          { label: 'Mobile Scanner', icon: 'smartphone', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Or add rows manually', bis: 'O pagdugang og linya nga manual', tl: 'O magdagdag ng row nang manual' },
        detail: {
          en: 'Click + Add New Row Manually on the right table and fill in Commodity, Unit, Qty, and Dates.',
          bis: 'I-click ang + Add New Row Manually sa tuo nga table ug sulati ang Commodity, Unit, Qty, ug Petsa.',
          tl: 'I-click ang + Add New Row Manually sa kanang table at punan ang Commodity, Unit, Qty, at Petsa.',
        },
        chips: [{ label: 'Add New Row Manually', icon: 'add', tone: 'green' }],
      },
      {
        title: { en: 'Save all batches', bis: 'I-save ang tanang batches', tl: 'I-save ang lahat ng batches' },
        detail: {
          en: 'Once all required fields are filled, click Register All Batches at the top right.',
          bis: 'Kung kompleto na ang tanang detalye, i-click ang Register All Batches sa taas sa tuo.',
          tl: 'Kapag kumpleto na ang lahat, i-click ang Register All Batches sa itaas sa kanan.',
        },
        chips: [{ label: 'Register All Batches', icon: 'check', tone: 'green' }],
      },
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batches' },
      { route: 'commodities', label: 'Commodities' },
    ],
  },

  releases: {
    key: 'releases',
    title: 'Releases',
    icon: 'local_shipping',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'History of all supplies given out to barangays, with printable release receipts.',
      bis: 'Listahan sa tanang supplies nga nahatag na sa mga barangay, apil ang printable receipts.',
      tl: 'Listahan ng lahat ng supplies na naipamigay sa mga barangay, kasama ang printable receipts.',
    },
    steps: [
      {
        title: { en: 'Start a new release', bis: 'Paghimo og bag-ong release', tl: 'Gumawa ng bagong release' },
        detail: {
          en: 'Click Bulk Release to pick batches and assign how many units go to each barangay.',
          bis: 'I-click ang Bulk Release para mopili og batches ug pila ang ihatag sa matag barangay.',
          tl: 'I-click ang Bulk Release para pumili ng batches at kung ilan ang ibibigay sa bawat barangay.',
        },
        chips: [{ label: 'Bulk Release', icon: 'shopping_cart', tone: 'orange' }],
      },
      {
        title: { en: 'Search past releases', bis: 'Pangitaa ang daan nga releases', tl: 'Hanapin ang mga nakaraang release' },
        detail: {
          en: 'Filter by barangay, date, or commodity name to check any past delivery.',
          bis: 'I-filter pinaagi sa barangay, petsa, o item para makita ang miaging paghatag.',
          tl: 'I-filter ayon sa barangay, petsa, o item para makita ang nakaraang pagbibigay.',
        },
      },
      {
        title: { en: 'Print or export PDF', bis: 'I-print o i-save isip PDF', tl: 'I-print o i-save bilang PDF' },
        detail: {
          en: 'Click Export PDF on any release record for signing and filing.',
          bis: 'I-click ang Export PDF para sa pirmahan ug file sa opisina.',
          tl: 'I-click ang Export PDF para sa pirmahan at record ng opisina.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'bulk-release', label: 'Bulk Release' },
      { route: 'reports', label: 'Reports' },
    ],
  },

  'bulk-release': {
    key: 'bulk-release',
    title: 'Bulk Release',
    icon: 'shopping_cart_checkout',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Pick multiple active batches from the scrollable list on the left, set aligned Release Qty in the Dispatch Cart on the right, and dispatch to one destination.',
      bis: 'Pilia ang daghang active batches sa scrollable list sa wala, ibutang ang Release Qty sa Dispatch Cart sa tuo, ug i-dispatch sa usa ka destinasyon.',
      tl: 'Pumili ng maraming active batches sa scrollable list sa kaliwa, ilagay ang Release Qty sa Dispatch Cart sa kanan, at i-dispatch sa isang destinasyon.',
    },
    steps: [
      {
        title: { en: 'Search, filter & select batches', bis: 'Pangitaa, i-filter ug pilia ang batches', tl: 'Maghanap, mag-filter at pumili ng batches' },
        detail: {
          en: 'Use the Search box, Commodity filter, or FEFO + LSFO / LSFO sort in Select Available Batches, then check the rows you want to release (scroll inside the table for long lists).',
          bis: 'Gamita ang Search box, Commodity filter, o FEFO + LSFO / LSFO sort sa Select Available Batches, dayon i-check ang mga row nga i-release (i-scroll ang table kon daghan).',
          tl: 'Gamitin ang Search box, Commodity filter, o FEFO + LSFO / LSFO sort sa Select Available Batches, pagkatapos i-check ang mga row na ire-release (i-scroll ang table kung marami).',
        },
      },
      {
        title: { en: 'Set Release Qty in Dispatch Cart', bis: 'Ibutang ang Release Qty sa Dispatch Cart', tl: 'Ilagay ang Release Qty sa Dispatch Cart' },
        detail: {
          en: 'Each selected batch appears in the scrollable Dispatch Cart. Enter the exact Release Qty next to its available balance, or click × to remove an item.',
          bis: 'Ang matag napiling batch makita sa scrollable Dispatch Cart. Ibutang ang eksaktong Release Qty tupad sa available balance, o i-click ang × para tangtangon.',
          tl: 'Lalabas ang bawat napiling batch sa scrollable Dispatch Cart. Ilagay ang tamang Release Qty katabi ng available balance, o i-click ang × para tanggalin.',
        },
      },
      {
        title: { en: 'Fill Destination & Confirm Release', bis: 'Isulod ang Destinasyon ug i-Confirm', tl: 'Ilagay ang Destinasyon at i-Confirm' },
        detail: {
          en: 'Choose Destination (Barangay/LGU), Release Date, Received By, and optional Purpose/Remarks at the bottom of the cart, then click Confirm Release.',
          bis: 'Pilia ang Destination (Barangay/LGU), Release Date, Received By, ug opsyonal nga Purpose/Remarks sa ubos sa cart, dayon i-click ang Confirm Release.',
          tl: 'Piliin ang Destination (Barangay/LGU), Release Date, Received By, at opsyonal na Purpose/Remarks sa ibaba ng cart, pagkatapos i-click ang Confirm Release.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'releases', label: 'Releases' },
      { route: 'batches', label: 'Batches' },
    ],
  },

  archive: {
    key: 'archive',
    title: 'Archive',
    icon: 'inventory',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'History of expired, voided, empty (depleted) batches, and archived commodities so active lists stay clean.',
      bis: 'Tipiganan sa mga expired, voided, hurot (depleted) nga batches, ug archived commodities para limpyo ang active list.',
      tl: 'Listahan ng expired, voided, ubos (depleted) na batches, at archived commodities para malinis ang active list.',
    },
    steps: [
      {
        title: { en: 'Search or pick a category tab', bis: 'Pangita o pilia ang category tab', tl: 'Maghanap o pumili ng category tab' },
        detail: {
          en: 'Type in Search by batch code, commodity, reason, or user, or click the filter pills (All Records, Expired Stock, Data Entry Errors, Other Voided, Depleted Batches, Archived Commodities).',
          bis: 'Pag-type sa Search box o pilia ang pill tabs (Expired Stock, Data Entry Errors, Other Voided, Depleted Batches, Archived Commodities).',
          tl: 'Mag-type sa Search box o pumili sa pill tabs (Expired Stock, Data Entry Errors, Other Voided, Depleted Batches, Archived Commodities).',
        },
        chips: [
          { label: 'All Records', tone: 'neutral' },
          { label: 'Other Voided', tone: 'green' },
          { label: 'Depleted Batches', tone: 'neutral' },
          { label: 'Archived Commodities', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'View Releases on Depleted Batches', bis: 'View Releases sa hurot nga batches', tl: 'View Releases sa ubos na batches' },
        detail: {
          en: 'In Depleted Batches (fully given out), click View Releases to see which barangays received that batch.',
          bis: 'Sa Depleted Batches, i-click ang View Releases para makita kung asa nga barangay napunta ang batch.',
          tl: 'Sa Depleted Batches, i-click ang View Releases para makita kung saang barangay napunta ang batch.',
        },
        chips: [
          { label: 'View Releases', icon: 'receipt_long', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Restore voided items if needed', bis: 'I-Restore kung kinahanglan mabalik', tl: 'I-Restore kung kailangan ibalik' },
        detail: {
          en: 'In Other Voided or Archived Commodities, click Restore to move an item back to your active list.',
          bis: 'Sa Other Voided o Archived Commodities, i-click ang Restore para mabalik sa active list.',
          tl: 'Sa Other Voided o Archived Commodities, i-click ang Restore para maibalik sa active list.',
        },
        chips: [
          { label: 'Restore', icon: 'restore', tone: 'neutral' },
        ],
      },
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batches' },
      { route: 'commodities', label: 'Commodities' },
      { route: 'releases', label: 'Releases' },
    ],
  },

  milk: {
    key: 'milk',
    title: 'Milk Bank',
    icon: 'water_drop',
    theme: 'blue',
    adminOnly: false,
    summary: {
      en: 'Track breastmilk from donor registration, milk arrival, pasteurization & freezer shelves, up to baby dispensing.',
      bis: 'I-track ang breastmilk gikan sa donor, pag-abot sa gatas, pag-pasteurize, freezer, hangtod sa paghatag sa bata.',
      tl: 'Subaybayan ang breastmilk mula sa donor, pagdating ng gatas, pasteurization, freezer, hanggang pagbibigay sa sanggol.',
    },
    steps: [
      {
        title: { en: '1. Record donors in Donor Log', bis: '1. I-record ang donor sa Donor Log', tl: '1. I-record ang donor sa Donor Log' },
        detail: {
          en: 'Click + Add Row, enter donor name, barangay, optional phone, dates, and volume, then Save. New entries also pre-fill Log of Milk Received.',
          bis: 'I-click ang + Add Row, isulod ang ngalan, barangay, ug volume, dayon i-Save. Awtomatikong mo-fill usab kini sa Log of Milk Received.',
          tl: 'I-click ang + Add Row, ilagay ang pangalan, barangay, at volume, tapos i-Save. Awtomatiko ring lalabas ito sa Log of Milk Received.',
        },
        chips: [
          { label: 'Add Row', icon: 'add', tone: 'blue' },
          { label: 'Save', icon: 'check', tone: 'blue' },
        ],
      },
      {
        title: { en: '2. Check condition in Log of Milk Received', bis: '2. I-check sa Log of Milk Received', tl: '2. I-check sa Log of Milk Received' },
        detail: {
          en: 'Verify Transport & Arrival dates and mark Condition as ok or compromised. Use the filter to view OK or Compromised rows.',
          bis: 'Susiha ang Transport ug Arrival dates ug pilia kung ok o compromised ang gatas.',
          tl: 'Suriin ang Transport at Arrival dates at piliin kung ok o compromised ang gatas.',
        },
      },
      {
        title: { en: '3. Pasteurize & manage Virtual Freezer', bis: '3. Pasteurize ug Virtual Freezer', tl: '3. Pasteurize at Virtual Freezer' },
        detail: {
          en: 'Log pasteurized batches (1-year default expiry). Switch to Virtual Freezer to move bags between shelves or click Settings to rename/change shelf capacity.',
          bis: 'I-log ang pasteurized batches. Gamita ang Virtual Freezer para magbalhin og bags o Settings para usbon ang ngalan ug max bags.',
          tl: 'I-log ang pasteurized batches. Gamitin ang Virtual Freezer para maglipat ng bags o Settings para palitan ang pangalan at max bags.',
        },
        chips: [
          { label: 'Settings', icon: 'settings', tone: 'neutral' },
        ],
      },
      {
        title: { en: '4. Dispense & check Advisor', bis: '4. Ipanghatag ug tan-awa ang Advisor', tl: '4. Ipamigay at tingnan ang Advisor' },
        detail: {
          en: 'Give out oldest-expiring bags first in Dispensing Ledger. Open the red Advisor tab for charts, Donor Outreach (By Barangay or By Individual Donation), and Expiry Check.',
          bis: 'Unaha ang pinakadali ma-expire sa Dispensing Ledger. Ablihi ang Advisor tab para sa charts ug Expiry Check.',
          tl: 'Unahin ang pinakamaagang ma-expire sa Dispensing Ledger. Buksan ang Advisor tab para sa charts at Expiry Check.',
        },
        chips: [
          { label: 'Advisor', icon: 'insights', tone: 'red' },
        ],
      },
    ],
    badges: [
      { label: 'Good (>180d)', tone: 'green', meaning: { en: 'Safe, long shelf-life remaining', bis: 'Maayo pa ug dugay pa ma-expire', tl: 'Maayos pa at matagal pa bago ma-expire' } },
      { label: 'Near Expiry (≤90d)', tone: 'amber', meaning: { en: 'Give out first (FEFO priority)', bis: 'Unahon og hatag', tl: 'Unahing ipamigay' } },
      { label: 'Expired', tone: 'red', meaning: { en: 'Do not dispense — remove from shelf', bis: 'Ayaw ihatag — kuhaa sa freezer', tl: 'Huwag ipamigay — alisin sa freezer' } },
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'reports', label: 'Reports' },
    ],
  },

  calendar: {
    key: 'calendar',
    title: 'Calendar',
    icon: 'calendar_month',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'See upcoming nutrition events, scheduled deliveries, and batch expiry dates on one monthly calendar.',
      bis: 'Makita sa usa ka kalendaryo ang mga schedule sa nutrition events, deliveries, ug expiry dates.',
      tl: 'Makikita sa isang kalendaryo ang mga schedule ng nutrition events, deliveries, at expiry dates.',
    },
    steps: [
      {
        title: { en: 'Add an event', bis: 'Pagdugang og event', tl: 'Magdagdag ng event' },
        detail: {
          en: 'Click any date or + Add Event, assign a Person in Charge, and optionally choose a Location (or type a custom one under Other).',
          bis: 'I-click ang bisan unsang petsa o + Add Event, pilia ang Person in Charge, ug opsyonal ang Location (o i-type sa Other).',
          tl: 'I-click ang kahit anong petsa o + Add Event, magtalaga ng Person in Charge, at opsyonal na pumili ng Location (o mag-type sa Other).',
        },
        chips: [{ label: 'Add Event', icon: 'add', tone: 'green' }],
      },
      {
        title: { en: 'Read calendar pills', bis: 'Basaha ang calendar pills', tl: 'Basahin ang calendar pills' },
        detail: {
          en: 'Soft-tinted pills match the legend: violet for Program Events, blue for Deliveries, and green/yellow/orange/red for batch expiry status.',
          bis: 'Ang mga pill motugma sa legend: violet para sa Program Events, blue para sa Deliveries, ug green/yellow/orange/red para sa batch expiry.',
          tl: 'Tumutugma ang mga pill sa legend: violet para sa Program Events, blue para sa Deliveries, at green/yellow/orange/red para sa batch expiry.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
      { route: 'advisor', label: 'Advisor' },
    ],
  },

  reports: {
    key: 'reports',
    title: 'Reports',
    icon: 'assessment',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Download official printable PDF and Excel/CSV reports for inventory, releases, and monthly summaries.',
      bis: 'Pag-download og opisyal nga PDF ug CSV reports para sa inventory ug monthly summary.',
      tl: 'Mag-download ng opisyal na PDF at CSV reports para sa inventory at monthly summary.',
    },
    steps: [
      {
        title: { en: 'Pick report type & dates', bis: 'Pilia ang klase sa report ug petsa', tl: 'Piliin ang uri ng report at petsa' },
        detail: {
          en: 'Choose the date range and report category you need to print.',
          bis: 'Pilia ang petsa ug klase sa report nga imong i-print.',
          tl: 'Piliin ang petsa at uri ng report na kailangan i-print.',
        },
      },
      {
        title: { en: 'Export PDF or CSV', bis: 'I-export isip PDF o CSV', tl: 'I-export bilang PDF o CSV' },
        detail: {
          en: 'Click Export PDF for a ready-to-sign form, or CSV to open in Excel.',
          bis: 'I-click ang Export PDF para sa pirmahan, o CSV para ablihan sa Excel.',
          tl: 'I-click ang Export PDF para sa pirmahan, o CSV para buksan sa Excel.',
        },
        chips: [
          { label: 'Export PDF', icon: 'print', tone: 'neutral' },
          { label: 'CSV', icon: 'table_view', tone: 'neutral' },
        ],
      },
    ],
    relatedRoutes: [
      { route: 'releases', label: 'Releases' },
      { route: 'milk', label: 'Milk Bank' },
    ],
  },

  defects: {
    key: 'defects',
    title: 'Defects & Returns',
    icon: 'report_problem',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Track quarantined items under review, supplier returns, and disposed/damaged stock.',
      bis: 'I-track ang gi-quarantine nga stock, gi-uli sa supplier, ug mga nadaot o gi-dispose.',
      tl: 'Subaybayan ang naka-quarantine na stock, ibinalik sa supplier, at itinapong/nasirang gamit.',
    },
    steps: [
      {
        title: { en: 'Switch tabs & search records', bis: 'Ilisi ang tabs ug pangita og record', tl: 'Magpalit ng tab at maghanap' },
        detail: {
          en: 'Use Quarantined, Restored, Returned, or Disposed tabs to view each list, or use the Search box by batch, commodity, or reason.',
          bis: 'Gamita ang Quarantined, Restored, Returned, o Disposed tabs, o pangita pinaagi sa Search box.',
          tl: 'Gamitin ang Quarantined, Restored, Returned, o Disposed tabs, o maghanap gamit ang Search box.',
        },
        chips: [
          { label: 'Quarantined', tone: 'green' },
          { label: 'Restored', tone: 'neutral' },
          { label: 'Returned', tone: 'neutral' },
          { label: 'Disposed', tone: 'neutral' },
        ],
      },
      {
        title: { en: 'Click Report Defect & fill inputs', bis: 'I-click ang Report Defect ug sulati', tl: 'I-click ang Report Defect at punan' },
        detail: {
          en: 'Click Report Defect, search the Active Batch *, pick Action to Take * and Quantity Affected *, select Reason * and type Remarks *. Add photo (or Upload via Phone), then click Generate Report.',
          bis: 'I-click ang Report Defect, pilia ang Active Batch *, Action to Take *, Quantity *, Reason *, ug Remarks *. Pwede mag-upload og picture (o Upload via Phone), dayon Generate Report.',
          tl: 'I-click ang Report Defect, piliin ang Active Batch *, Action to Take *, Quantity *, Reason *, at Remarks *. Pwedeng mag-upload ng larawan (o Upload via Phone), tapos Generate Report.',
        },
        chips: [
          { label: 'Report Defect', icon: 'add', tone: 'green' },
          { label: 'Upload via Phone', icon: 'qr_code_2', tone: 'neutral' },
          { label: 'Generate Report', icon: 'picture_as_pdf', tone: 'green' },
        ],
      },
      {
        title: { en: 'Resolve held items later', bis: 'I-Resolve ang gi-quarantine', tl: 'I-Resolve ang naka-quarantine' },
        detail: {
          en: 'In the Quarantined tab, click Resolve on any row once you decide to return it to stock, return to supplier, or dispose.',
          bis: 'Sa Quarantined tab, i-click ang Resolve kung nakadesisyon na kung ibalik sa stock, uli sa supplier, o i-dispose.',
          tl: 'Sa Quarantined tab, i-click ang Resolve kapag napagdesisyunan nang ibalik sa stock, ibalik sa supplier, o itapon.',
        },
        chips: [
          { label: 'Resolve', icon: 'tune', tone: 'neutral' },
        ],
      },
    ],
    badges: [
      { label: 'Quarantined', tone: 'amber', meaning: { en: 'Held for inspection (Active Hold)', bis: 'Gi-hold para susihon', tl: 'Naka-hold para suriin' } },
      { label: 'Restored', tone: 'green', meaning: { en: 'Cleared from quarantine and returned to active stock', bis: 'Gibalik sa active stock gikan sa quarantine', tl: 'Ibinalik sa active stock mula sa quarantine' } },
      { label: 'Disposed', tone: 'red', meaning: { en: 'Condemned / written off from stock', bis: 'Gi-dispose ug gikuha sa stock', tl: 'Itinapon at inalis sa stock' } },
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batches' },
      { route: 'audit-logs', label: 'Audit Logs' },
    ],
  },

  users: {
    key: 'users',
    title: 'User Management',
    icon: 'group',
    theme: 'green',
    adminOnly: true,
    summary: {
      en: 'Admin only: create staff accounts, set roles (Admin or Staff), and activate or deactivate access.',
      bis: 'Para sa Admin ra: paghimo og account sa staff, paghatag og role, ug pag-lock o abli sa access.',
      tl: 'Para sa Admin lang: gumawa ng staff account, magbigay ng role, at mag-activate o deactivate ng access.',
    },
    steps: [
      {
        title: { en: 'Add a new staff user', bis: 'Pagdugang og bag-ong staff', tl: 'Magdagdag ng bagong staff' },
        detail: {
          en: 'Click + Add User, fill in their name, email, and role (Administrator or Staff).',
          bis: 'I-click ang + Add User, isulod ang ngalan, email, ug role.',
          tl: 'I-click ang + Add User, ilagay ang pangalan, email, at role.',
        },
        chips: [{ label: 'Add User', icon: 'person_add', tone: 'green' }],
      },
      {
        title: { en: 'Edit or deactivate', bis: 'I-edit o i-deactivate', tl: 'I-edit o i-deactivate' },
        detail: {
          en: 'Update a staff member’s role or disable their login anytime.',
          bis: 'Usba ang role o i-disable ang login kung wala na sa opisina.',
          tl: 'Palitan ang role o i-disable ang login kung wala na sa opisina.',
        },
      },
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
    summary: {
      en: 'Admin only: a complete history of who logged in and every change made in the system.',
      bis: 'Para sa Admin ra: kompleto nga listahan kung kinsa ang nag-login ug tanang kausaban sa sistema.',
      tl: 'Para sa Admin lang: kumpletong listahan kung sino ang nag-login at lahat ng pagbabago sa system.',
    },
    steps: [
      {
        title: { en: 'Filter by user or action', bis: 'I-filter pinaagi sa user o aksyon', tl: 'I-filter ayon sa user o gawain' },
        detail: {
          en: 'Search a staff name or pick an action type (Login, Create, Update, Delete).',
          bis: 'Pangitaa ang ngalan sa staff o pilia ang klase sa aksyon.',
          tl: 'Hanapin ang pangalan ng staff o piliin ang uri ng gawain.',
        },
      },
      {
        title: { en: 'Review timestamps', bis: 'Susiha ang petsa ug oras', tl: 'Suriin ang petsa at oras' },
        detail: {
          en: 'Logs are read-only and cannot be edited, keeping records trustworthy.',
          bis: 'Dili mausab ang logs para sigurado nga tinuod ang record.',
          tl: 'Hindi nababago ang logs para siguradong totoo ang record.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'users', label: 'User Management' },
    ],
  },

  account: {
    key: 'account',
    title: 'Account Settings',
    icon: 'manage_accounts',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Update your display name (used on printed PDFs) and change your password.',
      bis: 'Usba ang imong ngalan (nga mogawas sa PDF) ug ilisi ang imong password.',
      tl: 'Palitan ang iyong pangalan (na lalabas sa PDF) at magpalit ng password.',
    },
    steps: [
      {
        title: { en: 'Update your name', bis: 'Usba ang imong ngalan', tl: 'Palitan ang iyong pangalan' },
        detail: {
          en: 'Edit your Full Name and click Save — this appears on your printed PDF signature line.',
          bis: 'Usba ang Full Name ug i-Save — kini ang mogawas sa pirma sa PDF.',
          tl: 'I-edit ang Full Name at i-Save — ito ang lalabas sa pirma sa PDF.',
        },
        chips: [{ label: 'Save', icon: 'check', tone: 'green' }],
      },
      {
        title: { en: 'Change password', bis: 'Ilisi ang password', tl: 'Magpalit ng password' },
        detail: {
          en: 'Enter your current password and a new password if you want to update your login.',
          bis: 'Isulod ang daan ug bag-ong password kung gusto ka mag-ilis.',
          tl: 'Ilagay ang luma at bagong password kung gusto mong magpalit.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'dashboard', label: 'Dashboard' },
    ],
  },
};
