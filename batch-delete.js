/**
 * 批量操作 + 列宽管理（合并版）
 * - 勾选框注入（header + body 各自的 colgroup/thead/tbody）
 * - 顶部批量删除条
 * - 列宽均分铺满页面
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var observer = null;
  var bar = null;
  var CB_W = 36;

  // ==================== 批量删除条 ====================
  function ensureBar() {
    if (bar && document.body.contains(bar)) return;
    bar = document.createElement('div');
    bar.id = 'wb-bar';
    bar.innerHTML =
      '<span>已选 <b id="wb-cnt">0</b> 项</span> ' +
      '<span>' +
        '<button id="wb-del" style="background:#fff;color:#ef4444;border:none;padding:4px 13px;border-radius:4px;font-weight:600;cursor:pointer">批量删除</button>' +
        '<button id="wb-clr" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6);padding:3px 11px;border-radius:4px;margin-left:6px;cursor:pointer">取消</button>' +
      '</span>';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#ef4444;color:#fff;padding:8px 16px;display:none;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2);align-items:center;justify-content:space-between';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function showBar(n) {
    ensureBar();
    document.getElementById('wb-cnt').textContent = n;
    bar.style.display = n > 0 ? 'flex' : 'none';
  }

  document.addEventListener('click', function(e) {
    if (e.target.id === 'wb-del') {
      var ids = [];
      document.querySelectorAll('.wb-cb:checked').forEach(function(c) {
        var id = Number(c.getAttribute('data-id'));
        if (id) ids.push(id);
      });
      if (!ids.length) { alert('请先切换到"成果管理"页面加载数据'); return; }
      if (!confirm('确定删除选中的 ' + ids.length + ' 条成果？')) return;
      e.target.disabled = true; e.target.textContent = '删除中...';
      fetch(API_BASE + '/achievement/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectIds: ids })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.code === 200) { alert('已删除 ' + ids.length + ' 条'); location.reload(); }
        else { alert('失败: ' + (d.msg || '')); e.target.disabled = false; e.target.textContent = '批量删除'; }
      }).catch(function(err) { alert('错误: ' + err.message); e.target.disabled = false; e.target.textContent = '批量删除'; });
      return;
    }
    if (e.target.id === 'wb-clr') {
      document.querySelectorAll('.wb-cb,.wb-cb-all').forEach(function(c) { c.checked = false; });
      onCheck();
      return;
    }
    if (e.target.classList.contains('wb-cb')) { setTimeout(onCheck, 50); return; }
    if (e.target.classList.contains('wb-cb-all')) {
      var checked = e.target.checked;
      document.querySelectorAll('.wb-cb').forEach(function(c) { c.checked = checked; });
      onCheck();
    }
  });

  function onCheck() {
    var all = document.querySelectorAll('.wb-cb');
    var chk = document.querySelectorAll('.wb-cb:checked');
    showBar(chk.length);
    document.querySelectorAll('.wb-cb-all').forEach(function(c) {
      c.checked = all.length > 0 && chk.length === all.length;
    });
  }

  // ==================== API 拦截 ====================
  function onRecords(records) { cachedRecords = records || []; setTimeout(fillIds, 80); setTimeout(fillIds, 400); }
  function readRecords(d) { return (d && d.data && d.data.records) || []; }

  var _fetch = window.fetch;
  window.fetch = function(u, o) {
    return _fetch.apply(this, arguments).then(function(r) {
      var url = typeof u === 'string' ? u : (u.url || '');
      if (url.indexOf('/achievement/page') > 0) {
        var c = r.clone();
        c.json().then(function(d) { onRecords(readRecords(d)); }).catch(function() {});
      }
      return r;
    });
  };

  var OX = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    var x = new OX(), oo = x.open;
    x.open = function(m, u) { x._u = u; return oo.apply(x, arguments); };
    x.addEventListener('load', function() {
      if (x._u && x._u.indexOf('/achievement/page') > 0) {
        try { onRecords(readRecords(JSON.parse(x.responseText))); } catch(e) {}
      }
    });
    return x;
  };
  window.XMLHttpRequest.prototype = OX.prototype;

  // ==================== DOM 注入 ====================
  // 给 ELementUI 两个子 table 的 colgroup 都插入勾选列 + 均分宽度
  function fixColgroups() {
    // 遍历所有 table（ELUI 使用 table.el-table__header / table.el-table__body）
    document.querySelectorAll('.el-table table').forEach(function(tbl) {
      var cg = tbl.querySelector('colgroup');
      if (!cg) return;

      // 确保有勾选列的 col
      if (!cg.querySelector('.wb-cb-col')) {
        var cc = document.createElement('col');
        cc.className = 'wb-cb-col';
        cc.style.cssText = 'width:'+CB_W+'px;min-width:'+CB_W+'px;max-width:'+CB_W+'px';
        cg.insertBefore(cc, cg.firstChild);
      }

      // 均分其余列
      var normal = [];
      cg.querySelectorAll('col').forEach(function(c) {
        if (!c.classList.contains('wb-cb-col')) normal.push(c);
      });
      if (!normal.length) return;

      var firstPct = 4, lastPct = 14;
      var midPct = normal.length > 2
        ? parseFloat(((100 - firstPct - lastPct) / (normal.length - 2)).toFixed(2))
        : parseFloat((100 / normal.length).toFixed(2));

      normal.forEach(function(col, i) {
        var w = (i === 0 ? firstPct : (i === normal.length - 1 ? lastPct : midPct)) + '%';
        col.style.cssText = 'width:' + w;
      });

      tbl.style.tableLayout = 'fixed';
      tbl.style.width = '100%';
    });
  }

  function injectHeader() {
    document.querySelectorAll('.el-table__header-wrapper thead tr').forEach(function(hr) {
      if (hr.classList.contains('wb-hdr-done')) return;
      hr.classList.add('wb-hdr-done');
      var th = document.createElement('th');
      th.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;vertical-align:middle;background:inherit;border:inherit;';
      th.innerHTML = '<input type="checkbox" class="wb-cb-all" style="cursor:pointer;margin:0;vertical-align:middle">';
      hr.insertBefore(th, hr.firstChild);
    });
  }

  function injectBody() {
    document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row) {
      if (row.classList.contains('wb-row-done')) return;
      row.classList.add('wb-row-done');
      var tds = row.querySelectorAll('td');
      if (!tds.length) return;
      var td = document.createElement('td');
      td.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;vertical-align:middle;';
      td.innerHTML = '<input type="checkbox" class="wb-cb" data-id="" style="cursor:pointer;margin:0;vertical-align:middle">';
      row.insertBefore(td, tds[0]);
    });
  }

  function fillIds() {
    var rows = document.querySelectorAll('.el-table__body-wrapper tbody tr');
    var idx = 0;
    rows.forEach(function(row) {
      var cb = row.querySelector('.wb-cb');
      if (!cb) return;
      var rec = cachedRecords[idx++];
      if (rec && rec.id) cb.setAttribute('data-id', rec.id);
    });
    onCheck();
  }

  function doInject() {
    ensureBar();
    fixColgroups();
    injectHeader();
    injectBody();
    fillIds();
  }

  // ==================== 启动 ====================
  if (document.readyState !== 'loading') {
    go();
  } else {
    document.addEventListener('DOMContentLoaded', go);
  }

  function go() {
    if (observer) return;
    doInject();
    observer = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t.nodeType === 1 && (t.closest && t.closest('.el-table'))) { doInject(); break; }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(doInject, 2500);
  }
})();
