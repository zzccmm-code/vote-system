/**
 * 隐藏"上传时间"列 — 使用 <style> 标签，不被其他脚本 inline style 覆盖
 */
(function() {
  'use strict';

  var HIDE_TEXTS = ['上传时间', '创建时间', '更新时间'];
  var done = false;

  function hideTimeCol() {
    document.querySelectorAll('.el-table').forEach(function(table) {
      var hdrTr = table.querySelector('.el-table__header-wrapper thead tr');
      if (!hdrTr) return;

      var ths = hdrTr.querySelectorAll('th');
      ths.forEach(function(th, i) {
        var txt = (th.textContent || '').trim();
        if (HIDE_TEXTS.some(function(k) { return txt.indexOf(k) > -1; })) {
          // 打标记
          th.setAttribute('data-hide-col', '1');
        }
      });
    });

    // 注入全局 CSS（只需一次）
    if (done) return;
    done = true;
    var style = document.createElement('style');
    style.id = 'hide-time-col-css';
    style.textContent =
      '[data-hide-col="1"] { display: none !important; }' +
      '.el-table th[data-hide-col="1"] { display: none !important; width: 0 !important; }' +
      '.el-table td[data-hide-col="1"] { display: none !important; width: 0 !important; }' +
      '.el-table col[data-hide-col="1"] { visibility: collapse !important; width: 0 !important; }';
    document.head.appendChild(style);

    // 定时同步 colgroup 和 body 标记
    setInterval(function() {
      document.querySelectorAll('.el-table').forEach(function(table) {
        var hdrTr = table.querySelector('.el-table__header-wrapper thead tr');
        if (!hdrTr) return;
        var ths = hdrTr.querySelectorAll('th');
        var hideIdx = -1;
        ths.forEach(function(th, i) {
          if (th.getAttribute('data-hide-col') === '1') hideIdx = i;
        });
        if (hideIdx < 0) return;

        // colgroup
        table.querySelectorAll('colgroup col').forEach(function(col, j) {
          if (j === hideIdx) col.setAttribute('data-hide-col', '1');
        });

        // body td
        table.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row) {
          var tds = row.querySelectorAll('td');
          if (tds[hideIdx]) tds[hideIdx].setAttribute('data-hide-col', '1');
        });
      });
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(hideTimeCol, 600); });
  } else {
    setTimeout(hideTimeCol, 600);
  }
  setInterval(hideTimeCol, 2000);
})();
