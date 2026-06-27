/**
 * 附件上传注入 — 在成果管理表"操作"列中注入"上传附件"/"查看PDF"
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var achievementCache = {};    // id → { fileSrc, name }
  var nameToId = {};
  var isMutating = false;
  var tid = null;

  // ========== 数据获取 ==========
  function loadData(callback) {
    fetch(API_BASE + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      var records = (d && d.data && d.data.records) || [];
      records.forEach(function(r) {
        if (r.id) {
          achievementCache[r.id] = { fileSrc: r.fileSrc || '', name: r.achievementName || '' };
          if (r.achievementName) nameToId[r.achievementName.trim()] = r.id;
        }
      });
      if (callback) callback();
    }).catch(function() {});
  }

  // ========== DOM 注入 ==========
  function inject() {
    if (isMutating) return;
    isMutating = true;

    try {
      document.querySelectorAll('.el-table tbody tr').forEach(function(row) {
        if (row.querySelector('.wb-attach')) return;

        var cells = row.querySelectorAll('td');
        if (cells.length < 2) return;

        // 操作列 = 最后一个有按钮的 td
        var lastIdx = cells.length - 1;
        var opCell = null;
        for (var i = lastIdx; i >= 0; i--) {
          if (cells[i].querySelector('button, .el-button, a')) {
            opCell = cells[i]; break;
          }
        }
        if (!opCell) return;

        // 成果名称列 — 从右边数第2个（跳过操作列）
        // 或者正向：cells[1] 是序号，cells[2] 是名称（有复选框时）
        // cells[0]=复选框, cells[1]=序号, cells[2]=成果名称
        var nameCell = cells.length >= 3 ? cells[2] : cells[1];
        if (!nameCell) return;
        var rowName = nameCell.textContent.trim().replace(/\s+/g, ' ');

        // 匹配 ID
        var aid = nameToId[rowName];
        if (!aid) {
          for (var n in nameToId) {
            if (rowName.indexOf(n) > -1 || n.indexOf(rowName) > -1) { aid = nameToId[n]; break; }
          }
        }

        // 插入按钮
        var span = document.createElement('span');
        span.className = 'wb-attach';
        span.style.cssText = 'margin-left:4px;display:inline-block;vertical-align:middle;';
        renderBtn(span, aid);
        opCell.appendChild(span);
      });
    } finally {
      setTimeout(function() { isMutating = false; }, 100);
    }
  }

  function renderBtn(span, aid) {
    var hasFile = aid && achievementCache[aid] && achievementCache[aid].fileSrc;
    if (hasFile) {
      span.innerHTML =
        '<a href="' + API_BASE + '/api/files/' + encodeURIComponent(achievementCache[aid].fileSrc) + '" ' +
        'target="_blank" ' +
        'style="color:#2563eb;font-size:12px;text-decoration:none;border:1px solid #2563eb;padding:3px 7px;border-radius:3px;background:#eff6ff;font-weight:600;display:inline-block;">' +
        '查看附件</a>';
    } else {
      span.innerHTML =
        '<span style="color:#ef4444;font-size:12px;cursor:pointer;border:1px solid #ef4444;padding:3px 7px;border-radius:3px;background:#fef2f2;font-weight:600;display:inline-block;" ' +
        'onclick="event.stopPropagation();window._wbUpload(' + (aid || 'null') + ',this)">上传附件</span>';
    }
  }

  // ========== 上传 ==========
  window._wbUpload = function(aid, btnEl) {
    if (!aid) {
      // 尝试从 row 中匹配 ID
      var row = btnEl.closest('tr');
      if (row) {
        var cells = row.querySelectorAll('td');
        var nameCell = cells.length >= 3 ? cells[2] : cells[1];
        if (nameCell) {
          var rn = nameCell.textContent.trim().replace(/\s+/g, ' ');
          aid = nameToId[rn];
        }
      }
      if (!aid) { alert('请先切换到"成果管理"页面加载数据后再操作'); return; }
    }

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';
    input.onchange = function() {
      var file = input.files[0];
      if (!file) { document.body.removeChild(input); return; }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('仅支持 PDF 格式！');
        document.body.removeChild(input);
        return;
      }
      doUpload(aid, file, btnEl);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  };

  function doUpload(aid, file, btnEl) {
    var span = btnEl.closest('.wb-attach');
    if (span) span.innerHTML = '<span style="color:#888;font-size:12px;">上传中...</span>';

    var fd = new FormData();
    fd.append('file', file);

    fetch(API_BASE + '/api/upload', { method: 'POST', body: fd })
      .then(function(r) { if (!r.ok) throw new Error('服务器错误'); return r.json(); })
      .then(function(resp) {
        if (resp.code !== 200) throw new Error(resp.msg || '上传失败');
        var fn = resp.data;
        if (!fn) throw new Error('未获取到文件名');

        return fetch(API_BASE + '/achievement/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Number(aid), fileSrc: fn })
        }).then(function(r) { return r.json(); }).then(function(u) {
          if (u.code !== 200) throw new Error(u.msg || '关联失败');

          if (!achievementCache[aid]) achievementCache[aid] = { fileSrc: '', name: '' };
          achievementCache[aid].fileSrc = fn;

          if (span) renderBtn(span, aid);
        });
      })
      .catch(function(err) {
        alert('上传失败: ' + err.message);
        if (span) renderBtn(span, aid);
      });
  }

  // ========== 启动 ==========
  function go() {
    inject();
    loadData(function() { inject(); });

    if (tid) clearInterval(tid);
    tid = setInterval(function() {
      loadData(function() { inject(); });
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
