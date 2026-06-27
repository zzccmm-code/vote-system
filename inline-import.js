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
    btn.innerHTML = '<span>导入数据</span>';
    btn.onclick = function() { location.href = 'import.html'; };

    // 插入到工具栏末尾
    toolbar.appendChild(btn);

    // 三个操作按钮等宽
    var actionBtns = [btn].concat(Array.from(toolbar.querySelectorAll('.el-button--primary.el-button--small, .el-button--warning.el-button--small')));
    actionBtns.forEach(function(b) {
      b.style.setProperty('width', '110px', 'important');
      b.style.setProperty('min-width', '110px', 'important');
      b.style.setProperty('box-sizing', 'border-box');
      b.style.margin = '0';
    });

    // 导入数据按钮高度对齐成果新增按钮
    var primaryBtn = toolbar.querySelector('.el-button--primary.el-button--small');
    if (primaryBtn) {
      var ph = window.getComputedStyle(primaryBtn).getPropertyValue('padding-top');
      var pb = window.getComputedStyle(primaryBtn).getPropertyValue('padding-bottom');
      btn.style.setProperty('padding-top', ph, 'important');
      btn.style.setProperty('padding-bottom', pb, 'important');
      btn.style.setProperty('height', primaryBtn.offsetHeight + 'px', 'important');
    }
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'flex-start';
    toolbar.style.alignItems = 'center';
    toolbar.style.gap = '8px';
    toolbar.style.flexWrap = 'nowrap';

    // 缩小所有搜索框
    toolbar.querySelectorAll('.el-input, .el-select').forEach(function(el) {
      el.style.width = '110px';
    });
    toolbar.querySelectorAll('.el-input__inner, input[type="text"]').forEach(function(inp) {
      inp.style.width = '100%';
    });

    // 推荐等级搜索框额外缩小50%
    toolbar.querySelectorAll('.el-form-item__label').forEach(function(label) {
      if (label.textContent.trim() === '推荐等级：' || label.textContent.trim() === '专家组推荐等级：') {
        var formItem = label.closest('.el-form-item');
        if (formItem) {
          var select = formItem.querySelector('.el-select');
          if (select) select.style.width = '55px';
        }
      }
    });

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
