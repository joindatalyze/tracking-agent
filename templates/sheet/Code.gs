/**
 * Datalyze Tracking Agent: the Sheet's receiver.
 *
 * The tracking plan in this Sheet is a view of the registry in your repo,
 * rebuilt by `datalyze sync-sheet` after every merge. This script is how the
 * sync reaches the Sheet without a Google Cloud project: deployed as a web app,
 * it answers GET (read tabs) and POST (write tabs) for requests that carry
 * its token. Nothing here talks to Datalyze.
 *
 * Set up: Datalyze menu > Connect, then follow the steps it shows.
 */

var TOKEN_PROPERTY = 'DATALYZE_TOKEN';

/**
 * The fixed header rows, the same as the sync's (src/sheet/tabs.ts, `headers()`;
 * a test keeps the two in step). The sync names the "Verified in" column after
 * your analytics tool; until the first sync it says "analytics".
 */
var HEADERS = {
  'Tracking Plan': ['Section', 'Event Name', 'Description', 'Property', 'Data Type', 'Example Values', 'Required', 'Track Via', 'Status', 'Question', 'Last Changed', 'Verified in analytics', 'Analyst Notes'],
  'User Properties': ['Property', 'Data Type', 'Example Values', 'Operation', 'Set Via', 'Set When', 'Source', 'Question', 'PII', 'Status', 'Last Changed', 'Verified in analytics', 'Analyst Notes'],
  'Super & Group Properties': ['Scope', 'Group', 'Property', 'Data Type', 'Example Values', 'Set Via', 'Set When', 'Status', 'Description'],
  'Deprecated': ['Kind', 'Name', 'Property', 'Section', 'Deprecated Reason', 'Replaced By', 'Dual Fire Until', 'Date', 'Verified in analytics', 'Analyst Notes'],
  'Changelog': ['Date', 'Kind', 'Item', 'Change', 'Ref', 'Approved By']
};

var PROTECTION_NOTE = 'Datalyze: rebuilt from the registry on every merge. Edit only the human columns.';

// ---- Web app ----------------------------------------------------------------------------

/** GET ?token=...&tabs=A,B: the tabs' values as shown, header row first. */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!validToken_(p.token)) return json_({ ok: false, error: 'The token is wrong or the Sheet is not connected (Datalyze menu > Connect).' });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = p.tabs ? String(p.tabs).split(',') : ss.getSheets().map(function (s) { return s.getName(); });
  var tabs = {};
  names.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) tabs[name] = readValues_(sheet);
  });
  return json_({ ok: true, tabs: tabs });
}

/**
 * POST a JSON body with the token:
 *   { action: 'write', tabs: { name: rows }, protect: [names], human: { name: [columns] } }
 */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'The request body is not JSON.' });
  }
  if (!validToken_(body.token)) return json_({ ok: false, error: 'The token is wrong or the Sheet is not connected (Datalyze menu > Connect).' });
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (body.action === 'write') {
      writeTabs_(body.tabs || {}, body.protect || [], body.human || {});
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'Unknown action: ' + body.action });
  } finally {
    lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function validToken_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || typeof given !== 'string' || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** Display values, without the empty rows at the bottom. */
function readValues_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  while (values.length && values[values.length - 1].every(function (c) { return c === ''; })) values.pop();
  return values;
}

// ---- Writing tabs -------------------------------------------------------------------------

/**
 * Each tab's contents replaced whole; formats people added to other columns stay.
 * The new values go in first and only then is whatever is left below or to the
 * right cleared, so a write that fails part-way never leaves a blank tab.
 */
