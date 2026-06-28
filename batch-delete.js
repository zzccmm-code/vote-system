/**
 * 批量操作 + 表头对齐（彻底版）
 * 用 getBoundingClientRect 测量 header 列宽，精确应用到 body
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var cachedRecords = [];
  var bar = null;
  var CB_W = 36;
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectIds: ids })
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.code === 200) { alert('已删除 ' + ids.length + ' 条'); location.reload(); }
        else { alert('失败: '+d.msg); t.disabled=false; t.textContent='批量删除'; }
      }).catch(function(err) { alert('错误: '+err.message); t.disabled=false; t.textContent='批量删除'; });
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

  // ==================== API ====================
  var _fetch = window.fetch;
  window.fetch = function(u, o) {
    return _fetch.apply(this, arguments).then(function(r) {
      var url = typeof u === 'string' ? u : (u.url || '');
      if (url.indexOf('/achievement/page') > 0) {
        r.clone().json().then(function(d) {
          cachedRecords = (d && d.data && d.data.records) || [];
          setTimeout(fill, 200); setTimeout(fill, 600);
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
        try { var d = JSON.parse(x.responseText); cachedRecords = (d && d.data && d.data.records) || []; setTimeout(fill, 200); } catch(e) {}
      }
    });
    return x;
  };
  window.XMLHttpRequest.prototype = OX.prototype;

  // ==================== 注入 + 对齐 ====================
  function scan() {
    ensureBar();

    document.querySelectorAll('.el-table').forEach(function(ct) {
      var hdrTbl = ct.querySelector('.el-table__header-wrapper table');
      var bodyTbl = ct.querySelector('.el-table__body-wrapper table');
      if (!hdrTbl || !bodyTbl) return;

      // --- 注入全选 th ---
      var hdrTr = hdrTbl.querySelector('thead tr');
      if (hdrTr && !hdrTr.classList.contains('wb-hdr')) {
        hdrTr.classList.add('wb-hdr');
        var th = document.createElement('th');
        th.className = 'wb-cb-th';
        th.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
        th.innerHTML = '<input type="checkbox" class="wb-cb-all" style="cursor:pointer;margin:0;vertical-align:middle">';
        hdrTr.insertBefore(th, hdrTr.firstChild);
      }

      // --- 注入 body 勾选 td ---
      bodyTbl.querySelectorAll('tbody tr').forEach(function(row) {
        if (row.classList.contains('wb-row')) return;
        row.classList.add('wb-row');
        var tds = row.querySelectorAll('td');
        if (!tds.length) return;
        var td = document.createElement('td');
        td.style.cssText = 'width:'+CB_W+'px;text-align:center;padding:0;';
        td.innerHTML = '<input type="checkbox" class="wb-cb" data-id="" style="cursor:pointer;margin:0;vertical-align:middle">';
        row.insertBefore(td, tds[0]);
      });

      // --- colgroup 注入 ---
      [hdrTbl, bodyTbl].forEach(function(tbl) {
        var cg = tbl.querySelector('colgroup');
        if (cg && !cg.querySelector('.wb-cb-col')) {
          var cc = document.createElement('col');
          cc.className = 'wb-cb-col';
          cc.setAttribute('width', '' + CB_W);
          cc.style.width = CB_W + 'px';
          cg.insertBefore(cc, cg.firstChild);
        }
      });

      // --- 对齐：测量 header 各列实际像素宽，用 !important 精确应用到 body ---
      var hdrThs = hdrTr.querySelectorAll('th');
      var bodyCols = bodyTbl.querySelectorAll('colgroup col');
      var bodyRows = bodyTbl.querySelectorAll('tbody tr');
      var gutterIdx = -1;

      // 找 gutter 列
      hdrTbl.querySelectorAll('colgroup col').forEach(function(c, i) {
        if (c.getAttribute('name') === 'gutter' || c.classList.contains('gutter')) gutterIdx = i;
      });

      // 计算 body wrapper 实际可用宽度
      var bodyWrapper = ct.querySelector('.el-table__body-wrapper');
      var wrapperW = bodyWrapper ? bodyWrapper.getBoundingClientRect().width : hdrTbl.getBoundingClientRect().width;

      hdrThs.forEach(function(hdrTh, i) {
        if (i === gutterIdx) return; // 跳过 gutter
        var w = hdrTh.getBoundingClientRect().width;
        if (w <= 0) return;

        // 映射到 body colgroup（body 没有 gutter）
        var bodyColIdx = gutterIdx >= 0 && i > gutterIdx ? i - 1 : i;

        if (bodyCols[bodyColIdx]) {
          bodyCols[bodyColIdx].style.setProperty('width', w + 'px', 'important');
          bodyCols[bodyColIdx].style.setProperty('min-width', w + 'px', 'important');
          bodyCols[bodyColIdx].style.setProperty('max-width', w + 'px', 'important');
        }

        bodyRows.forEach(function(row) {
          var tds = row.querySelectorAll('td');
          if (tds[bodyColIdx]) {
            tds[bodyColIdx].style.setProperty('width', w + 'px', 'important');
            tds[bodyColIdx].style.setProperty('min-width', w + 'px', 'important');
            tds[bodyColIdx].style.setProperty('max-width', w + 'px', 'important');
            tds[bodyColIdx].style.setProperty('box-sizing', 'border-box', 'important');
          }
        });
      });

      bodyTbl.style.setProperty('table-layout', 'fixed', 'important');
      bodyTbl.style.setProperty('width', wrapperW + 'px', 'important');
      bodyTbl.style.setProperty('min-width', wrapperW + 'px', 'important');
      bodyTbl.style.setProperty('max-width', wrapperW + 'px', 'important');
    });
  }

  function fill() {
    if (!cachedRecords.length) {
      fetch(API_BASE + '/achievement/page', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageNum: 1, pageSize: 200 })
      }).then(function(r) { return r.json(); }).then(function(d) {
        cachedRecords = (d && d.data && d.data.records) || [];
        doFill();
      }).catch(function() {});
      return;
    }
    doFill();
  }

  function doFill() {
    document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row, i) {
      var cb = row.querySelector('.wb-cb');
      if (!cb) return;
      var rec = cachedRecords[i];
      if (rec && rec.id) cb.setAttribute('data-id', rec.id);
    });
    updateBar();
  }

  // ==================== 启动 ====================
  function go() { scan(); fill(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', go); }
  else { go(); }
  if (tid) clearInterval(tid);
  tid = setInterval(go, 2000);
})();
