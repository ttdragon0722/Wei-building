/**
 * 以 localStorage 依月份保存繳費紀錄。瀏覽器封鎖儲存時自動退回記憶體模式。
 */
(function (root) {
  'use strict';

  const PREFIX = 'wei-building:payments:';
  const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

  function isValidMonth(monthKey) {
    return typeof monthKey === 'string' && MONTH_PATTERN.test(monthKey);
  }

  function isValidRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.keys(value).every(function (key) {
      const entry = value[key];
      return entry && typeof entry.paidAt === 'string';
    });
  }

  function load(monthKey) {
    if (!isValidMonth(monthKey)) return null;
    try {
      const raw = root.localStorage.getItem(PREFIX + monthKey);
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      if (!isValidRecord(parsed)) {
        console.warn('[storage] 資料格式錯誤，已忽略：', monthKey);
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('[storage] 讀取失敗：', err);
      return null;
    }
  }

  function save(monthKey, record) {
    if (!isValidMonth(monthKey)) return false;
    try {
      root.localStorage.setItem(PREFIX + monthKey, JSON.stringify(record));
      return true;
    } catch (err) {
      console.warn('[storage] 儲存失敗：', err);
      return false;
    }
  }

  function remove(monthKey) {
    try {
      root.localStorage.removeItem(PREFIX + monthKey);
    } catch (err) {
      console.warn('[storage] 刪除失敗：', err);
    }
  }

  root.PaymentStorage = Object.freeze({ isValidMonth: isValidMonth, load: load, save: save, remove: remove });
})(window);
