const { TextDecoder } = require('node:util');
function parseRecords(text, delimiter) {
  const records = [];
  let row = [], field = '', state = 'start';
  const finishField = () => { row.push(field); field = ''; state = 'start'; };
  const finishRow = () => { finishField(); records.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 'quoted') {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else state = 'closed';
      } else field += c;
      continue;
    }
    if (c === delimiter) { finishField(); continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      finishRow(); continue;
    }
    if (state === 'closed') throw new Error('Unexpected character after closing quote');
    if (c === '"') {
      if (state !== 'start') throw new Error('Quote inside unquoted field');
      state = 'quoted';
    } else { field += c; state = 'unquoted'; }
  }
  if (state === 'quoted') throw new Error('Unterminated quoted field');
  if (row.length || field || state !== 'start') finishRow();
  return records;
}
function parseCsv(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > 1024 * 1024) throw new Error('CSV maximum size is 1 MiB');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, ''); }
  catch { throw new Error('CSV must be valid UTF-8'); }
  // Inspect the first record without counting delimiters inside quoted fields.
  let quote = false, commas = 0, semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quote && text[i + 1] === '"') i++; else quote = !quote; }
    else if (!quote) {
      if (c === '\n' || c === '\r') break;
      if (c === ',') commas++;
      if (c === ';') semicolons++;
    }
  }
  const delimiter = semicolons > commas ? ';' : ',';
  const records = parseRecords(text, delimiter);
  if (records.length < 2) throw new Error('CSV needs a header and at least one record');
  const headers = records.shift();
  const seen = new Set();
  for (const header of headers) {
    if (!header || seen.has(header.toLowerCase())) throw new Error(`Duplicate column or empty header: ${header}`);
    seen.add(header.toLowerCase());
  }
  if (records.length > 500) throw new Error('Dataset exceeds maximum limit of 500 records');
  const rows = records.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`Row ${i + 2}: column count mismatch`);
    return Object.fromEntries(headers.map((header, j) => [header, values[j]]));
  });
  return { headers, rows };
}
module.exports = { parseCsv };
