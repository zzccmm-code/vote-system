/**
 * 专家评审推荐列 — 改名 + 填数据，仅用定时器
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var fetched = false;

  function loadData() {
    if (fetched) return;
    fetched = true;
    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      cachedRecords = (d && d.data && d.data.records) || [];
    }).catch(function() { fetched = false; });
  }

  function go() {
    var hdrTr = document.querySelector('.el-table__header-wrapper thead tr');
    if (!hdrTr) return;

    var ths = Array.from(hdrTr.querySelectorAll('th'));
    var expertIdx = -1;

    ths.forEach(function(th, i) {
      var cell = th.querySelector('.cell');
      if (!cell) return;
      var txt = cell.textContent.trim();
      if (txt === '专家组推荐等级' || txt === '专家推荐等级' || txt === '专家评审推荐') {
        cell.textContent = '专家评审推荐';
        expertIdx = i;
      }
      if (txt === '申报单位' || txt === '创建单位') {
        cell.textContent = '推荐单位(部门)';
      }
    });

    if (expertIdx < 0) return;

    var rows = document.querySelectorAll('.el-table__body-wrapper tbody tr');
    if (!rows.length || !cachedRecords.length) return;

    rows.forEach(function(row, i) {
      var tds = row.querySelectorAll('td');
      if (expertIdx >= tds.length) return;
      var rec = cachedRecords[i];
      if (!rec) return;
      var cell = tds[expertIdx].querySelector('.cell');
      if (cell) cell.textContent = rec.expertLevel || '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { loadData(); go(); }, 1000); });
  } else {
    setTimeout(function() { loadData(); go(); }, 1000);
  }
  setInterval(function() { go(); }, 2000);
  setInterval(function() { loadData(); }, 10000);
})();
