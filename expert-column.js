/**
 * 注入"专家评审推荐"列 — 位于"推荐单位(部门)"和"操作"之间
 */
(function() {
  'use strict';

  var retries = 0;
  var MAX = 30;

  function getApiBase() { return window._$base_url || 'http://localhost:7003'; }

  function injectAndFill() {
    if (retries >= MAX) return;
    retries++;

    var recordsReady = false;

    // 先调 API 拿数据
    fetch(getApiBase() + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var records = (d && d.data && d.data.records) || [];
      if (!records.length) return;
      recordsReady = true;

      // 找到所有 table（header 表 + body 表）
      var tables = document.querySelectorAll('.el-table table');

      tables.forEach(function(tbl) {
        var cg = tbl.querySelector('colgroup');
        var isHeader = !!tbl.querySelector('thead');
        var isBody = !!tbl.querySelector('tbody');

        // ---- colgroup: 在倒数第2个 col 前插入 ----
        if (cg && !cg.querySelector('.wb-exp-col')) {
          var cc = document.createElement('col');
          cc.className = 'wb-exp-col';
          cc.setAttribute('width', '110');
          cc.style.cssText = 'width:110px;min-width:110px;';
          var cols = cg.querySelectorAll('col');
          if (cols.length >= 2) {
            cg.insertBefore(cc, cols[cols.length - 1]);
          } else {
            cg.appendChild(cc);
          }
        }

        // ---- thead: 表头行插入 ----
        if (isHeader) {
          tbl.querySelectorAll('thead tr').forEach(function(hr) {
            if (hr.querySelector('.wb-exp-th')) return;
            var th = document.createElement('th');
            th.className = 'wb-exp-th';
            th.style.cssText = 'width:110px;text-align:center;padding:0 4px;white-space:nowrap;';
            th.innerHTML = '<div class="cell" style="text-align:center;font-weight:600;">专家评审推荐</div>';
            var ths = hr.querySelectorAll('th');
            if (ths.length >= 2) {
              hr.insertBefore(th, ths[ths.length - 1]);
            } else if (ths.length === 1) {
              hr.appendChild(th);
            } else {
              hr.appendChild(th);
            }
          });
        }

        // ---- tbody: 数据行插入 ----
        if (isBody) {
          tbl.querySelectorAll('tbody tr').forEach(function(row, i) {
            if (row.querySelector('.wb-exp-td')) return;
            var tds = row.querySelectorAll('td');
            if (!tds.length) return;

            var rec = records[i];
            var val = (rec && rec.expertLevel) ? rec.expertLevel : '';

            var td = document.createElement('td');
            td.className = 'wb-exp-td';
            td.style.cssText = 'width:110px;text-align:center;padding:0 4px;white-space:nowrap;';
            td.innerHTML = '<div class="cell" style="text-align:center;">' + (val || '—') + '</div>';

            if (tds.length >= 2) {
              row.insertBefore(td, tds[tds.length - 1]);
            } else {
              row.appendChild(td);
            }
          });
        }
      });
    }).catch(function() {});

    if (retries < MAX) {
      setTimeout(injectAndFill, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(injectAndFill, 500); });
  } else {
    setTimeout(injectAndFill, 500);
  }
})();
