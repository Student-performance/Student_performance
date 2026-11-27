function validatePredictionOutput(output, inputRows, modelVersion = 'student_risk_v1') {
    if (!output || output.success !== true || output.schema_version !== 'schema-v1') throw new Error('Invalid prediction schema');
    if (output.model_version !== modelVersion) throw new Error('Unexpected model version');
    if (!Number.isFinite(output.threshold) || output.threshold !== 0.5) throw new Error('Invalid frozen threshold');
    if (!Array.isArray(output.results) || output.results.length !== inputRows.length || output.count !== inputRows.length) throw new Error('Result count mismatch');
    const expected = new Map(inputRows.map(row => [row.row_id || row.row_identifier || row.student_row_id, row]));
    const seen = new Set();
    for (const result of output.results) {
        if (!expected.has(result.row_id) || seen.has(result.row_id)) throw new Error('Unknown or duplicate row ID');
        seen.add(result.row_id);
        const input = expected.get(result.row_id);
        const id = input.student_row_id || result.row_id;
        const label = input.row_identifier || result.row_id;
        if (result.student_row_id !== id || result.row_identifier !== label) throw new Error('Identifier mismatch');
        if (!Number.isFinite(result.risk_score) || result.risk_score < 0 || result.risk_score > 1) throw new Error('Invalid risk score');
        const expectedFlag = result.risk_score >= output.threshold;
        const flagMatches = typeof result.risk_flag === 'boolean'
            ? result.risk_flag === expectedFlag
            : (result.risk_flag === 0 || result.risk_flag === 1) && result.risk_flag === Number(expectedFlag);
        if (!flagMatches) throw new Error('Risk flag mismatch');
    }
    return true;
}
module.exports = { validatePredictionOutput };
