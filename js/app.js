/**
 * 畫面渲染與互動。
 */
(function () {
  'use strict';

  const { CONFIG, buildResidents, buildDemoPayments } = window.BuildingData;
  const Stats = window.Stats;
  const Store = window.PaymentStorage;

  const residents = buildResidents();
  const currency = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 });
  const $ = function (id) { return document.getElementById(id); };

  let state = Object.freeze({ month: currentMonthKey(), payments: {}, filter: 'all', query: '' });

  function currentMonthKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function todayKey() {
    const d = new Date();
    return currentMonthKey() + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** 若勾選的月份不是本月，繳費日預設為該月 1 日 */
  function defaultPaidAt(monthKey) {
    return monthKey === currentMonthKey() ? todayKey() : monthKey + '-01';
  }

  function monthLabel(monthKey) {
    const parts = monthKey.split('-');
    return parts[0] + ' 年 ' + Number(parts[1]) + ' 月';
  }

  function setState(patch) {
    state = Object.freeze(Object.assign({}, state, patch));
    if ('payments' in patch && !Store.save(state.month, state.payments)) {
      showToast('無法儲存到瀏覽器，重新整理後變更會遺失');
    }
    render();
  }

  function loadMonth(monthKey) {
    if (!Store.isValidMonth(monthKey)) {
      showToast('月份格式錯誤');
      return;
    }
    const saved = Store.load(monthKey);
    state = Object.freeze(Object.assign({}, state, {
      month: monthKey,
      payments: saved || buildDemoPayments(residents, monthKey),
    }));
    render();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function matches(resident) {
    const paid = Stats.isPaid(state.payments, resident.id);
    if (state.filter === 'paid' && !paid) return false;
    if (state.filter === 'unpaid' && paid) return false;
    const q = state.query.trim();
    return q === '' || resident.id.toLowerCase().includes(q.toLowerCase()) || resident.owner.includes(q);
  }

  function renderSummary() {
    const s = Stats.summarize(residents, state.payments);
    $('stat-paid').textContent = s.paidCount + ' / ' + s.total;
    $('stat-unpaid').textContent = s.unpaidCount + ' 戶';
    $('stat-expected').textContent = currency.format(s.expected);
    $('stat-received').textContent = currency.format(s.received);
    $('stat-outstanding').textContent = currency.format(s.outstanding);
    $('stat-rate').textContent = (s.rate * 100).toFixed(1) + '%';
    $('rate-bar').style.width = (s.rate * 100).toFixed(1) + '%';
  }

  function renderCell(resident) {
    const paid = Stats.isPaid(state.payments, resident.id);
    const btn = el('button', 'cell ' + (paid ? 'is-paid' : 'is-unpaid') + (matches(resident) ? '' : ' is-dimmed'));
    btn.type = 'button';
    btn.dataset.id = resident.id;
    btn.setAttribute('aria-pressed', String(paid));
    btn.title = (paid ? '點擊改為未繳' : '點擊標記為已繳');

    const top = el('div', 'cell-top');
    top.append(el('span', 'cell-id', resident.id), el('span', 'cell-status', paid ? '已繳' : '未繳'));
    btn.append(
      top,
      el('div', 'cell-owner', resident.owner),
      el('div', 'cell-meta', resident.ping + ' 坪 · ' + currency.format(resident.fee)),
      el('div', 'cell-date', paid ? state.payments[resident.id].paidAt.slice(5).replace('-', '/') : '—')
    );
    return btn;
  }

  function renderGrid() {
    const body = $('grid-body');
    body.replaceChildren();
    for (let floor = CONFIG.floors; floor >= 1; floor -= 1) {
      const row = el('tr');
      row.append(el('th', 'floor-label', floor + 'F'));
      residents.filter(function (r) { return r.floor === floor; }).forEach(function (r) {
        const td = el('td');
        td.append(renderCell(r));
        row.append(td);
      });
      body.append(row);
    }
  }

  function renderUnpaid() {
    const list = Stats.unpaidResidents(residents, state.payments);
    const body = $('unpaid-body');
    body.replaceChildren();
    list.forEach(function (r, i) {
      const tr = el('tr');
      tr.append(
        el('td', 'num', String(i + 1)),
        el('td', null, r.id),
        el('td', null, r.owner),
        el('td', 'num', String(r.ping)),
        el('td', 'num', currency.format(r.fee)),
        el('td', 'note-cell', '')
      );
      body.append(tr);
    });
    $('unpaid-empty').hidden = list.length > 0;
    $('unpaid-count').textContent = '共 ' + list.length + ' 戶';
  }

  function renderHeader() {
    const label = monthLabel(state.month);
    $('print-title').textContent = CONFIG.buildingName + ' ' + label + ' 管理費繳費統計表';
    $('print-date').textContent = '列印日期：' + new Date().toLocaleDateString('zh-TW');
    $('fee-rule').textContent = '收費標準：每坪 ' + CONFIG.feePerPing + ' 元';
    document.title = CONFIG.buildingName + ' 管理費統計 - ' + label;
  }

  function render() {
    renderHeader();
    renderSummary();
    renderGrid();
    renderUnpaid();
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.filter === state.filter);
    });
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2500);
  }

  function bindEvents() {
    $('month').addEventListener('change', function (e) {
      if (e.target.value) loadMonth(e.target.value);
    });

    $('grid-body').addEventListener('click', function (e) {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      setState({ payments: Stats.togglePayment(state.payments, cell.dataset.id, defaultPaidAt(state.month)) });
    });

    $('search').addEventListener('input', function (e) {
      setState({ query: e.target.value.slice(0, 20) });
    });

    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { setState({ filter: b.dataset.filter }); });
    });

    $('btn-all-paid').addEventListener('click', function () {
      if (!confirm('確定將 ' + monthLabel(state.month) + ' 全部標記為已繳？')) return;
      setState({ payments: Stats.markAllPaid(residents, state.payments, defaultPaidAt(state.month)) });
    });

    $('btn-clear').addEventListener('click', function () {
      if (!confirm('確定清空 ' + monthLabel(state.month) + ' 的所有繳費紀錄？')) return;
      setState({ payments: {} });
    });

    $('btn-demo').addEventListener('click', function () {
      if (!confirm('重新載入示範假資料？本月目前的紀錄將被覆蓋。')) return;
      setState({ payments: buildDemoPayments(residents, state.month) });
    });

    $('btn-print').addEventListener('click', function () { window.print(); });
  }

  function init() {
    $('month').value = state.month;
    bindEvents();
    loadMonth(state.month);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
