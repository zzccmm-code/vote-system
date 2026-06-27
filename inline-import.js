/**
 * 将"导入数据"按钮从浮动改为并入工具栏（与成果新增/开始投票并排）
 */
(function() {
  'use strict';

  function inject() {
    // 找到工具栏容器（包含成果新增和开始投票按钮的 div）
    var voteBtn = document.querySelector('.el-button--warning span');
    if (!voteBtn) {
      // 通过文本找"开始投票"按钮
      var allBtns = document.querySelectorAll('.el-button');
      allBtns.forEach(function(btn) {
        if (btn.textContent.trim() === '开始投票') voteBtn = btn;
      });
      if (!voteBtn) return;
    }

    // 找到父级容器（工具栏）
    var toolbar = null;
    var el = voteBtn.closest ? voteBtn.closest('div') : voteBtn.parentElement;
    while (el && el !== document.body) {
      // 找到包含多个 el-button 的 div
      if (el.querySelectorAll && el.querySelectorAll('.el-button').length >= 2) {
        toolbar = el;
        break;
      }
      el = el.parentElement;
    }
    if (!toolbar) return;

    // 检查是否已注入
    if (toolbar.querySelector('.wb-import-inline')) return;

    // 创建内联导入按钮
    var btn = document.createElement('button');
    btn.className = 'el-button el-button--success el-button--small wb-import-inline';
    btn.innerHTML = '<span>📊 导入数据</span>';
    btn.onclick = function() { location.href = 'import.html'; };

    // 插入到工具栏末尾
    toolbar.appendChild(btn);
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'flex-start';
    toolbar.style.gap = '12px';

    // 隐藏原浮动按钮
    var floatBtn = document.querySelector('.import-float-btn');
    if (floatBtn) floatBtn.style.display = 'none';
  }

  setInterval(inject, 1500);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(inject, 800); });
  } else {
    setTimeout(inject, 800);
  }
})();
