/**
 * 統計與繳費狀態操作（純函式，不修改傳入物件）。
 */
(function (root) {
  'use strict';

  function isPaid(payments, id) {
    return Boolean(payments && payments[id]);
  }

  function summarize(residents, payments) {
    const result = residents.reduce(function (acc, r) {
      const paid = isPaid(payments, r.id);
      return {
        total: acc.total + 1,
        paidCount: acc.paidCount + (paid ? 1 : 0),
        expected: acc.expected + r.fee,
        received: acc.received + (paid ? r.fee : 0),
      };
    }, { total: 0, paidCount: 0, expected: 0, received: 0 });

    return Object.freeze({
      total: result.total,
      paidCount: result.paidCount,
      unpaidCount: result.total - result.paidCount,
      expected: result.expected,
      received: result.received,
      outstanding: result.expected - result.received,
      rate: result.total === 0 ? 0 : result.paidCount / result.total,
    });
  }

  function unpaidResidents(residents, payments) {
    return residents.filter(function (r) { return !isPaid(payments, r.id); });
  }

  function togglePayment(payments, id, paidAt) {
    if (isPaid(payments, id)) {
      const next = Object.assign({}, payments);
      delete next[id];
      return next;
    }
    return Object.assign({}, payments, { [id]: Object.freeze({ paidAt: paidAt }) });
  }

  function markAllPaid(residents, payments, paidAt) {
    return residents.reduce(function (acc, r) {
      return isPaid(acc, r.id) ? acc : Object.assign({}, acc, { [r.id]: Object.freeze({ paidAt: paidAt }) });
    }, Object.assign({}, payments));
  }

  const api = Object.freeze({
    isPaid: isPaid,
    summarize: summarize,
    unpaidResidents: unpaidResidents,
    togglePayment: togglePayment,
    markAllPaid: markAllPaid,
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Stats = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
