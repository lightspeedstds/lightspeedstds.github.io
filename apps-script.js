// ─────────────────────────────────────────────────────────────
// LIGHTSPEED STUDIOS — APPS SCRIPT BACKEND
//
// HOW TO DEPLOY:
//  1. Go to https://script.google.com  (sign in as studios.lightspeed20@gmail.com)
//  2. Click "New project"
//  3. Delete any existing code, paste this entire file
//  4. Click Deploy → New deployment
//  5. Type: Web app
//  6. Execute as: Me (studios.lightspeed20@gmail.com)
//  7. Who has access: Anyone
//  8. Click Deploy → copy the Web App URL
//  9. Paste that URL into index.html where it says APPS_SCRIPT_URL
// ─────────────────────────────────────────────────────────────

const SHEET_ID   = '1ZAJCpbvteCcsEKNw7G-4AvhCDVrpZK011A-bAiFNY9w';
const SHEET_NAME = 'Sheet1';

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    if      (action === 'signup') result = handleSignup(e.parameter.name, e.parameter.email);
    else if (action === 'verify') result = handleVerify(e.parameter.email, e.parameter.code);
    else                          result = { success: false, error: 'Unknown action' };
  } catch (err) {
    result = { success: false, error: err.message };
  }

  const cb  = e.parameter.callback;
  const out = cb ? cb + '(' + JSON.stringify(result) + ')' : JSON.stringify(result);
  const mime = cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(out).setMimeType(mime);
}

// ── Sign Up ───────────────────────────────────────────────────
function handleSignup(name, email) {
  if (!name || !email) return { success: false, error: 'Missing name or email.' };

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows  = sheet.getDataRange().getValues();

  // Reject duplicate emails
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === email.toLowerCase()) {
      return { success: false, error: 'already_registered' };
    }
  }

  // Generate 6-character alphanumeric code (no ambiguous chars like 0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const timestamp = new Date().toISOString();

  sheet.appendRow([name, email, code, timestamp, 'FALSE']);

  // Send access code email
  MailApp.sendEmail({
    to: email,
    subject: 'Your Lightspeed Studios Access Code',
    htmlBody: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#050a18;color:#fff;padding:40px;border-radius:16px;border:1px solid rgba(217,70,239,0.2);">
        <p style="font-family:monospace;font-size:1.1rem;font-weight:700;letter-spacing:0.14em;
                  background:linear-gradient(135deg,#22d3ee,#d946ef);
                  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                  margin:0 0 4px;">LIGHTSPEED STUDIOS</p>
        <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin:0 0 32px;letter-spacing:0.06em;">Your access code is ready</p>

        <p style="color:rgba(255,255,255,0.8);margin:0 0 20px;">Hey <strong>${name}</strong>,</p>
        <p style="color:rgba(255,255,255,0.55);margin:0 0 28px;line-height:1.7;">
          You're in. Use the code below + your email to access Live Productions on our site.
        </p>

        <div style="background:#0d1530;border:1px solid rgba(34,211,238,0.3);border-radius:12px;
                    padding:28px;text-align:center;margin-bottom:28px;">
          <p style="margin:0 0 8px;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Access Code</p>
          <span style="font-family:monospace;font-size:2.4rem;font-weight:700;
                       letter-spacing:0.35em;color:#22d3ee;">${code}</span>
        </div>

        <p style="color:rgba(255,255,255,0.3);font-size:0.78rem;line-height:1.6;">
          Keep this safe. Enter it alongside your email on the Live Productions page.
        </p>
      </div>
    `
  });

  return { success: true };
}

// ── Verify Code ───────────────────────────────────────────────
function handleVerify(email, code) {
  if (!email || !code) return { valid: false };

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const rowEmail = String(rows[i][1]).toLowerCase();
    const rowCode  = String(rows[i][2]).toUpperCase();

    if (rowEmail === email.toLowerCase() && rowCode === code.toUpperCase()) {
      sheet.getRange(i + 1, 5).setValue('TRUE'); // mark Verified
      sheet.getRange(i + 1, 3).setValue('');     // wipe code — truly one-time
      return { valid: true, name: rows[i][0] };
    }
  }

  return { valid: false };
}
