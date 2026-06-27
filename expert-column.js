/**
 * 精简成果管理表 — 只显示指定列，注入专家评审推荐，保持checkbox和操作列
 * 使用 CSS 隐藏多余列，避免 DOM 重排与 Vue 冲突
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';
  var tid = null;
  var expertColIdx = -1; // 专家评审推荐列在所有列中的索引（注入后）
  var cachedRecords = [];

  function go() {
    // 1) 加载数据
    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      cachedRecords = (d && d.data && d.data.records) || [];
    }).catch(function() {});

    // 2) 分析表头，确定要隐藏的列
    var headerRows = document.querySelectorAll('.el-table__header-wrapper thead tr');
    headerRows.forEach(function(hr) {
      var ths = hr.querySelectorAll('th');
      ths.forEach(function(th, i) {
        var txt = (th.textContent || '').trim().replace(/\s+/g, '');
        // 要保留的列（不隐藏）
        var keep = false;
        if (th.classList.contains('wb-cb-th') || th.classList.contains('batch-cb-header')) keep = true;
        if (txt.indexOf('序号') > -1) keep = true;
        if (txt.indexOf('成果类别') > -1) keep = true;
        if (txt.indexOf('成果名称') > -1) keep = true;
        if (txt.indexOf('申报单位') > -1 || txt.indexOf('创建单位') > -1 || txt.indexOf('推荐单位') > -1) keep = true;
        if (txt.indexOf('专家') > -1) keep = true;
        if (txt.indexOf('操作') > -1 || txt === '') keep = true; // 操作列可能文本为空
        // 如果表头有按钮/链接，也是操作列
        if (th.querySelector('button, .el-button, a')) keep = true;

        if (!keep) {
          th.style.display = 'none';
        } else {
          th.style.display = '';
          // 将"申报单位"改名
          if (txt.indexOf('申报单位') > -1 || txt.indexOf('创建单位') > -1) {
            var cell = th.querySelector('.cell');
            if (cell) cell.textContent = '推荐单位(部门)';
          }
          if (txt.indexOf('专家推荐等级') > -1) {
            var c2 = th.querySelector('.cell');
            if (c2) c2.textContent = '专家评审推荐';
          }
        }
      });
    });

    // 3) 隐藏 body 中对应列
    // 找到 header 中 th 的显示/隐藏状态，映射到 body
    var hdrTr = document.querySelector('.el-table__header-wrapper thead tr');
    if (hdrTr) {
      var hdrThs = Array.from(hdrTr.querySelectorAll('th'));
      var visibleMap = hdrThs.map(function(th) {
        return th.style.display !== 'none';
      });

      document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row) {
        // 跳过空行
        var tds = row.querySelectorAll('td');
        tds.forEach(function(td, j) {
          if (visibleMap[j] === false) {
            td.style.display = 'none';
          } else {
            td.style.display = '';
          }
        });

        // 如果缓存有数据，填入专家评审推荐
        var rowIdx = Array.from(row.parentElement.querySelectorAll('tr')).indexOf(row);
        var rec = cachedRecords[rowIdx];
        if (rec && rec.expertLevel !== undefined) {
          // 找专家推荐等级列对应的 td
          // 在 header 中找专家列的索引
          if (expertColIdx < 0) {
            hdrThs.forEach(function(th, k) {
              var t = (th.textContent || '').replace(/\s+/g, '');
              if (t.indexOf('专家') > -1) expertColIdx = k;
            });
          }
          if (expertColIdx >= 0 && tds[expertColIdx]) {
            var cell = tds[expertColIdx].querySelector('.cell');
            if (cell) cell.textContent = rec.expertLevel || '—';
          }
        }
      });
    }

    // 4) 隐藏 colgroup 中不必要的 col
    if (hdrTr) {
      var hdrThs2 = Array.from(hdrTr.querySelectorAll('th'));
      var vis2 = hdrThs2.map(function(th) { return th.style.display !== 'none'; });

      document.querySelectorAll('.el-table colgroup').forEach(function(cg) {
        var cols = cg.querySelectorAll('col');
        cols.forEach(function(col, m) {
          if (vis2[m] === false) {
            col.style.display = 'none';
          } else {
            col.style.display = '';
          }
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(go, 600); });
  } else {
    setTimeout(go, 600);
  }

  tid = setInterval(go, 2000);
  setTimeout(function() { clearInterval(tid); go(); }, 60000);
})();
