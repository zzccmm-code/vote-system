/**
 * 批量操作 + 列宽管理
 * 关键：ELUI 两张 table 的 colgroup 必须完全一致才能对齐
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var observer = null;
  var bar = null;
  var CB_W = 38;

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
      document.querySelectorAll('.wb-cb').forEach(function(c) { c.checked = e.target.checked; });
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

  // ==================== API ====================
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
  function doInject() {
    ensureBar();
    document.querySelectorAll('.el-table').forEach(function(ct) {
      // 找到内部两张 table
      var hdrTbl = ct.querySelector('.el-table__header-wrapper table');
      var bodyTbl = ct.querySelector('.el-table__body-wrapper table');
      // 也可能在 .el-table__fixed 等里面，统一取所有 table
      if (!hdrTbl) hdrTbl = ct.querySelector('table'); // fallback
      var tables = ct.querySelectorAll('table');

      tables.forEach(function(tbl) {
        // ---- 1) colgroup 插入勾选列 ----
        var cg = tbl.querySelector('colgroup');
        if (cg && !cg.querySelector('.wb-cb-col')) {
          var cc = document.createElement('col');
          cc.className = 'wb-cb-col';
          cc.setAttribute('width', CB_W);
          cc.style.cssText = 'width:'+CB_W+'px;min-width:'+CB_W+'px;max-width:'+CB_W+'px';
          cg.insertBefore(cc, cg.firstChild);
        }

        // ---- 2) 表头插入全选 th ----
        var thead = tbl.querySelector('thead');
        if (thead) {
          var hrs = thead.querySelectorAll('tr');
          hrs.forEach(function(hr) {
            if (hr.classList.contains('wb-hdr')) return;
            hr.classList.add('wb-hdr');
            var th = document.createElement('th');
            th.className = 'wb-th';
            th.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
            th.innerHTML = '<input type="checkbox" class="wb-cb-all" style="cursor:pointer;margin:0;vertical-align:middle;">';
            hr.insertBefore(th, hr.firstChild);
          });
        }

        // ---- 3) tbody 每行插入勾选 td ----
        var tbodies = tbl.querySelectorAll('tbody');
        tbodies.forEach(function(tb) {
          tb.querySelectorAll('tr').forEach(function(row) {
            if (row.classList.contains('wb-row')) return;
            row.classList.add('wb-row');
            var tds = row.querySelectorAll('td');
            if (!tds.length) return;
            var td = document.createElement('td');
            td.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
            td.innerHTML = '<input type="checkbox" class="wb-cb" data-id="" style="cursor:pointer;margin:0;vertical-align:middle;">';
            row.insertBefore(td, tds[0]);
          });
        });
      });

      // ---- 4) 统一两张 table 的 colgroup（关键：确保 header/body 列定义一致） ----
      if (hdrTbl && bodyTbl) {
        var hdrCg = hdrTbl.querySelector('colgroup');
        var bodyCg = bodyTbl.querySelector('colgroup');
        if (hdrCg && bodyCg) {
          // 用 header colgroup 覆盖 body colgroup
          bodyCg.innerHTML = hdrCg.innerHTML;
        }
      }

      // ---- 5) 设固定布局铺满 ----
      tables.forEach(function(tbl) {
        tbl.style.tableLayout = 'fixed';
        tbl.style.width = '100%';
      });
    });

    fillIds();
  }

  function fillIds() {
    document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row, i) {
      var cb = row.querySelector('.wb-cb');
      if (!cb) return;
      var rec = cachedRecords[i];
      if (rec && rec.id) cb.setAttribute('data-id', rec.id);
    });
    onCheck();
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
        if (t.nodeType === 1 && t.closest && t.closest('.el-table')) { doInject(); break; }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(doInject, 2000);
  }
})();
