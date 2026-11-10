# PETROMAD — Trading platform (V2)

A mobile web app for collecting oil product offers (crude, fuel oil, diesel, petrol, base oil, condensate, jet fuel, LPG, bitumen). The seller taps through 6 short stages, every question has a **Don't know** option, and the app makes a designed PDF offer sheet.

Live: https://petromad.space

## What happens when someone taps "Send offer"
1. **Gmail** — an email from your own Gmail arrives in your inbox, with the PDF and every attached file.
2. **Google Drive** — all files are saved in the folder `Oil Offers`, one sub-folder per offer.
3. **Google Sheet** — one row per offer in `Oil Offers — Inbox` (your list of all offers).
4. **Phone notification** — a push notification through the free **ntfy** app.

The seller can also share the PDF to WhatsApp or send a text summary to your WhatsApp.

## Gmail + phone notifications (one-time, ~5 minutes)
**A. Phone notifications**
1. Install **ntfy** (App Store / Google Play).
2. Tap **+**, type your secret topic name (long and random — anyone who knows it can read the alerts), tap **Subscribe**.

**B. Gmail sender (Google Apps Script)**
1. Open https://script.google.com → **New project**.
2. Delete the sample code, paste everything from `apps-script/Code.gs`.
3. In `SETTINGS`, set `ntfyTopic` to your secret topic name. Save.
4. Pick `setup` in the function menu → **Run** → **Review permissions** → choose your Google account → **Advanced → Go to project → Allow**. You should get a test notification on your phone.
5. **Deploy → New deployment** → type **Web app** → Execute as: **Me** → Who has access: **Anyone** → **Deploy**. Copy the Web app URL.

**C. Connect the app**
Open `index.html`, find `CONFIG`, paste the URL into `scriptUrl`, set `whatsappNumber`, commit.

If you change `Code.gs` later: **Deploy → Manage deployments → Edit → New version** (keeps the same URL).

## Backup route
If `scriptUrl` is empty, the app uses FormSubmit (set `receiverEmail`) plus `ntfyTopic` in `CONFIG`. FormSubmit sends a one-time Activate email on the first offer.

## Quality check and Deal profit (Module 2 + Profitability Engine)
Two tools on the home screen, also reachable from any offer's review page.

**Quality check** (`tools.js` → `engine.js`): pick the product, enter the limits from the seller spec (A), buyer contract (B) and destination rules (C), and the results from the lab certificate. Each requirement set gets its own verdict: On spec, Off spec, Requires technical review, Partially assessed or Not assessed. Each parameter is Pass, Fail, Review, Not reported or Not comparable, judged Strict, by precision band (method reproducibility) or by contract tolerance. Units are converted in code (e.g. % m/m → mg/kg) and the original value is kept. It also checks density vs API, distillation order, tank / vessel / batch / inspector against the deal, certificate dates and age, computes the contract price deduction and a linear blending estimate, and exports a PDF report and JSON. No limits are built in: a limit you leave empty is not checked.

**Deal profit**: quantity, prices, Incoterms, payment days, finance rate and a cost ledger (who pays, included in price or not, financed, deducted from proceeds, evidence tag). Returns net profit, per MT, margin, break-even, working capital, return on capital, cash cycle, four editable scenarios and sensitivities. Missing inputs return "Not assessed" with the reason. Freight entered on a CFR/CIF purchase is excluded as double counted unless an override reason is given.

Run the spec test cases with `node tests/engine.test.js`.

## V2: Our Offers, Buy From Us, trade desk (Nov 2026 brief)
Home now has three entry points: **Our Offers** (weekly cargo cards, "PETROMAD AVAILABLE CARGOES — WEEK XX"), **I Want to Buy** and **I Have Product to Sell** (the original seller intake, unchanged fields). Plus **How PETROMAD works** (process, privacy, FAQ) and **Track my request**.

Files: `platform.js` (offers, expiry, revisions, gated fields, time zones; shared with Apps Script), `market.js` (pages, buyer form, offer PDFs, offer builder), `theme.css` (night/day design), `offers.json` (published offers), `apps-script/Desk.gs` (internal scoring + matching, never loaded by the site).

**Publishing a weekly offer**: home → PETROMAD desk tools → **Publish offer**. Fill the offer, add the three names (drafted / checked / approved) and tick the four checks, Preview the card and PDF, then **Export offers.json** and commit it to this repo. Offers are active 7 days (configurable), revising creates v2 and keeps v1. Price is hidden from the public unless "Price disclosure = Public". Links: `#offer/PM-2026-W46-001`, `#buy/PM-2026-W46-001/1`, `#sell`, `#how`, `#track`.

**Buyer form**: Stage 0 contact & intent → Stage 1 requirement → Stage 2 experience (only the modules the buyer ticks; every module has "Not applicable") → review. Field IDs follow `PETROMAD_V2_Field_Dictionary.xlsx`. Drafts auto-save on the device.

**Apps Script (V2)**: add two more files to the same Apps Script project — `Platform.gs` (paste `platform.js`) and `Desk.gs` (paste `apps-script/Desk.gs`) — replace `Code.gs`, then **Deploy → Manage deployments → Edit → New version**. Buyer requests are then: refused if the offer expired or was revised (server-enforced), scored (0–100 provisional, not a probability), matched to the offer, written to the **Trade desk** tab (Stage + Public status dropdowns), **Companies** and **Activity log**; the buyer gets a 6-digit email code; evidence goes to the private "Buyer evidence" Drive folder. The **Funnel** tab counts anonymous views → PDF → request.

Run the V2 acceptance tests (T-01 … T-16) with `node tests/platform.test.js`.
