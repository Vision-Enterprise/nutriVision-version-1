# Literature & Regulatory Basis for NutriVision's Expiration Status & Shelf-Life Policies

**System:** NutriVision — Nutrition Commodity Inventory & Human Milk Bank Management System  
**Organization:** Municipal Nutrition Action Office (MNAO), Manolo Fortich, Bukidnon  
**Document Purpose:** Technical and Review of Related Literature (RRL) reference justifying NutriVision's 4-tier FEFO traffic-light expiration classification across heterogeneous nutrition commodities (shelf-stable micronutrients, freshly baked DOST-FNRI Enhanced Nutribuns, chilled short-life perishables, and pasteurized donor human milk).

---

## 1. Problem Statement: Why Static Day Cutoffs Fail in Heterogeneous Nutrition Warehouses

Public-health nutrition offices manage two fundamentally different classes of inventory within the same logistics workflow:

1. **Shelf-Stable Public Health Commodities** (12 to 36 months total shelf life) — e.g., Vitamin A capsules, Iron with Folic Acid tablets, Micronutrient Powder (MNP), Ready-to-Use Therapeutic Food (RUTF), and fortified dry rations.
2. **Short-Cycle Perishable Feeding Commodities** (4 to 14 days total shelf life) — e.g., locally baked **Enhanced Nutribun (E-Nutribun)** distributed weekly for supplementary feeding programs without artificial chemical preservatives.

Peer-reviewed supply chain literature demonstrates that applying a single static day threshold (such as a fixed 90-day "Near Expiry" rule) across heterogeneous products breaks First-Expired, First-Out (FEFO) prioritization: a freshly baked 7-day Nutribun batch would falsely trigger a "Near Expiry" warning on Day 1 of production, masking genuine spoilage urgency on Days 5–7 (**Hertog et al., 2014**; **Ketzenberg et al., 2018**; **La Scalia et al., 2017**).

To solve this rigorously, NutriVision implements a **Hybrid Literature Expiration Model** combining:
- **Absolute Public-Health Lead-Time Thresholds (`90d / 180d`)** for standard shelf-stable commodities (**USAID | DELIVER PROJECT, 2011**), and
- **Proportional Remaining Shelf Life (`RSL%`) Policies** (`50%` Optimal / `25%` Critical) for short-cycle perishables such as 7-day Nutribuns and 14-day chilled items (**World Food Programme [WFP] Logistics Operational Guide**; **DOST-FNRI, 2020**; **Hertog et al., 2014**).

---

## 2. Mathematical Formulation of Remaining Shelf Life (RSL%)

For a commodity batch with delivery/production date $T_{\text{del}}$, expiration date $T_{\text{exp}}$, total shelf-life window $S = T_{\text{exp}} - T_{\text{del}}$ (in days), and current calendar date $t$:

$$\text{Days Remaining } (D_r) = \lceil T_{\text{exp}} - t \rceil$$

$$\text{Remaining Shelf Life Ratio } (\text{RSL\%}) = \frac{D_r}{S} \times 100\%$$

Following the humanitarian warehouse **50% / 25% RSL Traffic-Light Matrix** (**WFP Logistics Cluster**) and dynamic FEFO warehouse modeling (**Hertog et al., 2014**; **La Scalia et al., 2019**):

- **Good (Green — Optimal Stock):** $\text{RSL} > 50\%$ $\implies D_r > \text{round}(0.50 \times S)$
- **Moderate (Amber — Action / Planning Stock):** $25\% < \text{RSL} \le 50\%$ $\implies \text{round}(0.25 \times S) < D_r \le \text{round}(0.50 \times S)$
- **Near Expiry (Orange — Priority FEFO Expedition):** $0\% < \text{RSL} \le 25\%$ $\implies 1 \le D_r \le \text{round}(0.25 \times S)$
- **Expired (Red — Blocked from Dispatch / For Disposal):** $D_r \le 0$

Notably, when $S = 365\text{ days}$ (1-year shelf life, as in pasteurized donor human milk), the proportional `50% / 25%` RSL formula yields $\text{Good} > 183\text{d} \approx 180\text{d}$ (6 months) and $\text{Near Expiry} \le 91\text{d} \approx 90\text{d}$ (3 months)—unifying both the **USAID 90d/180d public-health standard** and the **WFP RSL% perishable model** under one consistent mathematical framework.

---

