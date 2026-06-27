/**
 * 专家评审推荐列 — 仅改表头名，不填数据（Vue已自动绑定expertLevel）
 */
(function() {
  'use strict';

  function go() {
    var hdrTr = document.querySelector('.el-table__header-wrapper thead tr');
    if (!hdrTr) return;

    var ths = Array.from(hdrTr.querySelectorAll('th'));
    ths.forEach(function(th) {
      var cell = th.querySelector('.cell');
      if (!cell) return;
      var txt = cell.textContent.trim();
      if (txt === '专家组推荐等级' || txt === '专家推荐等级' || txt === '专家评审推荐') {
        cell.textContent = '专家评审推荐';
      }
      if (txt === '申报单位' || txt === '创建单位') {
        cell.textContent = '推荐单位(部门)';
      }
    });

    // 改搜索栏标签
    document.querySelectorAll('.el-form-item__label').forEach(function(label) {
      var t = label.textContent.trim();
      if (t === '专家组推荐等级：') label.textContent = '推荐等级：';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(go, 1000); });
  } else {
    setTimeout(go, 1000);
  }
  setInterval(go, 2000);
})();
