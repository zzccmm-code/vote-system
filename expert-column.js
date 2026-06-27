/**
 * 专家评审推荐列 — 改名 + 填数据
 * 用 MutationObserver 即时响应 Vue 重渲染
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var fetching = false;

  function loadData(cb) {
    if (fetching) { if (cb) cb(); return; }
    fetching = true;
    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      cachedRecords = (d && d.data && d.data.records) || [];
      fetching = false;
      if (cb) cb();
    }).catch(function() { fetching = false; if (cb) cb(); });
  }

  function go() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var hdrTr = table.querySelector('.el-table__header-wrapper thead tr');
      if (!hdrTr) return;

      var ths = Array.from(hdrTr.querySelectorAll('th'));
      var expertIdx = -1;

      // 改表头名
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

      // 填数据
      var rows = table.querySelectorAll('.el-table__body-wrapper tbody tr');
      if (!rows.length) return;

      if (cachedRecords.length > 0) {
        fillNow(rows, expertIdx);
      }
    });
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

  // 启动：先加载数据，再持续运行
  loadData(function() {
    go();
    // MutationObserver 即时响应
    var obs = new MutationObserver(function() { go(); });
    obs.observe(document.body, { childList: true, subtree: true });
    // 定时器兜底
    setInterval(go, 800);
  });
})();
