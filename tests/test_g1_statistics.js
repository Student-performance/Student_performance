const assert = require('assert');
const { calculateG1Stats } = require('../src/services/dataset');
const rows = [{ g1: 10 }, { g1: 15 }, { g1: 5 }, { g1: 20 }, { g1: 0 }];
const stats = calculateG1Stats(rows);
assert.strictEqual(stats.count, 5);
assert.strictEqual(stats.min, 0);
assert.strictEqual(stats.max, 20);
assert.strictEqual(stats.mean, 10);
console.log('✓ G1 summary statistics calculations verified');