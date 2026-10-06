# Oil Business Management — Offer Intake

A mobile web app for collecting oil product offers (crude, fuel oil, diesel, petrol, base oil, condensate, jet fuel, LPG, bitumen). The seller taps through 6 short stages, every question has a **Don't know** option, and the app makes a designed PDF offer sheet.

Live: https://bornaxahadi.github.io/oil-business-management/

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
