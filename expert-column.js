/**
 * 成果管理表增强 — 持续运行，抵制 Vue 重渲染
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var fetching = false;

  function loadData(cb) {
    if (fetching) return;
    fetching = true;
    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      cachedRecords = (d && d.data && d.data.records) || [];
      fetching = false;
      if (cb) cb();
    }).catch(function() { fetching = false; });
  }

  function go() {
    var hdrTr = document.querySelector('.el-table__header-wrapper thead tr');
    if (!hdrTr) return;

    var hdrThs = Array.from(hdrTr.querySelectorAll('th'));
    var expertIdx = -1;

    // 改表头
    hdrThs.forEach(function(th, i) {
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

    // 填数据
    var rows = document.querySelectorAll('.el-table__body-wrapper tbody tr');
    if (!rows.length) return;

    if (cachedRecords.length > 0) {
      fillNow(rows, expertIdx);
    } else {
      loadData(function() { fillNow(rows, expertIdx); });
    }
  }

  function fillNow(rows, expertIdx) {
    rows.forEach(function(row, i) {
      var tds = row.querySelectorAll('td');
      if (expertIdx >= tds.length) return;
      var rec = cachedRecords[i];
      if (!rec) return;
      var cell = tds[expertIdx].querySelector('.cell');
      if (cell) cell.textContent = rec.expertLevel || '';
    });
  }

  // 先加载一次数据，然后持续运行
  loadData(function() { go(); });
  setInterval(go, 1000);
})();
