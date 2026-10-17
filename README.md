# Oil Business Management — Offer Intake

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
