/**
 * 专家评审推荐列 - 确保在成果管理表中可见，表头改为"专家评审推荐"
 */
(function() {
  'use strict';

  function fixColumn() {
    var ths = document.querySelectorAll('.el-table th, .el-table__header-wrapper th');
    ths.forEach(function(th) {
      var txt = th.textContent.trim();
      if (txt === '专家推荐等级' || txt === '专家评审推荐') {
        // 确保列头文本
        var cell = th.querySelector('.cell');
        if (cell) {
          cell.textContent = '专家评审推荐';
        } else {
          th.textContent = '专家评审推荐';
        }
        th.style.display = '';
        th.style.visibility = '';
      }
    });

    // 确保对应数据列也可见
    var headerRow = document.querySelector('.el-table__header-wrapper thead tr, .el-table thead tr');
    if (!headerRow) return;
    var headerCells = headerRow.querySelectorAll('th');
    var targetIdx = -1;
    headerCells.forEach(function(th, i) {
      var txt = (th.textContent || '').trim();
      if (txt === '专家推荐等级' || txt === '专家评审推荐') {
        targetIdx = i;
        th.style.display = '';
      }
    });
    if (targetIdx === -1) return;

    // 确保 body 中对应列可见
    document.querySelectorAll('.el-table tbody tr').forEach(function(row) {
      var tds = row.querySelectorAll('td');
      if (tds[targetIdx]) {
        tds[targetIdx].style.display = '';
        tds[targetIdx].style.visibility = '';
      }
    });
  }

  var tid = setInterval(fixColumn, 1000);
  setTimeout(function() {
    clearInterval(tid);
    fixColumn();
  }, 15000);

  document.addEventListener('DOMContentLoaded', fixColumn);
  fixColumn();
})();
