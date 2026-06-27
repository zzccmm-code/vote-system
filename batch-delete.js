/**
 * 批量操作：勾选框 + 顶部批量删除条
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var nameToId = {};
  var observer = null;
  var isMutating = false;
  var globalBar = null;

  // ========== 顶部浮动删除条 ==========
  function ensureBar() {
    if (globalBar && document.body.contains(globalBar)) return;
    globalBar = document.createElement('div');
    globalBar.id = 'batch-bar';
    globalBar.innerHTML =
      '<span style="margin-left:12px;">已选 <strong id="batch-count">0</strong> 项</span>' +
      '<span>' +
        '<button id="batch-del-btn" onclick="window._batchDel()">🗑 批量删除</button>' +
        '<button onclick="window._batchClear()">取消</button>' +
      '</span>';
    var s = globalBar.style;
    s.position = 'fixed'; s.top = '0'; s.left = '0'; s.right = '0'; s.zIndex = '10000';
    s.background = '#ef4444'; s.color = '#fff'; s.padding = '8px 16px';
    s.display = 'none'; s.alignItems = 'center'; s.justifyContent = 'space-between';
    s.fontSize = '14px'; s.fontWeight = '600'; s.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    document.body.insertBefore(globalBar, document.body.firstChild);
  }

  function updateBar() {
    ensureBar();
    var count = document.querySelectorAll('.batch-cb:checked').length;
    document.getElementById('batch-count').textContent = count;
    globalBar.style.display = count > 0 ? 'flex' : 'none';

    // 全选框状态
    var all = document.querySelectorAll('.batch-cb');
    var checked = document.querySelectorAll('.batch-cb:checked');
    document.querySelectorAll('.batch-cb-all').forEach(function(cb) {
      cb.checked = all.length > 0 && checked.length === all.length;
    });
  }

  window._batchClear = function() {
    document.querySelectorAll('.batch-cb').forEach(function(cb) { cb.checked = false; });
    document.querySelectorAll('.batch-cb-all').forEach(function(cb) { cb.checked = false; });
    updateBar();
  };

  // ========== API 拦截获取 ID ==========
  function cache(records) {
    if (!records || !records.length) return;
    records.forEach(function(r) {
      if (r.id && r.achievementName) nameToId[r.achievementName.trim()] = r.id;
    });
    setTimeout(updateExistIds, 100);
  }

  // 更新已注入的勾选框ID（数据到达后回填）
  function updateExistIds() {
    document.querySelectorAll('.batch-cb-cell').forEach(function(td) {
      var row = td.parentElement;
      var tds = row.querySelectorAll('td');
      if (tds.length < 2) return;
      var name = tds[1].textContent.trim().replace(/\s+/g, ' ');
      var id = nameToId[name] || '';
      if (id) {
        var cb = td.querySelector('.batch-cb');
        if (cb) {
          cb.setAttribute('data-ach-id', id);
          cb.removeAttribute('disabled');
        }
      }
    });
  }

  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    return origFetch.apply(this, arguments).then(function(resp) {
      var u = typeof url === 'string' ? url : (url.url || '');
      if (u.indexOf('/achievement/page') !== -1) {
        var c = resp.clone();
        c.json().then(function(d) {
          var records = (d && d.data && d.data.records) ? d.data.records : [];
          cache(records);
        }).catch(function() {});
      }
      return resp;
    });
  };

  var OX = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    var x = new OX();
    var oo = x.open;
    x.open = function(m, u) { x._u = u; return oo.apply(x, arguments); };
    x.addEventListener('load', function() {
      if (x._u && x._u.indexOf('/achievement/page') !== -1) {
        try {
          var d = JSON.parse(x.responseText);
          var records = (d && d.data && d.data.records) ? d.data.records : [];
          cache(records);
        } catch(e) {}
      }
    });
    return x;
  };
  window.XMLHttpRequest.prototype = OX.prototype;

  // ========== DOM 注入 ==========
  function fixColgroup() {
    document.querySelectorAll('.el-table colgroup').forEach(function(cg) {
      if (cg.querySelector('.batch-cb-col')) return;
      var c = document.createElement('col');
      c.className = 'batch-cb-col';
      c.style.width = '38px';
      c.style.minWidth = '38px';
      c.style.maxWidth = '38px';
      cg.insertBefore(c, cg.firstChild);
    });
  }

  function injectCb() {
    document.querySelectorAll('.el-table__header-wrapper thead tr, .el-table thead tr').forEach(function(hr) {
      if (hr.querySelector('.batch-cb-header')) return;
      var th = document.createElement('th');
      th.className = 'batch-cb-header';
      th.style.cssText = 'width:38px;text-align:center;padding:0;';
      th.innerHTML = '<input type="checkbox" class="batch-cb-all" style="cursor:pointer;" ' +
        'onclick="event.stopPropagation();var c=this.checked;' +
        'document.querySelectorAll(\'.batch-cb\').forEach(function(b){b.checked=c});window._batchUpdate()">';
      hr.insertBefore(th, hr.firstChild);
    });

    document.querySelectorAll('.el-table__body-wrapper tbody tr, .el-table tbody tr').forEach(function(row) {
      if (row.querySelector('.batch-cb-cell')) return;
      var tds = row.querySelectorAll('td');
      if (tds.length < 2) return;

      var name = tds[1].textContent.trim().replace(/\s+/g, ' ');
      var id = nameToId[name] || '';

      var td = document.createElement('td');
      td.className = 'batch-cb-cell';
      td.style.cssText = 'width:38px;text-align:center;padding:0;vertical-align:middle;';
      td.innerHTML = '<input type="checkbox" class="batch-cb" data-ach-id="' + id + '" style="cursor:pointer;" ' +
        (id ? '' : 'disabled') +
        ' onclick="event.stopPropagation();window._batchUpdate()">';
      row.insertBefore(td, tds[0]);
    });
  }

  function doInject() {
    if (isMutating) return;
    isMutating = true;
    try { ensureBar(); fixColgroup(); injectCb(); } finally {
      setTimeout(function() { isMutating = false; }, 100);
    }
  }

  window._batchUpdate = function() { updateBar(); };

  window._batchDel = function() {
    var ids = [];
    document.querySelectorAll('.batch-cb:checked').forEach(function(c) {
      var id = c.getAttribute('data-ach-id');
      if (id) ids.push(Number(id));
    });
    if (!ids.length) return;
    if (!confirm('确定删除选中的 ' + ids.length + ' 条成果？')) return;

    var btn = document.getElementById('batch-del-btn');
    if (btn) { btn.disabled = true; btn.textContent = '删除中...'; }

    fetch(API_BASE + '/achievement/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectIds: ids })
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.code === 200) { alert('已删除 ' + ids.length + ' 条'); location.reload(); }
      else { alert('失败: ' + (d.msg || '')); if (btn) { btn.disabled = false; btn.textContent = '🗑 批量删除'; } }
    }).catch(function(e) { alert('错误: ' + e.message); if (btn) { btn.disabled = false; btn.textContent = '🗑 批量删除'; } });
  };

  // ========== 启动 ==========
  function start() {
    if (observer) return;
    observer = new MutationObserver(function() { if (!isMutating) doInject(); });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(function() { if (!isMutating) doInject(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