function writeTabs_(tabs, protect, human) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(tabs).forEach(function (name) {
    var rows = tabs[name];
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var width = 1;
    rows.forEach(function (r) { width = Math.max(width, r.length); });
    var padded = rows.map(function (r) {
      var out = r.map(function (c) { return c === null || c === undefined ? '' : String(c); });
      while (out.length < width) out.push('');
      return out;
    });
    var oldRows = sheet.getLastRow();
    var oldCols = sheet.getLastColumn();
    if (sheet.getMaxRows() < padded.length) sheet.insertRowsAfter(sheet.getMaxRows(), padded.length - sheet.getMaxRows());
    if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
    if (padded.length) {
      var range = sheet.getRange(1, 1, padded.length, width);
      range.setNumberFormat('@'); // plain text: "2026-10-20" and "1e3" stay as written
      range.setValues(padded);
      sheet.getRange(1, 1, 1, width).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    // Then the leftovers: rows below the new last row, and cells right of the new width.
    if (oldRows > padded.length) sheet.getRange(padded.length + 1, 1, oldRows - padded.length, Math.max(oldCols, width)).clearContent();
    if (oldCols > width && padded.length) sheet.getRange(1, width + 1, padded.length, oldCols - width).clearContent();
    if (protect.indexOf(name) >= 0) protectSheet_(sheet, human[name] || []);
  });
}

/**
 * Warning-only protection on a tab the sync rebuilds: anyone editing it is
 * reminded the change won't survive the next sync. The human columns are
 * left open.
 */
function protectSheet_(sheet, humanColumns) {
  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).filter(function (p) {
    return String(p.getDescription()).indexOf('Datalyze:') === 0;
  });
  var protection = existing.length ? existing[0] : sheet.protect().setDescription(PROTECTION_NOTE);
  protection.setWarningOnly(true);
  // From row 2: the header row stays protected, human columns' headers included, because the
  // sync finds people's notes by those names.
  protection.setUnprotectedRanges(humanColumns.map(function (c) {
    return sheet.getRange(2, c + 1, Math.max(1, sheet.getMaxRows() - 1), 1);
  }));
}

// ---- The Datalyze menu -------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Datalyze')
    .addItem('Connect', 'datalyzeConnect')
    .addItem('Make a new token', 'datalyzeNewToken')
    .addItem('Set up the tabs', 'datalyzeSetupTabs')
    .addToUi();
}

/** Makes the token (once) and shows the steps to deploy the web app and connect it. */
function datalyzeConnect() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty(TOKEN_PROPERTY);
  if (!token) {
    token = newToken_();
    props.setProperty(TOKEN_PROPERTY, token);
  }
  datalyzeSetupTabs();
  showConnect_(token);
  return token;
}

/** A new token; the old one stops working at once. Update DATALYZE_SHEET_TOKEN in your repo. */
function datalyzeNewToken() {
  var token = newToken_();
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY, token);
  showConnect_(token);
  return token;
}

/** Creates any missing tab with its header row, so the Sheet has its shape before the first sync. */
function datalyzeSetupTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    if (ss.getSheetByName(name)) return;
    var sheet = ss.insertSheet(name);
    var h = HEADERS[name];
    sheet.getRange(1, 1, 1, h.length).setValues([h]);
    sheet.getRange(1, 1, 1, h.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function showConnect_(token) {
  var url = ScriptApp.getService().getUrl();
  var html =
    '<div style="font:14px/1.5 sans-serif">' +
    '<p><b>1.</b> Deploy &gt; New deployment &gt; Select type: <b>Web app</b>. Execute as: <b>Me</b>. Who has access: <b>Anyone</b>. Deploy, and allow access when Google asks.</p>' +
    '<p><b>2.</b> Copy the <b>Web app URL</b> (it ends in /exec)' + (url ? ':<br><input style="width:100%" readonly value="' + url + '" onclick="this.select()">' : '.') + '</p>' +
    '<p><b>3.</b> In Datalyze setup, paste the URL and this token (they become the repo secrets DATALYZE_SHEET_URL and DATALYZE_SHEET_TOKEN):<br>' +
    '<input style="width:100%" readonly value="' + token + '" onclick="this.select()"></p>' +
    '<p>Keep the token private: with the URL it lets someone write to this Sheet. Datalyze &gt; Make a new token replaces it.</p>' +
    '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(380), 'Connect this Sheet to Datalyze');
}
