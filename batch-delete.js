/**
 * 批量操作：勾选框 + 顶部批量删除条
 *
 * 策略：拦截 /achievement/page API 返回的 records 数组，按“数据行顺序”与 records 数组
 * 一一对应回填 id。避免用成果名称做 key 匹配（名称可能重复）。
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var observer = null;
  var isMutating = false;
  var globalBar = null;
  var COL_WIDTH = 38;

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
    var el = document.getElementById('batch-count');
    if (el) el.textContent = count;
    globalBar.style.display = count > 0 ? 'flex' : 'none';

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

  window._batchUpdate = function() { updateBar(); };

  // ========== API 拦截获取 records ==========
  function cache(records) {
    cachedRecords = records || [];
    setTimeout(fillIds, 50);
    setTimeout(fillIds, 300);
  }

  function readRecordsFromResponse(d) {
    return (d && d.data && d.data.records) ? d.data.records : [];
  }

  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    return origFetch.apply(this, arguments).then(function(resp) {
      var u = typeof url === 'string' ? url : (url.url || '');
      if (u.indexOf('/achievement/page') !== -1) {
        var c = resp.clone();
        c.json().then(function(d) { cache(readRecordsFromResponse(d)); }).catch(function() {});
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
        try { cache(readRecordsFromResponse(JSON.parse(x.responseText))); } catch(e) {}
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
      c.style.width = COL_WIDTH + 'px';
      c.style.minWidth = COL_WIDTH + 'px';
      c.style.maxWidth = COL_WIDTH + 'px';
      cg.insertBefore(c, cg.firstChild);
    });
  }

  function injectHeader() {
    document.querySelectorAll('.el-table__header-wrapper thead tr, .el-table thead tr').forEach(function(hr) {
      if (hr.querySelector('.batch-cb-header')) return;
      var th = document.createElement('th');
      th.className = 'batch-cb-header';
      th.style.cssText = 'width:' + COL_WIDTH + 'px;text-align:center;padding:0;vertical-align:middle;';
      th.innerHTML = '<input type="checkbox" class="batch-cb-all" style="cursor:pointer;" ' +
        'onclick="event.stopPropagation();var c=this.checked;' +
        'document.querySelectorAll(\'.batch-cb\').forEach(function(b){b.checked=c});window._batchUpdate()">';
      hr.insertBefore(th, hr.firstChild);
    });
  }

  function injectCheckboxes() {
    var bodyRows = document.querySelectorAll('.el-table__body-wrapper tbody tr, .el-table tbody tr');
    bodyRows.forEach(function(row) {
      if (row.querySelector('.batch-cb-cell')) return;
      var tds = row.querySelectorAll('td');
      if (tds.length < 2) return;

      var td = document.createElement('td');
      td.className = 'batch-cb-cell';
      td.style.cssText = 'width:' + COL_WIDTH + 'px;text-align:center;padding:0;vertical-align:middle;';
      td.innerHTML = '<input type="checkbox" class="batch-cb" data-ach-id="" style="cursor:pointer;" ' +
        'disabled onclick="event.stopPropagation();window._batchUpdate()">';
      row.insertBefore(td, tds[0]);
    });
  }

  // 按 records 数组顺序回填 id
  function fillIds() {
    var rows = document.querySelectorAll('.el-table__body-wrapper tbody tr, .el-table tbody tr');
    var idx = 0;
    rows.forEach(function(row) {
      var cb = row.querySelector('.batch-cb');
      if (!cb) return;
      var record = cachedRecords[idx];
      idx++;
      if (!record || !record.id) return;
      cb.setAttribute('data-ach-id', record.id);
      cb.removeAttribute('disabled');
    });
    updateBar();
  }

  function doInject() {
    if (isMutating) return;
    isMutating = true;
    try {
      ensureBar();
      fixColgroup();
      injectHeader();
      injectCheckboxes();
      fillIds();
    } finally {
      setTimeout(function() { isMutating = false; }, 100);
    }
  }

  // ========== 批量删除 ==========
  window._batchDel = function() {
    var ids = [];
    document.querySelectorAll('.batch-cb:checked').forEach(function(c) {
      var id = c.getAttribute('data-ach-id');
      if (id) ids.push(Number(id));
    });
    if (!ids.length) { alert('没有选中的数据'); return; }
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
    observer = new MutationObserver(function() {
      if (!isMutating) doInject();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    doInject();
    setInterval(function() { if (!isMutating) doInject(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
