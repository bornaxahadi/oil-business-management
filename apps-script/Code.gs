/**
 * PETROMAD — offer + buyer request receiver (Google Apps Script)
 *
 * This project needs THREE files in the Apps Script editor:
 *   Code.gs     (this file)
 *   Platform.gs (paste platform.js from the website repo)
 *   Desk.gs     (paste apps-script/Desk.gs — internal scoring + matching)
 *
 * Buyer requests (V2):
 *   - checked against the published offers.json: expired / revised offers are refused (server-enforced)
 *   - scored with the internal rubric (never shown to applicants), matched to the offer
 *   - logged in the "Trade desk" tab (board stages), "Companies" and "Activity log"
 *   - a 6-digit code is emailed to the buyer to verify the address
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
  toEmail: 'ahadiborna@gmail.com',   // every offer is sent here
  ccEmail: '',
  ntfyTopic: 'CHOOSE-A-SECRET-NAME', // same name you subscribe to in the ntfy app
  folderName: 'Oil Offers',
  sheetName: 'Oil Offers — Inbox',
  offersUrl: 'https://petromad.space/offers.json', // published weekly offers
  evidenceFolder: 'Buyer evidence (private)',      // never shared; desk only
  maxRequestsPerHour: 3                            // per email address
};
const STAGES = ['New buyer enquiry', 'Qualified / follow-up', 'Matched cargo', 'Negotiating / SPA', 'Execution', 'Closed / lost'];
const PUBLIC_STATUS = ['Received', 'Under review', 'Clarification requested', 'Closed'];
const DESK_HEADERS = ['Received (UTC)', 'Ref', 'Stage', 'Public status', 'Owner', 'Company', 'Company key', 'Contact', 'Position', 'Email', 'Email verified',
  'WhatsApp', 'Declared role', 'Authorised', 'Product family', 'Grade', 'Quantity', 'Target period', 'Delivery', 'Offer ID', 'Offer version',
  'Readiness score (provisional, not a probability)', 'Score by dimension', 'Evidence confidence', 'Commercial fit', 'Match reasons', 'Review alerts',
  'Compliance status', 'Compliance cases', 'Requested evidence', 'Next action', 'Follow-up questions', 'Files folder', 'Rubric / question bank', 'Answers (JSON)'];

const HEADERS = ['Received','Ref','Category','Product','Origin','Refinery','Seller position','Quantity','Location',
  'Price','Contact','Company','WhatsApp','Email','Completeness','Files folder'];

/** Run this once from the editor to grant permissions and create the folder + sheet. */
function setup() {
  const f = folder_(); const s = sheet_();
  Logger.log('Folder: ' + f.getUrl());
  Logger.log('Sheet:  ' + s.getParent().getUrl());
  notify_({product: 'Test notification', category: 'Setup complete'}, 'TEST', f.getUrl());
}

/** GET ?learned=1 → answers typed under "Custom" by at least LEARN_MIN different offers.
 *  The app shows them as normal buttons. To remove one, delete its rows in the "New options" tab. */
const LEARN_MIN = 2;
function doGet(e) {
  if (e && e.parameter && e.parameter.status) return out_(status_(e.parameter.status, e.parameter.email));
  if (!(e && e.parameter && e.parameter.learned)) return out_({ok: true, service: 'PETROMAD receiver'});
  const rows = newOptions_().getDataRange().getValues().slice(1);
  const seen = {};
  rows.forEach(r => {
    const ref = r[1], key = String(r[5] || ''), val = String(r[4] || '').trim();
    if (!key || !val || val.length > 60) return;
    const id = key + '||' + val.toLowerCase();
    (seen[id] = seen[id] || {key: key, val: val, refs: {}}).refs[ref] = 1;
  });
  const options = {};
  Object.keys(seen).forEach(id => { const s = seen[id];
    if (Object.keys(s.refs).length >= LEARN_MIN) (options[s.key] = options[s.key] || []).push(s.val); });
  return out_({ok: true, options: options});
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.type === 'event') return out_(event_(d));
    if (d.type === 'verify') return out_(verify_(d));
    if (d.type === 'buyer') return out_(buyer_(d));
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

    (d.customs || []).forEach(c => newOptions_().appendRow([new Date(), ref, d.product, c.q, c.v, c.key || '']));
    company_(d.email, d.company, d.contactName, 'Seller', ref);
    audit_(ref, 'Seller offer received', d.email || '', 'system');
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
    const s = ss.insertSheet('New options'); s.appendRow(['Received', 'Ref', 'Product', 'Question', 'Answer typed', 'Key']);
    s.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#F2C94C'); s.setFrozenRows(1); return s; })();
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