## 3. Summary of NutriVision Expiration Profiles & Institutional Basis

| Profile Mode | Typical Commodities | Auto-Expiry on Intake | Good (Green) | Moderate (Amber) | Near Expiry (Orange) | Expired (Red) | Primary Literature / Institutional Basis |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Standard Shelf-Stable** (`standard`) | Vitamin A, Iron-Folic Acid, MNP, Zinc, RUTF/RUSF | Manual (per manufacturer packaging) | **> 180 days** (> 6 mos) | **91–180 days** (3–6 mos) | **1–90 days** (≤ 3 mos) | **≤ 0 days** | **USAID \| DELIVER PROJECT (2011)**: 3-month (90d) Near-Expiry expedition alert & 6-month (180d) Action Stock window under FEFO. |
| **2. Weekly Perishable / Nutribun** (`weekly_perishable`) | DOST-FNRI Enhanced Nutribun (Squash, Carrot, Sweet Potato), fresh bakery items | **Delivery + 7 days** | **5–7+ days** (> 4d) | **3–4 days** | **1–2 days** | **≤ 0 days** | **DOST-FNRI (2020–2021)** E-Nutribun Guidelines (4–7 day ambient shelf life in PE packaging; weekly LGU feeding dispatch under **RA 11037**) + **WFP RSL%** (`>50%` / `25–50%` / `≤25%`). |
| **3. Chilled / Short-Term Perishable** (`chilled_short`) | Refrigerated E-Nutribun, chilled dairy/food packs | **Delivery + 14 days** | **8–14+ days** (> 7d) | **5–7 days** | **1–4 days** | **≤ 0 days** | **DOST-FNRI (2020–2021)** refrigerated shelf-life extension (up to 14 days chilled) + **Hertog et al. (2014)** & **WFP RSL%** (`50% = 7d`, `~25% = 4d`). |
| **4. Custom Commodity Policy** (`custom`) | Specialized LGU rations with custom contract shelf-life rules | Optional **Delivery + $N$ days** | **> $X$ days** | **$(Y+1)$–$X$ days** | **1–$Y$ days** | **≤ 0 days** | **Ketzenberg et al. (2018)** & **La Scalia et al. (2017)**: product-specific lifetime control parameters for heterogeneous perishable SKUs. |
| **5. Milk Bank Deep-Freeze** (`milk_batches`) | Holder-Pasteurized Donor Human Milk stored at $\le -20^\circ\text{C}$ | **Pasteurization + 1 year** | **> 180 days** (> 6 mos) | **91–180 days** (3–6 mos) | **1–90 days** (≤ 3 mos) | **≤ 0 days** | **DOH Philippines Human Milk Banking MOP** (**RA 10028**) & **EMBA / Moro et al. (2019)**: validated deep-freeze shelf life of 6–12 months (up to 1 year) at $-20^\circ\text{C}$ post-Holder pasteurization. |

---

## 4. Detailed Regulatory & Domain Justification

### 4.1 Public-Health Micronutrients & Shelf-Stable Rations (`90d / 180d`)
In *The Logistics Handbook: A Practical Guide for the Supply Chain Management of Health Commodities* (2nd ed.), **USAID | DELIVER PROJECT (2011)** establishes **First-to-Expire, First-Out (FEFO)** as the mandatory warehouse rule for health and nutrition commodities. Because municipal distribution to rural barangays requires lead time for allocation, transport, and beneficiary consumption, stock with **3 months (`90 days`) or less** remaining requires immediate priority expedition or inter-facility redistribution ("Near Expiry"), while stock in the **3-to-6-month (`91–180 days`)** window requires active consumption monitoring ("Moderate").

### 4.2 Weekly Supplementary Feeding & DOST-FNRI Enhanced Nutribun (`7-Day` & `14-Day` Profiles)
Under **Republic Act No. 11037** (*Masustansyang Pagkain para sa Batang Pilipino Act*), local government units (LGUs) and Municipal Nutrition Action Offices conduct regular supplementary feeding using nutrient-dense local foods, notably the **DOST-FNRI Enhanced Nutribun (E-Nutribun)** formulated with squash, carrot, or sweet potato, iron, and vitamin A.
- According to **DOST-FNRI (2020–2021)** technology transfer and packaging guidelines, E-Nutribun baked without synthetic preservatives and sealed in polyethylene (PE) pouches has a validated **ambient room-temperature shelf life of 4 to 7 days**, and **up to 14 days under chilled/refrigerated storage**.
- Consequently, municipal nutrition programs schedule E-Nutribun deliveries for **weekly (`<= 7-day`) dispatch**. Applying the `50% / 25%` RSL rule to a 7-day cycle classifies Days `5–7` remaining as **Good** (fresh intake window), Days `3–4` remaining as **Moderate** (mid-week allocation window), and Days `1–2` remaining as **Near Expiry** (must be dispensed immediately to nearby barangays before spoilage).

