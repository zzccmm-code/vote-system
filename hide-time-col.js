/**
 * 隐藏"上传时间"列 — 压缩宽度而非 display:none，避免 fixed 布局错位
 */
(function() {
  'use strict';

  var HIDE_TEXTS = ['上传时间', '创建时间', '更新时间'];

  function hideTimeCol() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var hdrTr = table.querySelector('.el-table__header-wrapper thead tr');
      if (!hdrTr) return;

      var ths = Array.from(hdrTr.querySelectorAll('th'));
      ths.forEach(function(th, i) {
        var txt = (th.textContent || '').trim();
        if (HIDE_TEXTS.some(function(k) { return txt.indexOf(k) > -1; })) {
          // 设宽度为 0 而非 display:none，避免 fixed 布局列错位
          th.style.cssText = 'width:0!important;min-width:0!important;max-width:0!important;overflow:hidden;padding:0!important;border:none!important;';

          // body 对应列
          table.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row) {
            var tds = row.querySelectorAll('td');
            if (tds[i]) tds[i].style.cssText = 'width:0!important;min-width:0!important;max-width:0!important;overflow:hidden;padding:0!important;border:none!important;';
          });

          // colgroup
          table.querySelectorAll('colgroup col').forEach(function(col, j) {
            if (j === i) col.style.cssText = 'width:0!important;min-width:0!important;max-width:0!important;';
          });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(hideTimeCol, 1000); });
  } else {
    setTimeout(hideTimeCol, 1000);
  }
  setInterval(hideTimeCol, 2000);
})();