/* ============================================================
   V2 — buyer requests, trade desk, companies, OTP, funnel
   ============================================================ */
function ss_() { return sheet_().getParent(); }
function tab_(name, headers, color) {
  const ss = ss_();
  let t = ss.getSheetByName(name);
  if (!t) {
    t = ss.insertSheet(name); t.appendRow(headers);
    t.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground(color || '#0B1120').setFontColor('#FFFFFF'); t.setFrozenRows(1);
  }
  return t;
}
function desk_() {
  const t = tab_('Trade desk', DESK_HEADERS, '#0B1120');
  if (!t.getRange('C2').getDataValidation()) {
    t.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STAGES, true).build());
    t.getRange('D2:D').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PUBLIC_STATUS, true).build());
  }
  return t;
}
function companies_() { return tab_('Companies', ['Company key', 'Company', 'First seen', 'Last seen', 'Roles seen', 'Contacts', 'Refs'], '#8B5E34'); }
function auditTab_() { return tab_('Activity log', ['Time (UTC)', 'Ref', 'Event', 'Detail', 'By'], '#56637A'); }
function funnel_() { return tab_('Funnel', ['Date', 'Event', 'Offer', 'Count'], '#2FBF71'); }
function audit_(ref, ev, detail, by) { auditTab_().appendRow([new Date(), ref, ev, String(detail || '').slice(0, 500), by || 'system']); }

/** One company profile even when it buys in one deal and sells in another (T-13). */
function company_(email, name, contact, role, ref) {
  const key = PMP.companyKey(email, name); if (!key) return '';
  const t = companies_(), rows = t.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      const roles = String(rows[i][4] || '').split(', ').filter(String); if (roles.indexOf(role) < 0) roles.push(role);
      const cons = String(rows[i][5] || '').split(', ').filter(String); const c = [contact, email].filter(String).join(' '); if (c && cons.indexOf(c) < 0) cons.push(c);
      t.getRange(i + 1, 4, 1, 4).setValues([[new Date(), roles.join(', '), cons.join(', '), (rows[i][6] ? rows[i][6] + ', ' : '') + ref]]);
      return key;
    }
  }
  t.appendRow([key, name || '', new Date(), new Date(), role, [contact, email].filter(String).join(' '), ref]);
  return key;
}

function offers_() {
  const c = CacheService.getScriptCache(), hit = c.get('offers');
  if (hit) return JSON.parse(hit);
  const r = UrlFetchApp.fetch(SETTINGS.offersUrl + '?t=' + Date.now(), {muteHttpExceptions: true});
  const data = r.getResponseCode() === 200 ? JSON.parse(r.getContentText()) : {offers: []};
  c.put('offers', JSON.stringify(data), 60);
  return data;
}

