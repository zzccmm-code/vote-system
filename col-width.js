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

      // 第一列通常是序号，宽度小一些；最后一列是操作，稍大
      // 其余列均分剩余宽度
      var firstW = cols.length > 1 ? '4%' : '';
      var lastW = cols.length > 1 ? '14%' : '';
      var restCount = cols.length - 2;
      if (restCount <= 0) restCount = cols.length;
      var midW = restCount > 0 ? ((100 - 4 - 14) / restCount).toFixed(1) + '%' : '';

      cols.forEach(function(col, i) {
        if (i === 0 && firstW) {
          col.style.width = firstW;
        } else if (i === cols.length - 1 && lastW) {
          col.style.width = lastW;
        } else {
          col.style.width = midW;
        }
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
