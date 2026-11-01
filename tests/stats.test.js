const test = require('node:test');
const assert = require('node:assert/strict');
const Stats = require('../js/stats.js');
const { CONFIG, buildResidents, buildDemoPayments } = require('../js/data.js');

const residents = [
  { id: '1F-A', fee: 1000 },
  { id: '1F-B', fee: 2000 },
  { id: '1F-C', fee: 3000 },
];

test('summarize 計算應收、實收、未收與收繳率', () => {
  const s = Stats.summarize(residents, { '1F-A': { paidAt: '2026-11-01' }, '1F-C': { paidAt: '2026-11-03' } });
  assert.equal(s.total, 3);
  assert.equal(s.paidCount, 2);
  assert.equal(s.unpaidCount, 1);
  assert.equal(s.expected, 6000);
  assert.equal(s.received, 4000);
  assert.equal(s.outstanding, 2000);
  assert.ok(Math.abs(s.rate - 2 / 3) < 1e-9);
});

test('summarize 空資料不會除以零', () => {
  assert.equal(Stats.summarize([], {}).rate, 0);
});

test('togglePayment 不修改原物件', () => {
  const original = Object.freeze({});
  const paid = Stats.togglePayment(original, '1F-A', '2026-11-02');
  assert.deepEqual(original, {});
  assert.equal(paid['1F-A'].paidAt, '2026-11-02');
  const unpaid = Stats.togglePayment(paid, '1F-A', '2026-11-02');
  assert.equal(Stats.isPaid(unpaid, '1F-A'), false);
  assert.equal(Stats.isPaid(paid, '1F-A'), true);
});

test('unpaidResidents 只回傳未繳住戶', () => {
  const list = Stats.unpaidResidents(residents, { '1F-B': { paidAt: '2026-11-01' } });
  assert.deepEqual(list.map((r) => r.id), ['1F-A', '1F-C']);
});

test('markAllPaid 保留原繳費日並補齊其他住戶', () => {
  const result = Stats.markAllPaid(residents, { '1F-B': { paidAt: '2026-11-01' } }, '2026-11-09');
  assert.equal(result['1F-B'].paidAt, '2026-11-01');
  assert.equal(result['1F-A'].paidAt, '2026-11-09');
  assert.equal(Stats.summarize(residents, result).unpaidCount, 0);
});

test('假資料：16 樓 × 4 戶，管理費 = 坪數 × 單價', () => {
  const all = buildResidents();
  assert.equal(all.length, CONFIG.floors * CONFIG.units.length);
  all.forEach((r) => assert.equal(r.fee, Math.round(r.ping * CONFIG.feePerPing)));
  assert.ok(new Set(all.map((r) => r.fee)).size > 1, '不同坪數應有不同管理費');
});

test('示範繳費資料依月份固定產生', () => {
  const all = buildResidents();
  assert.deepEqual(buildDemoPayments(all, '2026-11'), buildDemoPayments(all, '2026-11'));
});