function buyer_(d) {
  if (d.hp) return {ok: true, ref: d.ref};                      // bot trap: pretend success, store nothing
  const a = d.answers || {}, email = String(a.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return {ok: false, message: 'Please enter a valid email address.'};
  const cache = CacheService.getScriptCache(), rk = 'rate:' + email, n = Number(cache.get(rk) || 0);
  if (n >= SETTINGS.maxRequestsPerHour) return {ok: false, message: 'Too many requests from this email in the last hour. Please try later.'};
  cache.put(rk, String(n + 1), 3600);

  // Server-enforced offer validity + revision lock (T-06, T-07)
  let ver = null;
  if (d.offerId) {
    const data = offers_(), chk = PMP.canRequest(data, d.offerId, d.offerVersion);
    if (!chk.ok) return {ok: false, code: chk.code, message: chk.message};
    ver = PMP.versionOf(PMP.findOffer(data, d.offerId), d.offerVersion);
  }
  const ref = String(d.ref || ('ENQ-' + Date.now()));
  const sc = DESK.scoreBuyer(a), match = ver ? DESK.matchBuyerToOffer(a, ver) : null, fu = DESK.followUps(a);

  // Evidence: private Drive folder only (T-11)
  let link = '';
  if ((d.files || []).length) {
    const root = DriveApp.getFoldersByName(SETTINGS.evidenceFolder).hasNext() ? DriveApp.getFoldersByName(SETTINGS.evidenceFolder).next() : folder_().createFolder(SETTINGS.evidenceFolder);
    const sub = root.createFolder(ref + ' - ' + (a.company || 'buyer'));
    d.files.slice(0, 10).forEach(f => {
      const ok = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/.test(f.mime || '');
      if (!ok) return;                                             // content-type allow list
      sub.createFile(Utilities.newBlob(Utilities.base64Decode(f.data), f.mime, '[' + f.kind + '] ' + f.name));
    });
    link = sub.getUrl();
  }
  const key = company_(email, a.company, a.cname, 'Buyer', ref);
  const qty = [a.qmin, a.qmax].filter(String).join('–') + ' ' + (a.qunit || '');
  desk_().appendRow([new Date(), ref, STAGES[0], PUBLIC_STATUS[0], '', a.company, key, a.cname, a.position, email, 'No', a.phone,
    sc.role.label, a.authorised, [].concat(a.family || []).join(', '), a.grade, qty.trim(), [a.win_from, a.win_to].filter(String).join(' to '),
    [a.basis, a.place].filter(String).join(' '), d.offerId || '', d.offerVersion || '',
    sc.score, sc.dimensions.map(x => x.name + ': ' + (x.applicable ? x.score + '/' + x.weight : 'N/A')).join('\n'),
    sc.evidence.level + ' — ' + sc.evidence.reason, match ? match.label : 'No offer linked', match ? match.reasons.join('\n') : '',
    sc.alerts.map(x => '[' + x.severity + '] ' + x.message).join('\n'), sc.compliance.status, sc.compliance.cases.map(c => c.code + ': ' + c.message).join('\n'),
    '', sc.nextActions.join('\n'), fu.join('\n'), link, sc.rubricVersion + ' / ' + sc.questionBankVersion, JSON.stringify(a).slice(0, 45000)]);
  audit_(ref, 'Buyer request received', (d.offerId ? d.offerId + ' v' + d.offerVersion + ' · ' : '') + 'score ' + sc.score + ' · ' + sc.compliance.status, 'system');

  // OTP email to the applicant (no score, no internal notes)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('otp:' + ref, Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, code + ref)), 1800);
  GmailApp.sendEmail(email, 'PETROMAD request ' + ref + ' — your verification code', '', {name: 'PETROMAD', htmlBody:
    '<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 8px">Request received</h2><p>Reference <b>' + esc_(ref) + '</b>' +
    (d.offerId ? ' for offer <b>' + esc_(d.offerId + ' v' + d.offerVersion) + '</b>' : '') + '.</p>' +
    '<p>Your verification code: <b style="font-size:22px;letter-spacing:4px">' + code + '</b> (valid 30 minutes).</p>' +
    '<p style="color:#56637A;font-size:12px">' + esc_(PMP.NON_BINDING) + '</p></div>'});

  // Internal notification (desk only)
  const to = SETTINGS.toEmail || Session.getEffectiveUser().getEmail();
  GmailApp.sendEmail(to, 'Buyer request ' + ref + ' — ' + (a.company || '') + ' — ' + (a.grade || '') + (match ? ' — ' + match.label : ''), '', {name: 'PETROMAD Desk', replyTo: email,
    htmlBody: deskHtml_(ref, a, sc, match, fu, link, d)});
  notifyRaw_('Buyer request: ' + (a.grade || ''), [a.company, sc.role.label, qty, [a.basis, a.place].join(' '), match ? match.label : '', 'Readiness ' + sc.score + '/100 (provisional)', sc.compliance.status].filter(String).join('\n'), link || ss_().getUrl());
  return {ok: true, ref: ref, otpSent: true};
}

function verify_(d) {
  const c = CacheService.getScriptCache(), h = c.get('otp:' + d.ref);
  if (!h) return {ok: false, message: 'The code expired. Contact us to verify.'};
  const try_ = 'otptry:' + d.ref, n = Number(c.get(try_) || 0); if (n >= 5) return {ok: false, message: 'Too many attempts.'};
  c.put(try_, String(n + 1), 1800);
  const ok = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(d.code) + d.ref)) === h;
  if (!ok) return {ok: false, message: 'That code did not match.'};
  const t = desk_(), rows = t.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][1] === d.ref) { t.getRange(i + 1, 11).setValue('Yes ' + new Date().toISOString()); break; }
  c.remove('otp:' + d.ref); audit_(d.ref, 'Email verified', '', 'applicant');
  return {ok: true};
}

/** Applicant-facing status: no score, no notes. */
function status_(ref, email) {
  ref = String(ref || '').trim(); email = String(email || '').trim().toLowerCase();
  const rows = desk_().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][1] === ref && String(rows[i][9]).toLowerCase() === email)
    return {ok: true, ref: ref, status: rows[i][3] || 'Received', received: Utilities.formatDate(new Date(rows[i][0]), 'Asia/Dubai', 'd MMM yyyy HH:mm') + ' GST'};
  const srows = sheet_().getDataRange().getValues();
  for (let i = 1; i < srows.length; i++) if (srows[i][1] === ref && String(srows[i][13]).toLowerCase() === email)
    return {ok: true, ref: ref, status: 'Received', received: Utilities.formatDate(new Date(srows[i][0]), 'Asia/Dubai', 'd MMM yyyy HH:mm') + ' GST'};
  return {ok: false, message: 'No request found for that reference and email.'};
}

