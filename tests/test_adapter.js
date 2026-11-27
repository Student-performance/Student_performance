const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const path = require('node:path');
function harness() {
    const children = [], timers = [];
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services/predictionAdapter.js'), 'utf8'), {
        module, process, Buffer, __dirname: path.join(__dirname, '../src/services'),
        require: name => name === 'node:child_process' ? {
            spawn: () => {
                const child = new EventEmitter(); child.pid = 1; child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.stdin = new EventEmitter();
                child.stdin.end = () => { }; child.signals = []; child.kill = signal => child.signals.push(signal); children.push(child); return child;
            }
        } : require(name),
        setTimeout: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }, clearTimeout: timer => { if (timer) timer.cancelled = true; }
    });
    return { execute: module.exports.executePrediction, children, timers };
}
test('stdin failure retains lock until close, escalates and recovers', async () => {
    const h = harness();
    const first = h.execute([], { timeout: 99999 });
    assert.equal(h.timers[0].ms, 15000);
    h.children[0].stdin.emit('error', new Error('EPIPE'));
    await assert.rejects(first, /EPIPE/);
    await assert.rejects(h.execute([]), /already/);
    h.timers.find(timer => timer.ms === 500).fn();
    assert.deepEqual(h.children[0].signals, ['SIGTERM', 'SIGKILL']);
    h.children[0].emit('close', 1);
    const second = h.execute([]);
    h.children[1].stdout.emit('data', Buffer.from('{"ok":true}')); h.children[1].emit('close', 0);
    assert.equal((await second).ok, true);
});
test('deadline, malformed output and byte cap reject safely', async () => {
    for (const kind of ['deadline', 'invalid', 'overflow']) {
        const h = harness(); const promise = h.execute([]);
        if (kind === 'deadline') h.timers[0].fn();
        else if (kind === 'overflow') h.children[0].stdout.emit('data', Buffer.alloc(5 * 1024 * 1024 + 1));
        else { h.children[0].stdout.emit('data', Buffer.from('invalid')); h.children[0].emit('close', 0); }
        await assert.rejects(promise);
        h.children[0].emit('close', 1);
    }
});
