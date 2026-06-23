'use strict';

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const db = require('../db/database');

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Fix private key formatting for multiline in env vars
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

/**
 * Initializes the Google Sheets client
 */
async function getDoc() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SPREADSHEET_ID) {
    console.warn('[GoogleSheets] Missing credentials in environment variables. Sync skipped.');
    return null;
  }

  const serviceAccountAuth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo(); 
  return doc;
}

/**
 * Syncs the approved members list to Google Sheets
 * One-way sync from DB -> Sheets to protect our data integrity.
 */
async function syncMembersToSheet() {
  try {
    const doc = await getDoc();
    if (!doc) return;

    // Fetch members from our database (same query logic as dashboard to keep it identical)
    const membersRes = await db.query(`
        SELECT 
            u.id, 
            u.name,
            u.role,
            COALESCE(SUM(t.shares_bought), 0) AS shares,
            COALESCE(SUM(t.amount_paid), 0) AS total_deposit
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id
        WHERE u.is_approved = TRUE
        GROUP BY u.id
        ORDER BY u.id ASC
    `);
    const members = membersRes.rows;

    const sheet = doc.sheetsByIndex[0];

    // Clear existing sheet contents
    await sheet.clear();
    
    // Set headers
    await sheet.setHeaderRow(['Serial', 'Name', 'Role', 'Shares', 'Total Deposit']);

    // Prepare rows
    const rowsToAdd = members.map((m, index) => ({
      Serial: index + 1,
      Name: m.name,
      Role: m.role.toUpperCase(),
      Shares: parseInt(m.shares) || 0,
      'Total Deposit': parseFloat(m.total_deposit) || 0
    }));

    if (rowsToAdd.length > 0) {
      await sheet.addRows(rowsToAdd);
    }
    
    console.log(`[GoogleSheets] Successfully synced ${rowsToAdd.length} members to sheet.`);
  } catch (err) {
    console.error('[GoogleSheets] Sync error:', err.message);
  }
}

module.exports = {
  syncMembersToSheet
};
