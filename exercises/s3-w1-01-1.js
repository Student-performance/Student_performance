const spawn = require('child_process').spawn;
const assert = require('node:assert');

const py = spawn('python', ['-c', 'import sys, json; data = json.load(sys.stdin); sys.stdout.write(json.dumps({"received": len(data)}))']);
let out = '';
py.stdout.on('data', d => { out += d; });
py.on('close', code => {
  assert.strictEqual(code, 0);
  const res = JSON.parse(out);
  assert.strictEqual(res.received, 2);
  console.log('Starter child process test succeeded.');
});
py.stdin.write(JSON.stringify([1, 2]));
py.stdin.end();