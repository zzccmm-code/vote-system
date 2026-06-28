(function() {
  'use strict';

  function go() {
    document.querySelectorAll('.el-card.search-box').forEach(function(card) {
      var formEl = card.querySelector('.el-form');
      if (!formEl) return;

      formEl.style.setProperty('display', 'flex', 'important');
      formEl.style.setProperty('flex-wrap', 'nowrap', 'important');
      formEl.style.setProperty('align-items', 'center', 'important');
      formEl.style.setProperty('gap', '6px', 'important');

      var rightBox = card.querySelector('.right-box');
      if (rightBox) {
        rightBox.style.setProperty('float', 'none', 'important');
        rightBox.style.setProperty('margin', '0', 'important');
        rightBox.style.setProperty('display', 'flex', 'important');
        rightBox.style.setProperty('align-items', 'center', 'important');
        rightBox.style.setProperty('gap', '6px', 'important');
        rightBox.style.setProperty('flex-shrink', '0', 'important');
        rightBox.style.setProperty('margin-left', 'auto', 'important');
        var addBtn = rightBox.querySelector('.el-button--primary');
        if (addBtn) { addBtn.style.setProperty('margin-left', '-2px', 'important'); }
      }

      card.querySelectorAll('.el-form-item').forEach(function(item) {
        item.style.setProperty('margin-bottom', '0', 'important');
        item.style.setProperty('flex-shrink', '0', 'important');
        var label = item.querySelector('.el-form-item__label');
        if (label) {
          label.style.setProperty('font-size', '12px', 'important');
          label.style.setProperty('padding', '0 4px', 'important');
        }
        var select = item.querySelector('.el-select');
        if (select) {
          var lt = label ? label.textContent.trim() : '';
          if (lt.indexOf('成果类别') > -1) {
            select.style.setProperty('width', '130px', 'important');
          } else {
            select.style.setProperty('width', '90px', 'important');
          }
        }
      });

      card.querySelectorAll('.el-button').forEach(function(btn) {
        if (btn.classList.contains('el-button--warning')) { btn.style.setProperty('margin-left', '-1px', 'important'); }
        btn.style.setProperty('flex-shrink', '0', 'important');
        var span = btn.querySelector('span');
        if (span) span.style.setProperty('font-size', '12px', 'important');
      });

      if (!card.querySelector('.wb-import-inline')) {
        var targetBox = rightBox || formEl;
        var ib = document.createElement('button');
        ib.setAttribute('type', 'button');
        ib.className = 'el-button el-button--success wb-import-inline';
        ib.innerHTML = '<span>导入数据</span>';
        ib.onclick = function() { location.href = 'import.html'; };
        targetBox.appendChild(ib);
      }

      var floatBtn = document.querySelector('.import-float-btn');
      if (floatBtn) floatBtn.style.setProperty('display', 'none', 'important');
    });
  }

  setInterval(go, 1500);
  setTimeout(go, 500);
})();