/**
 * 隐藏"上传时间"列 — 直接操作 th/td/col，不用 nth-child
 */
(function() {
  'use strict';

  var HIDE_TEXTS = ['上传时间', '创建时间', '更新时间'];

  function hideTimeCol() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var hdrTr = table.querySelector('.el-table__header-wrapper thead tr');
      if (!hdrTr) return;

      var ths = Array.from(hdrTr.querySelectorAll('th'));
      var hideIdx = -1;
      ths.forEach(function(th, i) {
        var txt = (th.textContent || '').trim();
        if (HIDE_TEXTS.some(function(k) { return txt.indexOf(k) > -1; })) {
          hideIdx = i;
        }
      });
      if (hideIdx < 0) return;

      // 隐藏 header
      if (ths[hideIdx]) ths[hideIdx].style.display = 'none';

      // 隐藏 body
      table.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row) {
        var tds = row.querySelectorAll('td');
        if (tds[hideIdx]) tds[hideIdx].style.display = 'none';
      });

      // 隐藏 colgroup
      table.querySelectorAll('colgroup col').forEach(function(col, i) {
        if (i === hideIdx) col.style.display = 'none';
      });
    });
  }

  // MutationObserver + 定时器双保险
  var obs = new MutationObserver(function() { hideTimeCol(); });
  obs.observe(document.body, { childList: true, subtree: true });
  setInterval(hideTimeCol, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideTimeCol);
  } else {
    hideTimeCol();
  }
})();
