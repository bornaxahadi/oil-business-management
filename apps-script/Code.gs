/**
 * Oil Business Management — offer receiver (Google Apps Script)
 *
 * Every offer sent from the web app:
 *   1. is emailed from YOUR Gmail to you, with the PDF + all files attached
 *   2. is saved in Google Drive  → folder "Oil Offers" / one sub-folder per offer
 *   3. is logged as one row in a Google Sheet "Oil Offers — Inbox"
 *   4. pings your phone through the free ntfy app
 *
 * Setup: see README.md (section "Gmail + phone notifications").
 */
const SETTINGS = {
  toEmail: 'petromadxb@gmail.com',   // every offer is sent here
  ccEmail: 'ahadiborna@gmail.com',   // and copied here
  ntfyTopic: 'CHOOSE-A-SECRET-NAME', // same name you subscribe to in the ntfy app
  folderName: 'Oil Offers',
  sheetName: 'Oil Offers — Inbox'
};

const HEADERS = ['Received','Ref','Category','Product','Origin','Refinery','Seller position','Quantity','Location',
  'Price','Contact','Company','WhatsApp','Email','Completeness','Files folder'];

/** Run this once from the editor to grant permissions and create the folder + sheet. */
function setup() {
  const f = folder_(); const s = sheet_();
  Logger.log('Folder: ' + f.getUrl());
  Logger.log('Sheet:  ' + s.getParent().getUrl());
  notify_({product: 'Test notification', category: 'Setup complete'}, 'TEST', f.getUrl());
}

function doGet() { return out_({ok: true, service: 'oil offer receiver'}); }

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const ref = String(d.ref || ('OFR-' + Date.now()));
    const sub = folder_().createFolder(ref + ' - ' + (d.product || 'offer'));

    const blobs = (d.files || []).map(f =>
      Utilities.newBlob(Utilities.base64Decode(f.data), f.mime || 'application/octet-stream', f.name));
    blobs.forEach(b => sub.createFile(b));

    // Gmail limit is 25 MB per email — if files are bigger, attach the PDF only and link the folder.
    const total = blobs.reduce((n, b) => n + b.getBytes().length, 0);
    const attach = total < 20 * 1024 * 1024 ? blobs : blobs.slice(0, 1);

    sheet_().appendRow([new Date(), ref, d.category, d.product, d.origin, d.refinery, d.seller, d.quantity,
      d.location, d.price, d.contactName, d.company, d.phone, d.email, d.completeness, sub.getUrl()]);

    const to = SETTINGS.toEmail || Session.getEffectiveUser().getEmail();
    const opts = {htmlBody: html_(d, ref, sub.getUrl(), attach.length < blobs.length), attachments: attach, name: 'Oil Offer Desk'};
    if (SETTINGS.ccEmail) opts.cc = SETTINGS.ccEmail;
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) opts.replyTo = d.email;
    GmailApp.sendEmail(to, 'New oil offer ' + ref + ' — ' + (d.product || '') + (d.customs && d.customs.length ? ' ★ new options' : ''), d.text || '', opts);

    if (d.customs && d.customs.length) newOptions_().appendRow([new Date(), ref, d.product, d.customs.map(c => c.q + ': ' + c.v).join(' | ')]);
    notify_(d, ref, sub.getUrl());
    return out_({ok: true, ref: ref});
  } catch (err) {
    return out_({ok: false, error: String(err)});
  }
}

/* ---------- helpers ---------- */
function folder_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder(SETTINGS.folderName);
  p.setProperty('FOLDER', f.getId());
  return f;
}

function sheet_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('SHEET');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  const ss = SpreadsheetApp.create(SETTINGS.sheetName);
  const sh = ss.getSheets()[0];
  sh.appendRow(HEADERS);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#1B1B1B').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  DriveApp.getFileById(ss.getId()).moveTo(folder_());
  p.setProperty('SHEET', ss.getId());
  return sh;
}

/** Second tab in the Sheet: answers sellers typed under "Custom" — candidates to add to the app's lists. */
function newOptions_() {
  const ss = sheet_().getParent();
  return ss.getSheetByName('New options') || (() => {
    const s = ss.insertSheet('New options'); s.appendRow(['Received', 'Ref', 'Product', 'Custom answers']);
    s.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#F2C94C'); s.setFrozenRows(1); return s; })();
}

function notify_(d, ref, link) {
  if (!SETTINGS.ntfyTopic || /CHOOSE-A-SECRET/.test(SETTINGS.ntfyTopic)) return;
  const msg = [d.category, d.origin, d.quantity, d.price,
    d.contactName ? ('From ' + d.contactName + ' ' + (d.phone || '')).trim() : '',
    d.completeness ? ('Ref ' + ref + ' · ' + d.completeness + ' complete') : ''].filter(String).join('\n');
  UrlFetchApp.fetch('https://ntfy.sh/', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({topic: SETTINGS.ntfyTopic, title: 'New offer: ' + (d.product || ''), message: msg || 'New offer',
      tags: ['oil_drum'], priority: 4, click: link, actions: [{action: 'view', label: 'Open files', url: link}]})
  });
}

function esc_(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function html_(d, ref, link, trimmed) {
  const sec = (d.sections || []).map(s => `
    <tr><td style="padding:14px 0 6px;font:700 15px Arial;color:#1B1B1B">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};border:1px solid #0002;margin-right:6px"></span>${esc_(s.title)}</td></tr>
    <tr><td style="background:#fff;border-radius:16px;padding:10px 14px">
      <table width="100%" cellpadding="0" cellspacing="0" style="font:13px Arial">${s.rows.map(r =>
        `<tr><td style="padding:4px 0;color:#6E6A61;width:44%;vertical-align:top">${esc_(r.k)}</td>
         <td style="padding:4px 0;font-weight:bold;color:${r.v && r.v !== "Don't know" ? '#1B1B1B' : '#A09A8C'}">${esc_(r.v || '—')}</td></tr>`).join('')}
      </table></td></tr>`).join('');
  return `<div style="background:#EEEAE0;padding:20px;font-family:Arial,sans-serif">
   <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
    <tr><td style="background:#1B1B1B;color:#fff;border-radius:22px;padding:20px 22px">
      <div style="font-size:12px;opacity:.75">${esc_(d.category)} · ${esc_(ref)}</div>
      <div style="font-size:30px;font-weight:bold;margin:6px 0">${esc_(d.product)}</div>
      <div style="font-size:14px">${esc_([d.origin, d.quantity, d.price].filter(String).join(' · '))}</div>
      <div style="margin-top:12px;font-size:13px">Completeness: <b>${esc_(d.completeness)}</b></div>
    </td></tr>
    ${(d.customs && d.customs.length) ? `<tr><td style="padding-top:14px"><div style="background:#F2C94C;border-radius:16px;padding:12px 14px;font:13px Arial"><b>★ New options typed by the seller</b> — add to the app?<br>${d.customs.map(c => esc_(c.q) + ': <b>' + esc_(c.v) + '</b>').join('<br>')}</div></td></tr>` : ''}
    ${sec}
    <tr><td style="padding:16px 0">
      <a href="${link}" style="display:inline-block;background:#1B1B1B;color:#fff;text-decoration:none;padding:12px 20px;border-radius:99px;font-weight:bold">Open files in Drive</a>
      ${trimmed ? '<div style="font-size:12px;color:#6E6A61;margin-top:8px">Files were too large to attach — they are all in the Drive folder.</div>' : ''}
    </td></tr>
   </table></div>`;
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
