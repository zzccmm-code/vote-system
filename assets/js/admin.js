/* ============================================================
   科技奖励评审系统 — 后台管理端逻辑（纯原生 JS，无外部依赖）
   所有请求走相对路径，由 server.js 反向代理到后端 :7003
   ============================================================ */
(function () {
  'use strict';

  // -------------------- 访问方式检查 --------------------
  // 必须通过 http(s) 访问；若直接双击以 file:// 打开，所有接口请求都会失败
  if (location.protocol === 'file:') {
    var sh = document.querySelector('.shell');
    if (sh) {
      sh.innerHTML = '<div class="state error" style="padding:48px;text-align:center;line-height:1.8;">' +
        '<div style="font-size:18px;margin-bottom:12px;">⚠️ 访问方式不正确</div>' +
        '<div>请通过浏览器访问 <b style="color:var(--accent)">http://localhost:3000</b>（双击“启动服务.bat”会自动打开），' +
        '不要直接双击打开 HTML 文件，否则所有数据请求都会失败（Failed to fetch）。</div></div>';
    }
    return;
  }

  // -------------------- 基础工具 --------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // JSON 请求
  function post(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.code !== 200) throw new Error((d && d.msg) ? d.msg : '请求失败');
      return d;
    });
  }
  // 表单请求（含文件）
  function postForm(path, fd) {
    return fetch(path, { method: 'POST', body: fd })
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d || d.code !== 200) throw new Error((d && d.msg) ? d.msg : '请求失败');
        return d;
      });
  }

  // -------------------- Toast --------------------
  var toastTimer = null;
  function toast(msg, type) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast ' + (type || 'info') + ' show';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  // -------------------- 全局状态 --------------------
  var S = {
    page: 1, size: 100,
    category: '', level: '', name: '',
    total: 0, records: [],
    selected: {},          // id -> true
    curRound: null
  };

  var ICON = {
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M16 4v5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.51"/></svg>'
  };

  // ====================================================
  //  成果管理
  // ====================================================
  function loadList() {
    var wrap = $('tableWrap');
    // 骨架屏
    var sk = '<div class="skeleton">';
    for (var i = 0; i < 6; i++) sk += '<div class="sk-row" style="width:' + (60 + (i % 3) * 12) + '%"></div>';
    wrap.innerHTML = sk + '</div>';
    $('pager').innerHTML = '';

    post('/achievement/page', {
      pageNum: S.page, pageSize: S.size,
      achievementCategory: S.category || null,
      expertLevel: S.level || null,
      achievementName: S.name || null
    }).then(function (d) {
      var data = d.data || {};
      S.records = data.records || [];
      S.total = data.total || 0;
      renderTable();
      renderPager();
    }).catch(function (err) {
      wrap.innerHTML = '<div class="state error">' + ICON.error +
        '<div>加载失败：' + esc(err.message) + '</div></div>';
    });
  }

  function renderTable() {
    var wrap = $('tableWrap');
    if (!S.records.length) {
      wrap.innerHTML = '<div class="state">' + ICON.empty +
        '<div>暂无成果数据。点击右上角「成果新增」添加，或从「导入数据」批量导入。</div></div>';
      return;
    }
    var rows = S.records.map(function (r, i) {
      var idx = (S.page - 1) * S.size + i + 1;
      var cat = r.achievementCategory
        ? '<span class="tag tag-cat">' + esc(r.achievementCategory) + '</span>' : '<span class="tag tag-none">—</span>';
      var lvl = r.expertLevel
        ? '<span class="tag tag-level">' + esc(r.expertLevel) + '</span>' : '<span class="tag tag-none">—</span>';
      var units = r.creationUnits ? esc(r.creationUnits) : '<span style="color:var(--text-mute)">—</span>';
      var completer = r.completionPerson ? esc(r.completionPerson) : '<span style="color:var(--text-mute)">—</span>';
      var checked = S.selected[r.id] ? 'checked' : '';
      return '<tr>' +
        '<td class="col-check"><input type="checkbox" class="row-cb" data-id="' + r.id + '" ' + checked + '></td>' +
        '<td class="col-idx center">' + idx + '</td>' +
        '<td>' + cat + '</td>' +
        '<td>' + esc(r.achievementName || '') + '</td>' +
        '<td>' + units + '</td>' +
        '<td>' + completer + '</td>' +
        '<td>' + lvl + '</td>' +
        '<td><span class="cell-actions">' +
          '<button class="link-btn link-edit" data-edit="' + r.id + '">编辑</button>' +
          '<button class="link-btn link-del" data-del="' + r.id + '">删除</button>' +
        '</span></td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<table class="data"><thead><tr>' +
        '<th class="col-check"><input type="checkbox" id="checkAll"></th>' +
        '<th class="col-idx">序号</th>' +
        '<th>成果类别</th>' +
        '<th>成果名称</th>' +
        '<th>完成单位</th>' +
        '<th>完成人</th>' +
        '<th>推荐等级</th>' +
        '<th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderPager() {
    var totalPages = Math.max(1, Math.ceil(S.total / S.size));
    var sizeOpts = [10, 20, 50, 100];
    var sizeSel = '<select id="pgSize">';
    sizeOpts.forEach(function (n) {
      sizeSel += '<option value="' + n + '"' + (S.size === n ? ' selected' : '') + '>' + n + ' 条/页</option>';
    });
    sizeSel += '</select>';
    $('pager').innerHTML =
      '<span class="pinfo">共 ' + S.total + ' 条 · 第 ' + S.page + '/' + totalPages + ' 页</span>' +
      sizeSel +
      '<button id="pgPrev"' + (S.page <= 1 ? ' disabled' : '') + '>上一页</button>' +
      '<button id="pgNext"' + (S.page >= totalPages ? ' disabled' : '') + '>下一页</button>';
    var pv = $('pgPrev'), nx = $('pgNext'), sz = $('pgSize');
    if (pv) pv.onclick = function () { if (S.page > 1) { S.page--; loadList(); } };
    if (nx) nx.onclick = function () { if (S.page < totalPages) { S.page++; loadList(); } };
    if (sz) sz.onchange = function () { S.size = Number(sz.value); S.page = 1; loadList(); };
  }

  // 表格事件委托
  $('tableWrap').addEventListener('click', function (e) {
    var t = e.target;
    var up = t.getAttribute && t.getAttribute('data-upload');
    var ed = t.getAttribute && t.getAttribute('data-edit');
    var dl = t.getAttribute && t.getAttribute('data-del');
    if (up) { uploadFor(Number(up)); return; }
    if (ed) { openForm(Number(ed)); return; }
    if (dl) { deleteOne(Number(dl)); return; }
  });
  $('tableWrap').addEventListener('change', function (e) {
    var cb = e.target;
    if (cb.classList && cb.classList.contains('row-cb')) {
      var id = Number(cb.getAttribute('data-id'));
      if (cb.checked) S.selected[id] = true; else delete S.selected[id];
      updateBatchBar();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'checkAll') {
      var on = e.target.checked;
      S.records.forEach(function (r) { if (on) S.selected[r.id] = true; else delete S.selected[r.id]; });
      var cbs = document.querySelectorAll('.row-cb');
      cbs.forEach(function (c) { c.checked = on; });
      updateBatchBar();
    }
  });

  function updateBatchBar() {
    var ids = Object.keys(S.selected).map(Number);
    $('bbCount').textContent = ids.length;
    $('batchBar').classList.toggle('show', ids.length > 0);
  }

  function deleteOne(id) {
    if (!confirm('确定删除该成果？此操作不可恢复。')) return;
    post('/achievement/delete', { objectIds: [id] })
      .then(function () { toast('删除成功', 'success'); clearSelection(); loadList(); })
      .catch(function (err) { toast('删除失败：' + err.message, 'error'); });
  }
  function batchDelete() {
    var ids = Object.keys(S.selected).map(Number);
    if (!ids.length) return;
    if (!confirm('确定批量删除选中的 ' + ids.length + ' 条成果？')) return;
    post('/achievement/delete', { objectIds: ids })
      .then(function () { toast('已删除 ' + ids.length + ' 条', 'success'); clearSelection(); loadList(); })
      .catch(function (err) { toast('删除失败：' + err.message, 'error'); });
  }
  function clearSelection() { S.selected = {}; updateBatchBar(); }

  // -------------------- 新增 / 编辑 --------------------
  var editId = null;        // 编辑时的成果 ID
  var pendingFile = null;  // 待上传的 File 对象
  var currentFileSrc = ''; // 编辑时已有的附件

  function openForm(id) {
    editId = id || null;
    pendingFile = null;
    currentFileSrc = '';
    $('fmName').value = '';
    $('fmUnits').value = '';
    $('fmCompleter').value = '';
    $('fmExtra').value = '';
    $('fmLevel').value = '';
    $('fmFileHint').textContent = '';
    $('fmDrop').classList.remove('active');

    if (editId) {
      var rec = S.records.filter(function (r) { return r.id === editId; })[0];
      if (rec) {
        $('fmName').value = rec.achievementName || '';
        $('fmCategory').value = rec.achievementCategory || '专利奖';
        $('fmUnits').value = rec.creationUnits || '';
        $('fmCompleter').value = rec.completionPerson || '';
        $('fmLevel').value = rec.expertLevel || '';
        $('fmExtra').value = rec.extraInfo || '';
        currentFileSrc = rec.fileSrc || '';
        $('fmFileHint').textContent = currentFileSrc ? ('当前附件：' + currentFileSrc) : '';
      }
      $('formTitle').textContent = '编辑成果';
    } else {
      $('formTitle').textContent = '成果新增';
    }
    $('formModal').classList.remove('hidden');
  }
  function closeForm() { $('formModal').classList.add('hidden'); editId = null; }

  $('fmDrop').addEventListener('click', function () { $('fmFile').click(); });
  $('fmFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) { alert('仅支持 PDF 格式！'); e.target.value = ''; return; }
    pendingFile = f;
    $('fmDrop').classList.add('active');
    $('fmFileHint').textContent = '已选择：' + f.name;
  });

  function saveForm() {
    var name = $('fmName').value.trim();
    if (!name) { toast('请填写成果名称', 'error'); return; }
    var cat = $('fmCategory').value;
    var units = $('fmUnits').value.trim();
    var completer = $('fmCompleter').value.trim();
    var level = $('fmLevel').value;
    var extra = $('fmExtra').value.trim();

    // 有附件：先上传，再写入 fileSrc
    function doSave(fileSrc) {
      var fd = new FormData();
      fd.append('achievementName', name);
      fd.append('achievementCategory', cat);
      if (units) fd.append('creationUnits', units);
      if (completer) fd.append('completionPerson', completer);
      if (level) fd.append('expertLevel', level);
      if (extra) fd.append('extraInfo', extra);
      fd.append('status', 1);
      if (fileSrc) fd.append('fileSrc', fileSrc);

      var path = editId ? '/achievement/update' : '/achievement/add';
      if (editId) fd.append('id', editId);

      postForm(path, fd)
        .then(function () { toast(editId ? '修改成功' : '新增成功', 'success'); closeForm(); loadList(); })
        .catch(function (err) { toast('保存失败：' + err.message, 'error'); });
    }

    if (pendingFile) {
      var uf = new FormData();
      uf.append('file', pendingFile);
      postForm('/api/upload', uf)
        .then(function (u) { doSave(u.data); })
        .catch(function (err) { toast('附件上传失败：' + err.message, 'error'); });
    } else {
      // 编辑时未换附件 → 保留原有 fileSrc；新增无附件 → 不传 fileSrc
      doSave(editId ? (currentFileSrc || null) : null);
    }
  }

  // -------------------- 附件上传（行内） --------------------
  function uploadFor(id) {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf'; input.style.display = 'none';
    input.onchange = function () {
      var f = input.files[0];
      document.body.removeChild(input);
      if (!f) return;
      if (!f.name.toLowerCase().endsWith('.pdf')) { alert('仅支持 PDF 格式！'); return; }
      var uf = new FormData(); uf.append('file', f);
      toast('附件上传中…', 'info');
      postForm('/api/upload', uf)
        .then(function (u) {
          var fd = new FormData();
          fd.append('id', id);
          fd.append('fileSrc', u.data);
          return postForm('/achievement/update', fd);
        })
        .then(function () { toast('附件已关联', 'success'); loadList(); })
        .catch(function (err) { toast('上传失败：' + err.message, 'error'); });
    };
    document.body.appendChild(input);
    input.click();
  }

  // ====================================================
  //  投票管理
  // ====================================================
  function loadVote() {
    post('/voteRound/current').then(function (cur) {
      S.curRound = cur.data || null;
      return post('/voteRound/getRoundSubmitNum', {}).then(function (num) {
        renderVote(cur.data, num.data);
      });
    }).catch(function (err) {
      $('roundBanner').innerHTML = '<div class="state error" style="padding:18px;">' + ICON.error +
        '<div>加载失败：' + esc(err.message) + '</div></div>';
      $('voteStats').innerHTML = '';
    });
  }

  function renderVote(round, num) {
    num = num || { submitNum: 0, total: 0 };
    var statusText = '未开始', dot = 'idle', sub = '当前没有进行中的投票轮次';
    if (round) {
      if (round.status === 'running') { statusText = '进行中'; dot = 'run'; sub = '第 ' + (round.roundNum || 1) + ' 轮投票正在进行'; }
      else if (round.status === 'finished') { statusText = '已结束'; dot = 'end'; sub = '第 ' + (round.roundNum || 1) + ' 轮投票已结束，可发布结果'; }
    }
    $('roundBanner').innerHTML =
      '<div><div class="rb-title"><span class="dot ' + dot + '"></span>' + statusText + '</div>' +
      '<div class="rb-sub">' + esc(sub) + '</div></div>';

    var pct = num.total > 0 ? Math.round(num.submitNum / num.total * 100) : 0;
    $('voteStats').innerHTML =
      '<div class="stat-card"><div class="label">应参与委员</div>' +
        '<div class="value" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<input type="number" id="totalVotersInput" value="' + (num.total || 0) + '" min="0" style="width:90px;text-align:center;font-size:28px;font-weight:700;background:var(--panel-strong);border:1px solid var(--border);color:var(--accent);border-radius:6px;padding:4px 8px;font-family:inherit;">' +
          '<small>人</small>' +
          '<button id="saveTotalBtn" style="padding:4px 12px;font-size:13px;border-radius:6px;cursor:pointer;background:var(--accent);color:#fff;border:none;font-family:inherit;">保存</button>' +
        '</div></div>' +
      '<div class="stat-card"><div class="label">已提交委员</div><div class="value">' + (num.submitNum || 0) + ' <small>人</small></div></div>' +
      '<div class="stat-card" style="grid-column:1/-1"><div class="label">提交进度</div>' +
        '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div style="font-size:13px;color:var(--text-mute);margin-top:6px;">' + pct + '% 完成</div></div>';

    var btn = $('saveTotalBtn');
    if (btn) btn.onclick = function () {
      var val = parseInt($('totalVotersInput').value, 10);
      if (isNaN(val) || val < 0) { toast('请输入有效的委员人数', 'error'); return; }
      btn.disabled = true; btn.textContent = '保存中…';
      post('/voteRound/setTotalVoters?totalVoters=' + val, {})
        .then(function () { toast('已更新', 'success'); loadVote(); })
        .catch(function (err) { toast('保存失败：' + err.message, 'error'); btn.disabled = false; btn.textContent = '保存'; });
    };
  }

  function startVote() {
    if (!confirm('确定开始新一轮投票？系统将把已提交的成果纳入本轮。')) return;
    post('/voteRound/start', { isFirst: true })
      .then(function (d) { toast(d.msg || '已开始', 'success'); loadVote(); })
      .catch(function (err) { toast('操作失败：' + err.message, 'error'); });
  }
  function stopVote() {
    if (!confirm('确定结束当前投票？结束后委员将无法继续提交。')) return;
    post('/voteRound/stop')
      .then(function (d) { toast(d.msg || '已结束', 'success'); loadVote(); })
      .catch(function (err) { toast('操作失败：' + err.message, 'error'); });
  }
  function resetVote() {
    if (!confirm('确定重置投票？将清空最近一轮的投票记录与结果（已发布的结果不可重置）。')) return;
    post('/voteRound/resetting')
      .then(function (d) { toast(d.msg || '已重置', 'success'); loadVote(); })
      .catch(function (err) { toast('操作失败：' + err.message, 'error'); });
  }
  function publish() {
    if (!confirm('确定发布当前轮次投票结果？发布后委员将看到最终结果。')) return;
    post('/voteResult/push')
      .then(function (d) { toast(d.msg || '已发布', 'success'); })
      .catch(function (err) { toast('操作失败：' + err.message, 'error'); });
  }

  // ====================================================
  //  结果查看
  // ====================================================
  function loadRounds() {
    post('/voteResult/getRoundList').then(function (d) {
      var list = d.data || [];
      if (!list.length) { $('rRound').innerHTML = '<option value="">（暂无轮次）</option>'; return; }
      $('rRound').innerHTML = list.map(function (r) {
        var label = '第 ' + (r.roundNum || r.id) + ' 轮' + (r.status ? '（' + r.status + '）' : '');
        return '<option value="' + r.id + '">' + esc(label) + '</option>';
      }).join('');
      loadResult();
    }).catch(function (err) {
      $('resultWrap').innerHTML = '<div class="state error">' + ICON.error +
        '<div>加载轮次失败：' + esc(err.message) + '</div></div>';
    });
  }

  function loadResult() {
    var rid = $('rRound').value;
    if (!rid) { $('resultWrap').innerHTML = '<div class="state">' + ICON.empty + '<div>暂无轮次数据</div></div>'; return; }
    var onlyPub = $('rPublished').checked;
    $('resultWrap').innerHTML = '<div class="skeleton"><div class="sk-row" style="width:90%"></div><div class="sk-row" style="width:80%"></div></div>';

    var path = onlyPub ? '/voteResult/finalResult' : '/voteResult/eachRoundSituation';
    post(path, { roundId: Number(rid) }).then(function (d) {
      var list = d.data || [];
      renderResult(list);
    }).catch(function (err) {
      $('resultWrap').innerHTML = '<div class="state error">' + ICON.error +
        '<div>加载失败：' + esc(err.message) + '</div></div>';
    });
  }

  function renderResult(list) {
    if (!list.length) {
      $('resultWrap').innerHTML = '<div class="state">' + ICON.empty + '<div>该轮次暂无投票结果</div></div>';
      return;
    }
    var rows = list.map(function (v, i) {
      var lvl = v.voteLevel
        ? '<span class="tag tag-level">' + esc(v.voteLevel) + '</span>' : '<span class="tag tag-none">—</span>';
      return '<tr>' +
        '<td class="col-idx center">' + (i + 1) + '</td>' +
        '<td>' + esc(v.achievementName || '') + '</td>' +
        '<td>' + (v.achievementCategory ? '<span class="tag tag-cat">' + esc(v.achievementCategory) + '</span>' : '—') + '</td>' +
        '<td>' + (v.creationUnits ? esc(v.creationUnits) : '—') + '</td>' +
        '<td>' + (v.completionPerson ? esc(v.completionPerson) : '—') + '</td>' +
        '<td>' + (v.expertLevel ? esc(v.expertLevel) : '—') + '</td>' +
        '<td class="center">' + (v.agree || 0) + '</td>' +
        '<td class="center">' + (v.disagree || 0) + '</td>' +
        '<td class="center">' + (v.abstain || 0) + '</td>' +
        '<td class="center">' + (v.totalVoters || 0) + '</td>' +
        '<td class="center">' + (v.agreeRatio || '0%') + '</td>' +
        '<td>' + lvl + '</td>' +
      '</tr>';
    }).join('');
    $('resultWrap').innerHTML =
      '<table class="data"><thead><tr>' +
        '<th class="col-idx">序号</th><th>成果名称</th><th>类别</th><th>完成单位</th><th>完成人</th>' +
        '<th>推荐等级</th><th class="center">同意</th><th class="center">不同意</th>' +
        '<th class="center">弃权</th><th class="center">总票数</th><th class="center">同意占比</th>' +
        '<th>最终授奖</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function exportExcel() {
    var rid = $('rRound').value;
    if (!rid) { toast('请先选择轮次', 'error'); return; }
    fetch('/voteResult/exportStatistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: Number(rid) })
    }).then(function (r) {
      if (!r.ok) throw new Error('导出失败');
      return r.blob();
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '投票统计结果.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('导出成功', 'success');
    }).catch(function (err) { toast('导出失败：' + (err.message || ''), 'error'); });
  }

  // ====================================================
  //  Tab 切换
  // ====================================================
  function switchTab(view) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === view);
    });
    $('view-manage').classList.toggle('hidden', view !== 'manage');
    $('view-vote').classList.toggle('hidden', view !== 'vote');
    $('view-result').classList.toggle('hidden', view !== 'result');

    // 重新触发进入动画
    var sec = $('view-' + view);
    sec.classList.remove('view'); void sec.offsetWidth; sec.classList.add('view');

    if (view === 'manage') loadList();
    else if (view === 'vote') loadVote();
    else if (view === 'result') loadRounds();
  }

  // ====================================================
  //  事件绑定 & 初始化
  // ====================================================
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchTab(t.getAttribute('data-view')); });
  });

  $('btnSearch').addEventListener('click', function () {
    S.category = $('fCategory').value; S.level = $('fLevel').value;
    S.name = $('fName').value.trim(); S.page = 1; loadList();
  });
  $('fName').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btnSearch').click(); });
  $('btnReset').addEventListener('click', function () {
    $('fCategory').value = ''; $('fLevel').value = ''; $('fName').value = '';
    S.category = ''; S.level = ''; S.name = ''; S.page = 1; loadList();
  });
  $('btnAdd').addEventListener('click', function () { openForm(null); });

  $('bbDelete').addEventListener('click', batchDelete);
  $('bbClear').addEventListener('click', function () { clearSelection(); document.querySelectorAll('.row-cb').forEach(function (c) { c.checked = false; }); });

  $('formClose').addEventListener('click', closeForm);
  $('formCancel').addEventListener('click', closeForm);
  $('formSave').addEventListener('click', saveForm);
  $('formModal').addEventListener('click', function (e) { if (e.target === this) closeForm(); });

  $('btnStart').addEventListener('click', startVote);
  $('btnStop').addEventListener('click', stopVote);
  $('btnResetVote').addEventListener('click', resetVote);
  $('btnPublish').addEventListener('click', publish);

  $('btnLoadResult').addEventListener('click', loadResult);
  $('rPublished').addEventListener('change', loadResult);
  $('btnExport').addEventListener('click', exportExcel);

  // 初始加载
  loadList();
})();