### 4.3 Pasteurized Donor Human Milk Banking (`1-Year` Cold Chain at `-20°C`)
Pursuant to **Republic Act No. 10028** (*Expanded Breastfeeding Promotion Act of 2009*) and the **Department of Health (DOH) Philippine Human Milk Banking Manual of Operations**, expressed donor breastmilk processed via Holder pasteurization ($62.5^\circ\text{C}$ for 30 minutes) and maintained continuously in dedicated deep freezers at **$-20^\circ\text{C}$ or colder** is safe for storage for **6 to 12 months (up to 1 year)** depending on clinical recipient risk (**Moro et al., 2019**). NutriVision sets the default post-pasteurization expiration date to `+1 year`, enforces strict FEFO batch sorting, blocks expired milk from dispatch, and applies the 4-tier `>180d / 91–180d / 1–90d / <=0d` cold-chain visual indicator across both the Virtual Freezer Grid and tabular inventory.

---

## 5. Verified Reference List (APA 7th Edition)

1. **Department of Health [DOH] Philippines, & Philippine National Committee on Human Milk Banking.** (2016). *The Philippine human milk banking guidelines: Manual of operations* (pursuant to Republic Act No. 10028, *Expanded Breastfeeding Promotion Act of 2009*). Department of Health, Republic of the Philippines.
2. **Department of Science and Technology – Food and Nutrition Research Institute [DOST-FNRI].** (2020). *Enhanced Nutribun (E-Nutribun) production, packaging, and technology transfer guidelines* (aligned with Republic Act No. 11037, *Masustansyang Pagkain para sa Batang Pilipino Act*). DOST-FNRI. https://www.fnri.dost.gov.ph
3. **Hertog, M. L. A. T. M., Uysal, I., McCarthy, U., Verlinden, B. M., & Nicolaï, B. M.** (2014). Shelf life modelling for first-expired-first-out warehouse management. *Philosophical Transactions of the Royal Society A: Mathematical, Physical and Engineering Sciences*, *372*(2017), Article 20130306. https://doi.org/10.1098/rsta.2013.0306
4. **Ketzenberg, M., Gaukler, G., & Salin, V.** (2018). Expiration dates and order quantities for perishables. *European Journal of Operational Research*, *266*(2), 569–584. https://doi.org/10.1016/j.ejor.2017.10.005
5. **La Scalia, G., Micale, R., Miglietta, P. P., & Toma, P.** (2019). Reducing waste and ecological impacts through a sustainable and efficient management of perishable food based on the Monte Carlo simulation. *Ecological Indicators*, *97*, 363–371. https://doi.org/10.1016/j.ecolind.2018.10.021
6. **La Scalia, G., Nasca, A., Corona, O., Settanni, L., & Micale, R.** (2017). An innovative shelf life model based on smart logistic unit for an efficient management of the perishable food supply chain. *Journal of Food Process Engineering*, *40*(1), Article e12311. https://doi.org/10.1111/jfpe.12311
7. **Moro, G. E., Billeaud, C., Rachel, B., Calvo, J., Cavallarin, L., Christen, L., Escuder-Vieco, D., Gaya, A., Lembo, D., Wesolowska, A., & Arslanoglu, S.** (2019). Processing of donor human milk: Update and recommendations from the European Milk Bank Association (EMBA). *Frontiers in Pediatrics*, *7*, Article 49. https://doi.org/10.3389/fped.2019.00049
8. **USAID | DELIVER PROJECT, Task Order 1.** (2011). *The logistics handbook: A practical guide for the supply chain management of health commodities* (2nd ed.). John Snow, Inc.
9. **World Food Programme [WFP], & Global Logistics Cluster.** (2022). *Logistics operational guide (LOG): Warehouse management and specialized nutritious foods shelf-life monitoring*. World Food Programme. https://log.logcluster.org
