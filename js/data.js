/**
 * 假資料產生器：16 樓 × 每層 4 戶（A~D），依坪數計算管理費。
 * 使用固定種子亂數，確保每次開啟資料一致。
 */
(function (root) {
  'use strict';

  const CONFIG = Object.freeze({
    buildingName: '偉大樓',
    floors: 16,
    units: Object.freeze(['A', 'B', 'C', 'D']),
    feePerPing: 60, // 每坪管理費（元）
    baseSizes: Object.freeze({ A: 32.5, B: 25.8, C: 25.8, D: 41.2 }),
    penthouseFrom: 15, // 15 樓以上為大坪數
    penthouseRatio: 1.3,
    demoPaidRatio: 0.72,
  });

  const SURNAMES = ['陳', '林', '黃', '張', '李', '王', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾'];
  const GIVEN = ['志明', '淑芬', '建宏', '美玲', '家豪', '雅婷', '俊傑', '怡君', '冠廷', '佩珊', '宗翰', '詩涵', '承恩', '惠如', '柏宇', '欣怡'];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function unitSize(floor, unit) {
    const base = CONFIG.baseSizes[unit];
    const size = floor >= CONFIG.penthouseFrom ? base * CONFIG.penthouseRatio : base;
    return Math.round(size * 10) / 10;
  }

  function buildResidents() {
    const rand = mulberry32(20261102);
    const list = [];
    for (let floor = 1; floor <= CONFIG.floors; floor += 1) {
      CONFIG.units.forEach(function (unit) {
        const ping = unitSize(floor, unit);
        const owner = SURNAMES[Math.floor(rand() * SURNAMES.length)] + GIVEN[Math.floor(rand() * GIVEN.length)];
        list.push(Object.freeze({
          id: floor + 'F-' + unit,
          floor: floor,
          unit: unit,
          owner: owner,
          ping: ping,
          fee: Math.round(ping * CONFIG.feePerPing),
        }));
      });
    }
    return Object.freeze(list);
  }

  /** 依月份產生示範繳費紀錄：{ [residentId]: { paidAt: 'YYYY-MM-DD' } } */
  function buildDemoPayments(residents, monthKey) {
    const rand = mulberry32(hashString(monthKey));
    return residents.reduce(function (acc, r) {
      if (rand() >= CONFIG.demoPaidRatio) return acc;
      const day = String(1 + Math.floor(rand() * 10)).padStart(2, '0');
      return Object.assign({}, acc, { [r.id]: Object.freeze({ paidAt: monthKey + '-' + day }) });
    }, {});
  }

  const api = Object.freeze({ CONFIG: CONFIG, buildResidents: buildResidents, buildDemoPayments: buildDemoPayments });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.BuildingData = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
