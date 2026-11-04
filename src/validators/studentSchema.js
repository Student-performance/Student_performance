const ALLOWED_VALUES = {
  school: ['GP', 'MS'], sex: ['F', 'M'], address: ['U', 'R'], famsize: ['LE3', 'GT3'],
  Pstatus: ['T', 'A'], Mjob: ['teacher', 'health', 'services', 'at_home', 'other'],
  Fjob: ['teacher', 'health', 'services', 'at_home', 'other'], reason: ['home', 'reputation', 'course', 'other'],
  guardian: ['mother', 'father', 'other'], schoolsup: ['yes', 'no'], famsup: ['yes', 'no'],
  paid: ['yes', 'no'], activities: ['yes', 'no'], nursery: ['yes', 'no'], higher: ['yes', 'no'],
  internet: ['yes', 'no'], romantic: ['yes', 'no']
};
const NUMERIC_RANGES = {
  age: [15, 22], Medu: [0, 4], Fedu: [0, 4], traveltime: [1, 4], studytime: [1, 4],
  failures: [0, 4], famrel: [1, 5], freetime: [1, 5], goout: [1, 5], Dalc: [1, 5],
  Walc: [1, 5], health: [1, 5], absences: [0, 93], G1: [0, 20]
};

function validateStudentRows(rows) {
  const errors = [];
  const validRows = [];
  const identifiers = new Set();
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) return { isValid: false, errors: ["Expected 1–500 rows"], validRows: [] };
  for (let idx = 0; idx < rows.length; idx++) {
    if (errors.length >= 50) break;
    const row = rows[idx];
    const rowNum = idx + 2;
    const parsedFeatures = {};
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      errors.push('Row '+rowNum+': expected an object'); continue;
    }
    const supplied = row.row_identifier !== undefined ? row.row_identifier : row.student_row_id;
    const label = supplied === undefined ? 'ROW-'+String(idx+1).padStart(3,'0') : String(supplied).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(label) && errors.length < 50) errors.push('Row '+rowNum+': invalid synthetic row_identifier');

    if (label && identifiers.has(label) && errors.length < 50) errors.push(`Row ${rowNum}: duplicate row identifier`);
    identifiers.add(label);
    for (const key of Object.keys(row)) {
      if (!(Object.hasOwn(ALLOWED_VALUES, key)) && !(Object.hasOwn(NUMERIC_RANGES, key)) && !["G2","G3","row_identifier","student_row_id"].includes(key) && errors.length < 50) errors.push(`Row ${rowNum}: unsupported column ${key}`);
    }
    // Validate categoricals with canonical casing
    for (const [key, allowed] of Object.entries(ALLOWED_VALUES)) {
      const raw = row[key] !== undefined ? row[key] : row[key.toLowerCase()];
      const val = raw !== undefined ? String(raw).trim() : '';
      if (!val || !allowed.includes(val)) {
        if (errors.length < 50) errors.push(`Row ${rowNum}: invalid ${key} '${val}'`);
      } else {
        parsedFeatures[key] = val;
      }
    }
    // Validate numerics with canonical casing (reject empty/whitespace)
    for (const [key, [min, max]] of Object.entries(NUMERIC_RANGES)) {
      const raw = row[key] !== undefined ? row[key] : row[key.toLowerCase()];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        if (errors.length < 50) errors.push(`Row ${rowNum}: ${key} must be an integer between ${min} and ${max}`);
        continue;
      }
      const val = Number(String(raw).trim());
      if (isNaN(val) || val < min || val > max || !Number.isInteger(val)) {
        if (errors.length < 50) errors.push(`Row ${rowNum}: ${key} must be an integer between ${min} and ${max}`);
      } else {
        parsedFeatures[key] = val;
      }
    }
    // Carry forward row_identifier if supplied
    parsedFeatures.row_identifier = label;
    // Note: raw G2 and G3 are intentionally omitted from parsedFeatures to prevent future data leakage
    if (errors.length === 0) validRows.push(parsedFeatures);
  }
  return { isValid: errors.length === 0, errors, validRows };
}
module.exports = { validateStudentRows };
