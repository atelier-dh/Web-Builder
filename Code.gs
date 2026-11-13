/**
 * Moza Studio Advanced V13 — Standalone RSVP receiver for Google Sheets.
 * Supports Main RSVP (`manual_main_upsert`) and Additional RSVP V12
 * (`manual_dynamic_upsert`). Bound script: open spreadsheet -> Extensions
 * -> Apps Script -> paste this file -> Deploy as Web app.
 *
 * Execute as: Me. Access: Anyone. Copy the URL ending with /exec.
 * IMPORTANT: This is a public write endpoint. Protect the URL from abuse,
 * regularly inspect the sheet, and do not store passwords or ID documents.
 */
const MOZA_RSVP_V13 = {
  SPREADSHEET_ID: '', // Leave empty if Apps Script was opened from the target Google Sheet.
  MAX_ANSWER_KEYS: 75,
  MAX_TEXT: 1500,
  MAX_BODY: 100000,
  MAX_ROWS_SCAN: 30000
};
function mozaSheet_() {
  const ss = MOZA_RSVP_V13.SPREADSHEET_ID
    ? SpreadsheetApp.openById(MOZA_RSVP_V13.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw Error('No spreadsheet. Bind this Apps Script to a Google Sheet or set SPREADSHEET_ID.');
  return ss;
}
function mozaTab_(name) {
  const tab = String(name || 'RSVP').trim();
  if (!tab || tab.length > 90 || /[\[\]\\/*?:]/.test(tab) || tab === '_WSP_RSVP_FIELD_MAP') {
    throw Error('Invalid worksheet name');
  }
  return tab;
}
function mozaText_(v, max) {
  const raw = typeof v === 'string' ? v : JSON.stringify(v == null ? '' : v);
  const text = raw.slice(0, max || MOZA_RSVP_V13.MAX_TEXT);
  // Never allow spreadsheet formula execution from untrusted RSVP values.
  return /^[\s]*[=+@\-]/.test(text) ? "'" + text : text;
}
function mozaResponse_(value, callback) {
  const text = JSON.stringify(value);
  // Callback names only; never concatenate arbitrary executable strings.
  const cb = String(callback || '').trim();
  if (/^[A-Za-z_$][A-Za-z0-9_$]{0,70}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + text + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text)
    .setMimeType(ContentService.MimeType.JSON);
}
function mozaRows_(sheet) {
  const n = Math.min(Math.max(0, sheet.getLastRow()-1), MOZA_RSVP_V13.MAX_ROWS_SCAN);
  return n ? sheet.getRange(2, 1, n, 1).getDisplayValues().map(r => r[0]) : [];
}

/* ===== V14.8.26 - Komentar / Ucapan & Doa (elemen "Ucapan & Doa") =====
 * Tab default: "Comments". Kolom: Request ID | Time (ms) | Date | Name | Message | Attendance | Status | Project ID
 * Status "approved" = tampil di website. Ubah ke "hidden" untuk menyembunyikan, atau hapus barisnya.
 */
const MOZA_COMMENTS = {
  REQUIRE_APPROVAL: false, // true => komentar baru berstatus "pending" sampai kamu ubah Status jadi "approved"
  MAX_NAME: 60,
  MAX_MESSAGE: 1000,
  MAX_LIST: 50,
  SCAN_ROWS: 1500,         // baris terakhir yang dipindai saat menampilkan daftar
  CACHE_SECONDS: 20,
  HEADINGS: ['Request ID','Time (ms)','Date','Name','Message','Attendance','Status','Project ID']
};
function mozaCommentsVer_(tab){try{return CacheService.getScriptCache().get('mzcv_'+tab)||'0';}catch(_){return '0';}}
function mozaCommentsList_(q){
  const tab = mozaTab_(q.tab_name || q.tab || 'Comments');
  const limit = Math.max(1, Math.min(MOZA_COMMENTS.MAX_LIST, parseInt(q.limit, 10) || 10));
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  const rsvpTab = q.rsvp_tab ? mozaTab_(q.rsvp_tab) : '';
  const cacheKey = 'mzcl_' + tab + '_' + rsvpTab + '_' + mozaCommentsVer_(tab) + '_' + limit + '_' + offset;
  try { const hit = CacheService.getScriptCache().get(cacheKey); if (hit) return JSON.parse(hit); } catch (_) {}
  const sheet = mozaSheet_().getSheetByName(tab);
  let out = {ok:true, items:[], total:0};
  const all = [];
  if (sheet && sheet.getLastRow() > 1) {
    const last = sheet.getLastRow();
    const n = Math.min(last - 1, MOZA_COMMENTS.SCAN_ROWS);
    const rows = sheet.getRange(last - n + 1, 1, n, 8).getValues();
    for (let i = rows.length - 1; i >= 0; i--) {            // terbaru dulu
      const r = rows[i];
      if (String(r[6] || '').toLowerCase().trim() !== 'approved') continue;
      all.push({id:String(r[0]), t:Number(r[1]) || 0, n:String(r[3] || '').slice(0, MOZA_COMMENTS.MAX_NAME), m:String(r[4] || '').slice(0, MOZA_COMMENTS.MAX_MESSAGE), a:String(r[5] || '').slice(0, 40)});
    }
  }
  // Opsional: pesan dari form RSVP (kolom Message) ikut tampil sebagai ucapan. Hanya bila elemen meminta (rsvp_tab).
  const rs = rsvpTab ? mozaSheet_().getSheetByName(rsvpTab) : null;
  if (rs && rs.getLastRow() > 1) {
    const last2 = rs.getLastRow(), n2 = Math.min(last2 - 1, MOZA_COMMENTS.SCAN_ROWS);
    const rows2 = rs.getRange(last2 - n2 + 1, 1, n2, 9).getValues();
    for (let i = rows2.length - 1; i >= 0; i--) {
      const r = rows2[i], msg = String(r[8] || '').trim(), nm = String(r[5] || '').trim();
      if (!msg || !nm) continue;
      const when = r[1] instanceof Date ? r[1].getTime() : (Date.parse(String(r[1])) || 0);
      const at = String(r[6] || '');
      const label = /declin|not|tidak|^no\b/i.test(at) ? 'Tidak hadir' : /maybe|ragu/i.test(at) ? 'Masih ragu' : /attend|hadir|yes|accept/i.test(at) ? 'Hadir' : '';
      all.push({id:'r_' + String(r[0]), t:when, n:nm.slice(0, MOZA_COMMENTS.MAX_NAME), m:msg.slice(0, MOZA_COMMENTS.MAX_MESSAGE), a:label});
    }
  }
  if (all.length) {
    all.sort(function (a, b) { return b.t - a.t; });
    out = {ok:true, total:all.length, items:all.slice(offset, offset + limit)};
  }
  try { CacheService.getScriptCache().put(cacheKey, JSON.stringify(out), MOZA_COMMENTS.CACHE_SECONDS); } catch (_) {}
  return out;
}
function mozaCommentAdd_(p, lock) {
  const id = String(p.request_id || '').slice(0, 140);
  if (!/^[A-Za-z0-9_-]{8,140}$/.test(id)) throw Error('Invalid request id');
  if (p.contact_website) throw Error('Spam guard');
  const tab = mozaTab_(p.tab_name || 'Comments');
  const name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, MOZA_COMMENTS.MAX_NAME);
  const message = String(p.message || '').replace(/\r/g, '').trim().slice(0, MOZA_COMMENTS.MAX_MESSAGE);
  if (!name || !message) throw Error('Name and message are required');
  lock.waitLock(20000);
  const ss = mozaSheet_(), sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
  if (sheet.getLastRow() === 0) sheet.appendRow(MOZA_COMMENTS.HEADINGS);
  if (mozaRows_(sheet).indexOf(id) !== -1) return mozaResponse_({ok:true, duplicate:true});
  const now = new Date();
  sheet.appendRow([id, now.getTime(), Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    mozaText_(name, MOZA_COMMENTS.MAX_NAME), mozaText_(message, MOZA_COMMENTS.MAX_MESSAGE), mozaText_(p.attendance || '', 40),
    MOZA_COMMENTS.REQUIRE_APPROVAL ? 'pending' : 'approved', mozaText_(p.project_id || '', 140)]);
  SpreadsheetApp.flush();
  try { CacheService.getScriptCache().put('mzcv_' + tab, String(now.getTime()), 21600); } catch (_) {}
  return mozaResponse_({ok:true, request_id:id, status:MOZA_COMMENTS.REQUIRE_APPROVAL ? 'pending' : 'approved'});
}
function doGet(e) {
  try {
    const q = e && e.parameter || {};
    if (q.action === 'comments') return mozaResponse_(mozaCommentsList_(q), q.callback);
    if (q.action !== 'status') return mozaResponse_({ok:true,version:13,service:'Moza RSVP Web App',info:'Ready. Open invitation to submit a test RSVP.'}, q.callback);
    const id = String(q.request_id || '').slice(0, 140);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw Error('Invalid request ID');
    const name = mozaTab_(q.tab_name);
    const sheet = mozaSheet_().getSheetByName(name);
    const found = !!sheet && mozaRows_(sheet).indexOf(id) !== -1;
    return mozaResponse_({ok:true,found:found,request_id:id},q.callback);
  } catch (error) {return mozaResponse_({ok:false,error:String(error.message||error).slice(0,180)},e&&e.parameter&&e.parameter.callback);}
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = String(e && e.postData && e.postData.contents || '');
    if (!body || body.length > MOZA_RSVP_V13.MAX_BODY) throw Error('Invalid or oversized RSVP body');
    const p = JSON.parse(body);
    if (p.action === 'comment_add') return mozaCommentAdd_(p, lock);
    if (!['manual_dynamic_upsert','manual_main_upsert'].includes(p.action)) throw Error('Action not supported');
    const id = String(p.request_id || '').slice(0,140);
    if (!/^[A-Za-z0-9_-]{8,140}$/.test(id)) throw Error('Invalid request id');
    if (p.contact_website) throw Error('Spam guard');
    const tab = mozaTab_(p.tab_name);
    if (!p.answers || typeof p.answers !== 'object' || Array.isArray(p.answers)) throw Error('Answers must be an object');
    const keys = Object.keys(p.answers).slice(0, MOZA_RSVP_V13.MAX_ANSWER_KEYS);
    const rowAnswers = {};
    keys.forEach(k => {rowAnswers[String(k).slice(0,100)] = mozaText_(p.answers[k]);});
    lock.waitLock(20000);
    const ss=mozaSheet_(), sheet=ss.getSheetByName(tab)||ss.insertSheet(tab);
    const headings=['Request ID','Submitted At','Project ID','Form ID','Form Name','Guest Name','Attendance','Guest Count','Message','Answers JSON','Website URL'];
    if(sheet.getLastRow()===0)sheet.appendRow(headings);
    const existing=mozaRows_(sheet).indexOf(id);
    if(existing!==-1)return mozaResponse_({ok:true,found:true,duplicate:true});
    const guestName=Object.entries(rowAnswers).find(([k])=>/guest.?name|full.?name|^name|nama/i.test(k));
    const answersJson=JSON.stringify(rowAnswers);
    const values=[id,mozaText_(p.submitted_at||new Date().toISOString(),80),mozaText_(p.project_id||'',140),mozaText_(p.form_id||'',140),mozaText_(p.form_name||'',140),guestName?guestName[1]:'',mozaText_(rowAnswers.attendance||''),mozaText_(rowAnswers.attendee_count||''),mozaText_(rowAnswers.message||''),mozaText_(answersJson,18000),mozaText_(p.website_url||'',500)];
    sheet.appendRow(values);
    SpreadsheetApp.flush();
    return mozaResponse_({ok:true,found:true,request_id:id});
  } catch (error) {return mozaResponse_({ok:false,error:String(error.message||error).slice(0,180)});}
  finally {try{lock.releaseLock();}catch(_) {}}
}
