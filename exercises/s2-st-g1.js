const assert = require('node:assert/strict');
const grades = [10, 15, 5, 20, 0];
const expected = {
  count: grades.length,
  mean: grades.reduce((a, b) => a + b, 0) / grades.length,
  min: Math.min(...grades),
  max: Math.max(...grades)
};
assert.deepEqual(expected, { count: 5, mean: 10, min: 0, max: 20 });
console.log('Synthetic G1 expected statistics:', expected);