/** Anonymous funnel counts: view → PDF → request → stage 0 → sent. No personal data. */
function event_(d) {
  const allowed = ['offer_view', 'offer_pdf', 'request_start', 'stage0', 'request_sent', 'ask'];
  if (allowed.indexOf(d.name) < 0) return {ok: false};
  const day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'), offer = String(d.offerId || '').slice(0, 24);
  const lock = LockService.getScriptLock(); lock.tryLock(5000);
  try {
    const t = funnel_(), rows = t.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      const rd = rows[i][0] instanceof Date ? Utilities.formatDate(rows[i][0], 'UTC', 'yyyy-MM-dd') : String(rows[i][0]);
      if (rd !== day) break;
      if (rows[i][1] === d.name && rows[i][2] === offer) { t.getRange(i + 1, 4).setValue(Number(rows[i][3]) + 1); return {ok: true}; }
    }
    t.appendRow([day, d.name, offer, 1]);
  } finally { lock.releaseLock(); }
  return {ok: true};
}

function notifyRaw_(title, msg, link) {
  if (!SETTINGS.ntfyTopic || /CHOOSE-A-SECRET/.test(SETTINGS.ntfyTopic)) return;
  UrlFetchApp.fetch('https://ntfy.sh/', {method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({topic: SETTINGS.ntfyTopic, title: title, message: msg, tags: ['ship'], priority: 4, click: link})});
}

function deskHtml_(ref, a, sc, match, fu, link, d) {
  const row = (k, v) => '<tr><td style="padding:4px 8px 4px 0;color:#56637A;vertical-align:top;width:40%">' + esc_(k) + '</td><td style="padding:4px 0;font-weight:bold">' + esc_(v) + '</td></tr>';
  const sec = (t, body) => '<h3 style="font:bold 13px Arial;letter-spacing:.08em;color:#C77A0A;text-transform:uppercase;margin:18px 0 6px">' + esc_(t) + '</h3>' + body;
  const list = xs => xs.length ? '<ul style="margin:0;padding-left:18px">' + xs.map(x => '<li>' + esc_(x) + '</li>').join('') + '</ul>' : '<p>None</p>';
  return '<div style="font-family:Arial,sans-serif;max-width:640px;background:#F4F6F9;padding:18px">' +
    '<div style="background:#0B1120;color:#fff;border-radius:16px;padding:18px"><div style="font-size:12px;color:#9FB0CC">INTERNAL · ' + esc_(ref) + (d.offerId ? ' · ' + esc_(d.offerId + ' v' + d.offerVersion) : '') + '</div>' +
    '<div style="font-size:24px;font-weight:bold;margin:6px 0">' + esc_(a.company || '') + ' — ' + esc_(a.grade || '') + '</div>' +
    '<div>Trade execution readiness: <b style="color:#F2A73B">' + esc_(sc.scoreLabel) + '</b></div>' +
    '<div>Role: ' + esc_(sc.role.label) + '</div><div>Evidence confidence: ' + esc_(sc.evidence.level) + '</div>' +
    '<div>Commercial fit: ' + esc_(match ? match.label : 'No offer linked') + '</div><div>Compliance: <b>' + esc_(sc.compliance.status) + '</b> (no commercial release)</div></div>' +
    sec('Score by dimension', '<table style="font:13px Arial">' + sc.dimensions.map(x => row(x.name, x.applicable ? x.score + ' / ' + x.weight + ' · ' + x.basis : 'N/A (excluded)')).join('') + '</table>') +
    (match ? sec('Match reasons', list(match.reasons)) : '') +
    sec('Review alerts (not findings)', list(sc.alerts.map(x => '[' + x.severity + '] ' + x.message + ' → ' + x.action))) +
    sec('Compliance', list(sc.compliance.cases.map(c => c.code + ': ' + c.message).concat([sc.compliance.note]))) +
    sec('Suggested follow-up questions', list(fu)) +
    sec('Answers', (d.summary || []).map(s => '<b>' + esc_(s.title) + '</b><table style="font:13px Arial;width:100%">' + s.rows.map(r => row(r[0], r[1])).join('') + '</table>').join('')) +
    (link ? '<p><a href="' + link + '">Open evidence (private folder)</a></p>' : '') +
    '<p style="font-size:11px;color:#56637A">Rubric ' + sc.rubricVersion + ' · question bank ' + sc.questionBankVersion + '. Scores are provisional, self-reported unless verified, and are NOT probabilities. Never treat an alert as a finding of fraud.</p></div>';
}
