/**
 * 注入"专家评审推荐"列 — 插入在操作列之前
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var retries = 0;
  var MAX = 30;

  function go() {
    if (retries >= MAX) return;
    retries++;

    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var records = (d && d.data && d.data.records) || [];
      if (!records.length) return;

      document.querySelectorAll('.el-table table').forEach(function(tbl) {
        var cg = tbl.querySelector('colgroup');

        // ---- colgroup: 在倒数第2个 col 前插入 ----
        if (cg && !cg.querySelector('.wb-exp-col')) {
          var cc = document.createElement('col');
          cc.className = 'wb-exp-col';
          cc.setAttribute('width', '110');
          cc.style.cssText = 'width:110px;min-width:110px;';
          var cols = cg.querySelectorAll('col');
          if (cols.length >= 2) {
            cg.insertBefore(cc, cols[cols.length - 1]);
          } else if (cols.length === 1) {
            cg.insertBefore(cc, cols[0]);
          }
        }

        // ---- thead ----
        tbl.querySelectorAll('thead tr').forEach(function(hr) {
          if (hr.querySelector('.wb-exp-th')) return;
          var allTh = hr.querySelectorAll('th');
          if (!allTh.length) return;

          var th = document.createElement('th');
          th.className = 'wb-exp-th';
          th.innerHTML = '<div class="cell">专家评审推荐</div>';

          // 插在最后一个 th 之前
          hr.insertBefore(th, allTh[allTh.length - 1]);
        });

        // ---- tbody ----
        tbl.querySelectorAll('tbody tr').forEach(function(row, idx) {
          if (row.querySelector('.wb-exp-td')) return;
          var allTd = row.querySelectorAll('td');
          if (!allTd.length) return;

          var rec = records[idx];
          var val = (rec && rec.expertLevel) ? rec.expertLevel : '';

          var td = document.createElement('td');
          td.className = 'wb-exp-td';
          td.innerHTML = '<div class="cell">' + (val || '—') + '</div>';

          // 插在最后一个 td 之前
          row.insertBefore(td, allTd[allTd.length - 1]);
        });
      });
    }).catch(function() {});

    if (retries < MAX) setTimeout(go, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(go, 500); });
  } else {
    setTimeout(go, 500);
  }
})();
