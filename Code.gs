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
function doGet(e) {
  try {
    const q = e && e.parameter || {};
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
