/**
 * 表格列宽自适应 —— 均分铺满页面宽度
 */
(function() {
  'use strict';

  var observer = null;

  function adjust() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var colgroup = table.querySelector('colgroup');
      if (!colgroup) return;

      var cols = colgroup.querySelectorAll('col');
      if (cols.length === 0) return;

      // 跳过勾选列，其余均分
      var normalCols = [];
      cols.forEach(function(c) {
        if (!c.classList.contains('batch-cb-col')) normalCols.push(c);
      });
      if (normalCols.length === 0) return;

      var firstW = '4%';
      var lastW = '14%';
      var midW = normalCols.length > 2
        ? ((100 - 4 - 14) / (normalCols.length - 2)).toFixed(1) + '%'
        : ((100) / normalCols.length).toFixed(1) + '%';

      normalCols.forEach(function(col, i) {
        if (i === 0) col.style.width = firstW;
        else if (i === normalCols.length - 1) col.style.width = lastW;
        else col.style.width = midW;
      });
    });
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(adjust);
    observer.observe(document.body, { childList: true, subtree: true });
    adjust();
    setInterval(adjust, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
