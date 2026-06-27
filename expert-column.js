/**
 * 成果管理表增强 — 改名+填数据，不隐藏任何列
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var tid = null;
  var expertColIdx = -1;

  function go() {
    var hdrTr = document.querySelector('.el-table__header-wrapper thead tr');
    if (!hdrTr) return;

    var hdrThs = Array.from(hdrTr.querySelectorAll('th'));

    // ---- 1) 改表头名 ----
    hdrThs.forEach(function(th, i) {
      var cell = th.querySelector('.cell');
      if (!cell) return;
      var txt = cell.textContent.trim();

      if (txt === '专家组推荐等级' || txt === '专家推荐等级' || txt === '专家评审推荐') {
        cell.textContent = '专家评审推荐';
        expertColIdx = i;
      }
      if (txt === '申报单位' || txt === '创建单位') {
        cell.textContent = '推荐单位(部门)';
      }
    });

    // ---- 2) 填数据 ----
    if (cachedRecords.length === 0) {
      fetch(API + '/achievement/page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageNum: 1, pageSize: 200 })
      }).then(function(r) { return r.json(); }).then(function(d) {
        cachedRecords = (d && d.data && d.data.records) || [];
        fillCells();
      }).catch(function() {});
    } else {
      fillCells();
    }
  }

  function fillCells() {
    if (expertColIdx < 0) return;
    if (!cachedRecords.length) return;

    document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row, i) {
      var tds = row.querySelectorAll('td');
      if (expertColIdx >= tds.length) return;

      var rec = cachedRecords[i];
      if (!rec) return;

      var cell = tds[expertColIdx].querySelector('.cell');
      if (cell) {
        cell.textContent = rec.expertLevel || '';
      }
    });
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(go, 600); });
  } else {
    setTimeout(go, 600);
  }

  tid = setInterval(go, 2000);
  setTimeout(function() { clearInterval(tid); }, 30000);
})();
