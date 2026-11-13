const { executePrediction } = require('./predictionAdapter');
async function runPrediction(rows) { const output = await executePrediction(rows); return output.results; }
module.exports = { executePrediction: runPrediction, runPrediction };
