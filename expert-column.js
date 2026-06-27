/**
 * 注入"专家评审推荐"列 — 插入到成果管理表中
 */
(function() {
  'use strict';

  var COL_W = 110; // 列宽
  var done = false;

  function inject() {
    // 找到所有 .el-table 内的 table
    var tables = document.querySelectorAll('.el-table table');
    var injected = false;

    tables.forEach(function(tbl) {
      // ---- 1) colgroup 插 col ----
      var cg = tbl.querySelector('colgroup');
      if (cg && !cg.querySelector('.wb-exp-col')) {
        var cc = document.createElement('col');
        cc.className = 'wb-exp-col';
        cc.setAttribute('width', '' + COL_W);
        cc.style.cssText = 'width:' + COL_W + 'px;min-width:' + COL_W + 'px;';
        // 插在倒数第2个位置（操作列前）
        var cols = cg.querySelectorAll('col');
        if (cols.length >= 2) {
          cg.insertBefore(cc, cols[cols.length - 1]); // 操作列前
        } else {
          cg.appendChild(cc);
        }
        injected = true;
      }

      // ---- 2) thead 插表头 th ----
      var thead = tbl.querySelector('thead');
      if (thead) {
        thead.querySelectorAll('tr').forEach(function(hr) {
          if (hr.querySelector('.wb-exp-th')) return;
          var th = document.createElement('th');
          th.className = 'wb-exp-th';
          th.style.cssText = 'width:'+COL_W+'px;text-align:center;padding:0 4px;';
          th.innerHTML = '<div class="cell" style="text-align:center;">专家评审推荐</div>';
          // 插在倒数第1个 th 之前（操作列前）
          var ths = hr.querySelectorAll('th');
          if (ths.length >= 1) {
            hr.insertBefore(th, ths[ths.length - 1]);
          } else {
            hr.appendChild(th);
          }
          injected = true;
        });
      }

      // ---- 3) tbody 每行插 td ----
      tbl.querySelectorAll('tbody').forEach(function(tb) {
        tb.querySelectorAll('tr').forEach(function(row) {
          if (row.querySelector('.wb-exp-td')) return;
          var tds = row.querySelectorAll('td');
          if (!tds.length) return;
          var td = document.createElement('td');
          td.className = 'wb-exp-td';
          td.style.cssText = 'width:'+COL_W+'px;text-align:center;padding:0 4px;';
          td.innerHTML = '<div class="cell" style="text-align:center;">—</div>';
          // 插在倒数第1个 td 之前
          row.insertBefore(td, tds[tds.length - 1]);
          injected = true;
        });
      });
    });

    if (injected) {
      // 数据到达后回填
      setTimeout(fillData, 300);
      // 不再频繁扫描
      if (!done) { done = true; }
    }
  }

  function fillData() {
    // 从 API 缓存中获取 expertLevel 数据
    var rows = document.querySelectorAll('.el-table__body-wrapper tbody tr');
    if (!rows.length) return;

    // 尝试从 pdf-inject 或 batch-delete 的全局缓存读数据
    // 如果没有，自己调一次
    fetch((window._$base_url || 'http://localhost:7003') + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var records = (d && d.data && d.data.records) || [];
      rows.forEach(function(row, i) {
        var td = row.querySelector('.wb-exp-td');
        if (!td) return;
        var rec = records[i];
        var val = (rec && rec.expertLevel) ? rec.expertLevel : '';
        var cell = td.querySelector('.cell');
        if (cell) {
          cell.textContent = val || '—';
        }
      });
    }).catch(function() {});
  }

  var tid = setInterval(function() {
    if (done) { clearInterval(tid); return; }
    inject();
  }, 1000);

  setTimeout(function() { clearInterval(tid); inject(); fillData(); }, 20000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
