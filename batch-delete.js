/**
 * 批量操作 - 极简版，最小化DOM改动
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var bar = null;
  var CB_W = 38;
  var tid = null;

  // ==================== 删除条 ====================
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
    document.body.appendChild(bar);
  }

  function updateBar() {
    var n = document.querySelectorAll('.wb-cb:checked').length;
    document.getElementById('wb-cnt').textContent = n;
    bar.style.display = n > 0 ? 'flex' : 'none';
  }

  document.addEventListener('click', function(e) {
    var t = e.target;
    if (t.id === 'wb-del') {
      var ids = [];
      document.querySelectorAll('.wb-cb:checked').forEach(function(c) {
        if (c.getAttribute('data-id')) ids.push(Number(c.getAttribute('data-id')));
      });
      if (!ids.length) { alert('没有选中的数据'); return; }
      if (!confirm('确定删除选中的 ' + ids.length + ' 条成果？')) return;
      t.disabled = true; t.textContent = '删除中...';
      fetch(API_BASE + '/achievement/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectIds: ids })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.code === 200) { alert('已删除 ' + ids.length + ' 条'); location.reload(); }
        else { alert('失败: ' + (d.msg || '')); t.disabled = false; t.textContent = '批量删除'; }
      }).catch(function(err) { alert('错误: ' + err.message); t.disabled = false; t.textContent = '批量删除'; });
    }
    if (t.id === 'wb-clr') {
      document.querySelectorAll('.wb-cb,.wb-cb-all').forEach(function(c) { c.checked = false; });
      updateBar();
    }
    if (t.classList.contains('wb-cb')) setTimeout(updateBar, 50);
    if (t.classList.contains('wb-cb-all')) {
      document.querySelectorAll('.wb-cb').forEach(function(c) { c.checked = t.checked; });
      updateBar();
    }
  });

  // ==================== API拦截 ====================
  var _fetch = window.fetch;
  window.fetch = function(u, o) {
    return _fetch.apply(this, arguments).then(function(r) {
      var url = typeof u === 'string' ? u : (u.url || '');
      if (url.indexOf('/achievement/page') > 0) {
        r.clone().json().then(function(d) {
          cachedRecords = (d && d.data && d.data.records) || [];
          setTimeout(fill, 200);
          setTimeout(fill, 600);
        }).catch(function() {});
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
        try {
          var d = JSON.parse(x.responseText);
          cachedRecords = (d && d.data && d.data.records) || [];
          setTimeout(fill, 200);
        } catch(e) {}
      }
    });
    return x;
  };
  window.XMLHttpRequest.prototype = OX.prototype;

  // ==================== 注入 ====================
  function scan() {
    ensureBar();

    // 找到所有 el-table 内部的 table（含 header 和 body 两张）
    var tables = document.querySelectorAll('.el-table table');
    tables.forEach(function(tbl) {
      // --- colgroup: 插勾选列 ---
      var cg = tbl.querySelector('colgroup');
      if (cg && !cg.querySelector('.wb-cb-col')) {
        var cc = document.createElement('col');
        cc.className = 'wb-cb-col';
        cc.setAttribute('width', '' + CB_W);
        cc.style.width = CB_W + 'px';
        cg.insertBefore(cc, cg.firstChild);
      }

      // --- thead: 插全选 th ---
      var thead = tbl.querySelector('thead');
      if (thead) {
        thead.querySelectorAll('tr').forEach(function(hr) {
          if (hr.classList.contains('wb-hdr')) return;
          hr.classList.add('wb-hdr');
          var th = document.createElement('th');
          th.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
          th.innerHTML = '<input type="checkbox" class="wb-cb-all" style="cursor:pointer;margin:0;vertical-align:middle">';
          hr.insertBefore(th, hr.firstChild);
        });
      }

      // --- tbody: 每行插勾选 td ---
      tbl.querySelectorAll('tbody').forEach(function(tb) {
        tb.querySelectorAll('tr').forEach(function(row) {
          if (row.classList.contains('wb-row')) return;
          row.classList.add('wb-row');
          var tds = row.querySelectorAll('td');
          if (!tds.length) return;
          var td = document.createElement('td');
          td.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
          td.innerHTML = '<input type="checkbox" class="wb-cb" data-id="" style="cursor:pointer;margin:0;vertical-align:middle">';
          row.insertBefore(td, tds[0]);
        });
      });
    });
  }

  function fill() {
    document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row, i) {
      var cb = row.querySelector('.wb-cb');
      if (!cb) return;
      var rec = cachedRecords[i];
      if (rec && rec.id) cb.setAttribute('data-id', rec.id);
    });
    updateBar();
  }

  // ==================== 启动 ====================
  function go() {
    scan();
    fill();
    if (tid) clearInterval(tid);
    tid = setInterval(function() { scan(); fill(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
