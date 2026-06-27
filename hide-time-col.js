/**
 * 隐藏"上传时间"列（匹配表头文字：上传时间/创建时间/更新时间）
 */
(function() {
  'use strict';

  var HIDE_TEXT = ['上传时间', '创建时间', '更新时间'];
  var observer = null;

  function hideTimeColumn() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var headerRow = table.querySelector('.el-table__header-wrapper thead tr, thead tr');
      if (!headerRow) return;

      var ths = headerRow.querySelectorAll('th');
      ths.forEach(function(th, idx) {
        var txt = th.textContent.trim();
        if (HIDE_TEXT.some(function(k) { return txt.indexOf(k) !== -1; })) {
          var styleId = 'htc-' + idx;
          if (document.getElementById(styleId)) return;
          var style = document.createElement('style');
          style.id = styleId;
          style.textContent =
            '.el-table td:nth-child(' + (idx + 1) + '), ' +
            '.el-table th:nth-child(' + (idx + 1) + ') { display:none !important; }';
          document.head.appendChild(style);
        }
      });
    });
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(hideTimeColumn);
    observer.observe(document.body, { childList: true, subtree: true });
    hideTimeColumn();
    setInterval(hideTimeColumn, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
