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
      en: 'Prepare a full distribution list for barangays in one go — oldest-expiring stock is suggested first.',
      bis: 'Pag-andam og daghang ipanghatag sa mga barangay — ang pinakadali ma-expire ang una nga i-suggest.',
      tl: 'Maghanda ng maraming ipapamigay sa mga barangay — ang pinakamaagang ma-expire ang unang irerekomenda.',
    },
    steps: [
      {
        title: { en: 'Pick recipient barangay & date', bis: 'Pilia ang barangay ug petsa', tl: 'Piliin ang barangay at petsa' },
        detail: {
          en: 'Choose which barangay is receiving the supplies and enter the release date.',
          bis: 'Pilia ang barangay nga modawat ug ibutang ang petsa sa paghatag.',
          tl: 'Piliin ang barangay na tatanggap at ilagay ang petsa ng pagbibigay.',
        },
      },
      {
        title: { en: 'Select batches & quantities', bis: 'Pilia ang batches ug gidaghanon', tl: 'Piliin ang batches at dami' },
        detail: {
          en: 'Add the items to release. Oldest-expiring batches are marked so you can pick them first.',
          bis: 'Idugang ang mga items nga ihatag. Gi-markahan ang pinakadali ma-expire para mauna.',
          tl: 'Idagdag ang mga item na ibibigay. May palatandaan ang pinakamaagang ma-expire para mauna.',
        },
      },
      {
        title: { en: 'Confirm & save release', bis: 'I-confirm ug i-save ang release', tl: 'I-confirm at i-save ang release' },
        detail: {
          en: 'Review the summary, then save. Stock counts update automatically.',
          bis: 'Susiha ang summary, dayon i-save. Awtomatikong makuhaan ang stock.',
          tl: 'Suriin ang summary, pagkatapos i-save. Awtomatikong mababawas ang stock.',
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
      en: 'Stores old, empty, or expired batches so your active Batches list stays clean.',
      bis: 'Tipiganan sa mga daan, hurot, o expired nga batches para limpyo ang active list.',
      tl: 'Taguan ng mga luma, ubos, o expired na batches para malinis ang active list.',
    },
    steps: [
      {
        title: { en: 'View past records', bis: 'Tan-awa ang daan nga records', tl: 'Tingnan ang mga lumang record' },
        detail: {
          en: 'Search or filter archived batches anytime for audit or reference.',
          bis: 'Pangitaa ang bisan unsang archived batch kung kinahanglan og reference.',
          tl: 'Hanapin ang kahit anong archived batch kapag kailangan ng reference.',
        },
      },
      {
        title: { en: 'Restore if needed', bis: 'I-restore kung kinahanglan', tl: 'I-restore kung kailangan' },
        detail: {
          en: 'If a batch was archived by mistake, click Restore to move it back to Batches.',
          bis: 'Kung nasayop og archive, i-click ang Restore para mabalik sa Batches.',
          tl: 'Kung nagkamali sa pag-archive, i-click ang Restore para maibalik sa Batches.',
        },
      },
    ],
    relatedRoutes: [
      { route: 'batches', label: 'Batches' },
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
          en: 'Click any date or the + Add Event button to schedule a feeding program or donor drive.',
          bis: 'I-click ang bisan unsang petsa o + Add Event para mag-schedule og kalihokan.',
          tl: 'I-click ang kahit anong petsa o + Add Event para mag-schedule ng gawain.',
        },
        chips: [{ label: 'Add Event', icon: 'add', tone: 'green' }],
      },
      {
        title: { en: 'Check expiry markers', bis: 'Tan-awa ang expiry markers', tl: 'Tingnan ang expiry markers' },
        detail: {
          en: 'Colored dots show when batches expire so you can plan distributions early.',
          bis: 'Ang mga kolor nga tuldok nagpakita kanus-a ma-expire ang mga batch.',
          tl: 'Ang mga may kulay na tuldok ay nagpapakita kung kailan ma-expire ang batches.',
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
    title: 'Defects & Spoilage',
    icon: 'report_problem',
    theme: 'green',
    adminOnly: false,
    summary: {
      en: 'Log damaged, spoiled, or recalled supplies so inventory counts stay accurate.',
      bis: 'I-record ang mga nadaot o nadunot nga supply para sakto pirmi ang ihap sa stock.',
      tl: 'I-record ang mga nasira o nabulok na supply para laging tama ang bilang ng stock.',
    },
    steps: [
      {
        title: { en: 'Report a damaged item', bis: 'I-report ang nadaot nga item', tl: 'I-report ang nasirang item' },
        detail: {
          en: 'Click + Report Defect, pick the batch, enter how many units were damaged, and type the reason.',
          bis: 'I-click ang + Report Defect, pilia ang batch, pila ka buok ang nadaot, ug isulat ang rason.',
          tl: 'I-click ang + Report Defect, piliin ang batch, ilan ang nasira, at ilagay ang dahilan.',
        },
        chips: [{ label: 'Report Defect', icon: 'add', tone: 'red' }],
      },
      {
        title: { en: 'Automatic stock update', bis: 'Awtomatikong update sa stock', tl: 'Awtomatikong update sa stock' },
        detail: {
          en: 'Damaged units are deducted from usable stock right away and recorded in the audit log.',
          bis: 'Makuhaan dayon ang magamit nga stock ug ma-save sa audit log.',
          tl: 'Agad mababawas sa magagamit na stock at mare-record sa audit log.',
        },
      },
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
