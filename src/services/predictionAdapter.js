const { spawn } = require('node:child_process');
const path = require('node:path');
let activeJob = false;
function executePrediction(rows, options = {}) {
    if (activeJob) return Promise.reject(new Error('A prediction run is already in progress'));
    activeJob = true;
    return new Promise((resolve, reject) => {
        let child, timer, escalation, settled = false, terminating = false;
        const settle = (error, value) => {
            if (settled) return;
            settled = true;
            error ? reject(error) : resolve(value);
        };
        const cleanup = () => { clearTimeout(timer); clearTimeout(escalation); activeJob = false; };
        const terminate = error => {
            settle(error);
            if (terminating) return;
            terminating = true;
            child.kill('SIGTERM');
            escalation = setTimeout(() => child.kill('SIGKILL'), 500);
        };
        const requested = Number(options.timeout);
        const timeout = Number.isFinite(requested) ? Math.min(15000, Math.max(1, requested)) : 15000;
        try {
            child = spawn(process.env.PYTHON_PATH || 'python', [
                path.resolve(__dirname, '../ml/predict.py'), '--model',
                options.modelPath || path.resolve(__dirname, '../ml/models/student_risk_v1.pkl'), '--threshold', '0.5'
            ], { shell: false });
        } catch (error) { cleanup(); settle(error); return; }
        const chunks = [];
        let bytes = 0, stderr = '';
        timer = setTimeout(() => terminate(new Error('Prediction timed out (maximum 15s)')), timeout);
        child.stdout.on('data', chunk => {
            if (terminating) return;
            const data = Buffer.from(chunk);
            bytes += data.length;
            if (bytes > 5 * 1024 * 1024) return terminate(new Error('Prediction exceeded 5 MiB stdout cap'));
            chunks.push(data);
        });
        child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString('utf8')).slice(0, 65536); });
        child.on('error', error => {
            // Failed spawn has no running process; other errors require confirmed close.
            if (!child.pid) cleanup();
            settle(error);
        });
        child.stdin.on('error', error => terminate(error));
        child.on('close', code => {
            cleanup();
            if (settled) return;
            if (code !== 0) return settle(new Error(`Python exit ${code}: ${stderr}`));
            try { settle(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch { settle(new Error('Invalid JSON stdout')); }
        });
        try { child.stdin.end(JSON.stringify({ schema_version: 'schema-v1', rows })); }
        catch (error) { terminate(error); }
    });
}
module.exports = { executePrediction };