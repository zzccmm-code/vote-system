/**
 * PDF 附件注入脚本 — 在成果管理页的操作栏中注入 PDF 上传/查看按钮
 * 加载于 index.html，通过 MutationObserver 监听 DOM 变化
 */
(function() {
  'use strict';

  var API_BASE = window._$base_url || 'http://localhost:7003';
  var achievementCache = {};    // id → { fileSrc, name }
  var nameToId = {};            // name → id 反向索引
  var pendingRows = 0;          // 等待数据填充的行数
  var isMutating = false;       // 防止自身 DOM 修改触发无限循环
  var observer = null;
  var injectTimer = null;

  // ========== 拦截 API 响应获取成果 PDF 状态 ==========
  function cacheAchievements(records) {
    if (!records || !records.length) return;
    records.forEach(function(item) {
      if (item.id) {
        achievementCache[item.id] = {
          fileSrc: item.fileSrc || '',
          name: item.achievementName || ''
        };
        if (item.achievementName) {
          nameToId[item.achievementName.trim()] = item.id;
        }
      }
    });
    // 数据到了，重新扫描注入
    setTimeout(injectPdfButtons, 200);
  }

  // 拦截 fetch
  var origFetch = window.fetch;
  window.fetch = function(url, options) {
    return origFetch.apply(this, arguments).then(function(resp) {
      var urlStr = typeof url === 'string' ? url : (url.url || '');
      if (urlStr.indexOf('/achievement/page') !== -1) {
        var clone = resp.clone();
        clone.json().then(function(data) {
          var records = [];
          if (data && data.data && data.data.records) records = data.data.records;
          cacheAchievements(records);
        }).catch(function() {});
      }
      return resp;
    });
  };

  // 拦截 XHR
  var OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    var xhr = new OrigXHR();
    var origOpen = xhr.open;
    xhr.open = function(method, url) {
      xhr._url = url;
      return origOpen.apply(xhr, arguments);
    };
    xhr.addEventListener('load', function() {
      if (xhr._url && xhr._url.indexOf('/achievement/page') !== -1) {
        try {
          var data = JSON.parse(xhr.responseText);
          var records = [];
          if (data && data.data && data.data.records) records = data.data.records;
          cacheAchievements(records);
        } catch(e) {}
      }
    });
    return xhr;
  };
  window.XMLHttpRequest.prototype = OrigXHR.prototype;

  // ========== DOM 注入 ==========
  function injectPdfButtons() {
    if (isMutating) return;
    isMutating = true;
    try {
      var tables = document.querySelectorAll('.el-table__body-wrapper tbody, .el-table tbody, table tbody');
      tables.forEach(function(tbody) {
        var rows = tbody.querySelectorAll('tr');
        rows.forEach(function(row) {
          // 跳过已处理的
          if (row.querySelector('.pdf-inject-btn')) return;

          var cells = row.querySelectorAll('td');
          if (cells.length < 2) return;

          // 操作列 = 最后一列，必须包含按钮
          var lastCell = cells[cells.length - 1];
          if (!lastCell) return;
          var hasActions = lastCell.querySelector('button, .el-button, a');
          if (!hasActions) return;

        // 成果名称在第2列 (cells[1])，序号在第1列 (cells[0])
        var nameCell = cells[1];
        var rowName = nameCell ? nameCell.textContent.trim().replace(/\s+/g, ' ') : '';

        // 匹配 ID
        var achievementId = nameToId[rowName];
        if (!achievementId) {
          // 再尝试模糊匹配
          for (var name in nameToId) {
            if (rowName.indexOf(name) !== -1 || name.indexOf(rowName) !== -1) {
              achievementId = nameToId[name];
              break;
            }
          }
        }

        injectButton(lastCell, achievementId);
      });
    });
  }
  } finally {
    setTimeout(function() { isMutating = false; }, 100);
  }
  }

  function injectButton(cell, achievementId) {
    var container = document.createElement('span');
    container.className = 'pdf-inject-btn';
    container.style.cssText = 'margin-left:6px;display:inline-block;vertical-align:middle;';

    var hasFile = achievementId && achievementCache[achievementId] && achievementCache[achievementId].fileSrc;

    if (hasFile) {
      container.innerHTML =
        '<a href="' + API_BASE + '/api/files/' + encodeURIComponent(achievementCache[achievementId].fileSrc) + '" ' +
        'target="_blank" ' +
        'style="color:#2563eb;font-size:12px;text-decoration:none;border:1px solid #2563eb;padding:3px 8px;border-radius:3px;margin-right:3px;background:#eff6ff;display:inline-block;">' +
        '查看PDF</a>' +
        '<span style="color:#ef4444;font-size:11px;cursor:pointer;text-decoration:underline;" ' +
        'onclick="event.stopPropagation();window._pdfUpload(' + achievementId + ',this)">重新上传</span>';
    } else {
      container.innerHTML =
        '<span style="color:#ef4444;font-size:12px;cursor:pointer;border:1px solid #ef4444;padding:3px 8px;border-radius:3px;background:#fef2f2;font-weight:600;display:inline-block;" ' +
        'onclick="event.stopPropagation();window._pdfUpload(' + (achievementId || 'null') + ',this)">上传PDF</span>';
    }

    cell.appendChild(container);
  }

  // ========== 上传逻辑（全局方法） ==========
  window._pdfUpload = function(achievementId, btnEl) {
    if (!achievementId) {
      alert('无法获取项目ID，请刷新页面后重试');
      return;
    }

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.style.display = 'none';
    input.onchange = function() {
      var file = input.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        alert('仅支持 PDF 格式文件！');
        document.body.removeChild(input);
        return;
      }
      doUpload(achievementId, file, btnEl);
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
  };

  function doUpload(achievementId, file, btnEl) {
    // 找到 container
    var container = btnEl.closest('.pdf-inject-btn');
    if (container) container.innerHTML = '<span style="color:#888;font-size:12px;">上传中...</span>';

    var fd = new FormData();
    fd.append('file', file);

    fetch(API_BASE + '/api/upload', { method: 'POST', body: fd })
      .then(function(r) {
        if (!r.ok) throw new Error('服务器错误 ' + r.status);
        return r.json();
      })
      .then(function(resp) {
        if (resp.code !== 200) throw new Error(resp.msg || '上传接口返回失败');
        var filename = resp.data;
        if (!filename) throw new Error('未获取到文件名');

        // 更新成就 fileSrc
        return fetch(API_BASE + '/achievement/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: Number(achievementId), fileSrc: filename })
        }).then(function(r) {
          if (!r.ok) throw new Error('更新接口错误 ' + r.status);
          return r.json();
        }).then(function(uResp) {
          if (uResp.code !== 200) throw new Error(uResp.msg || '关联PDF失败');

          // 更新缓存
          if (!achievementCache[achievementId]) {
            achievementCache[achievementId] = { fileSrc: '', name: '' };
          }
          achievementCache[achievementId].fileSrc = filename;

          // 刷新按钮
          refreshBtn(container, achievementId);
        });
      })
      .catch(function(err) {
        alert('上传失败: ' + err.message);
        if (container) refreshBtn(container, achievementId);
      });
  }

  function refreshBtn(container, achievementId) {
    if (!container) return;
    var hasFile = achievementCache[achievementId] && achievementCache[achievementId].fileSrc;
    if (hasFile) {
      container.innerHTML =
        '<a href="' + API_BASE + '/api/files/' + encodeURIComponent(achievementCache[achievementId].fileSrc) + '" ' +
        'target="_blank" ' +
        'style="color:#2563eb;font-size:12px;text-decoration:none;border:1px solid #2563eb;padding:3px 8px;border-radius:3px;margin-right:3px;background:#eff6ff;display:inline-block;">' +
        '查看PDF</a>' +
        '<span style="color:#ef4444;font-size:11px;cursor:pointer;text-decoration:underline;" ' +
        'onclick="event.stopPropagation();window._pdfUpload(' + achievementId + ',this)">重新上传</span>';
    } else {
      container.innerHTML =
        '<span style="color:#ef4444;font-size:12px;cursor:pointer;border:1px solid #ef4444;padding:3px 8px;border-radius:3px;background:#fef2f2;font-weight:600;display:inline-block;" ' +
        'onclick="event.stopPropagation();window._pdfUpload(' + achievementId + ',this)">上传PDF</span>';
    }
  }

  // ========== 启动 ==========
  function start() {
    if (observer) return;
    observer = new MutationObserver(function(mutations) {
      if (isMutating) return;
      var relevant = false;
      mutations.forEach(function(m) {
        if (m.target && (m.target.tagName === 'TBODY' || m.target.tagName === 'TABLE')) relevant = true;
      });
      if (relevant) injectPdfButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    injectTimer = setInterval(function() { if (!isMutating) injectPdfButtons(); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
