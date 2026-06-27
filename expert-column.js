/**
 * 成果管理表 — 按指定顺序重排：序号、成果类别、成果名称、推荐单位(部门)、专家评审推荐、操作
 * 其余列隐藏
 */
(function() {
  'use strict';

  var API = window._$base_url || 'http://localhost:7003';

  // 期望的列顺序（表头文字匹配）
  var ORDER = ['序号', '成果类别', '成果名称', '推荐单位(部门)', '专家评审推荐', '操作'];

  function getText(el) { return (el.textContent || '').replace(/\s+/g, ''); }

  function matchHeader(th) {
    var txt = getText(th);
    // 申报单位 → 推荐单位(部门)
    if (txt.indexOf('申报单位') > -1 || txt.indexOf('创建单位') > -1 || txt.indexOf('推荐单位') > -1) return '推荐单位(部门)';
    for (var i = 0; i < ORDER.length; i++) {
      if (txt.indexOf(ORDER[i]) > -1) return ORDER[i];
    }
    return null;
  }

  function reorder() {
    var injected = false;

    document.querySelectorAll('.el-table table').forEach(function(tbl) {
      var hr = tbl.querySelector('thead tr');
      if (!hr) return;

      // --- 分析表头，建索引映射 ---
      var ths = Array.from(hr.querySelectorAll('th'));
      var headerMap = {}; // colName → { idx, el }
      ths.forEach(function(th, i) {
        var name = matchHeader(th);
        if (name) headerMap[name] = { idx: i, el: th };
      });

      // --- 重排 thead ---
      var reordered = [];
      ORDER.forEach(function(name) {
        if (headerMap[name]) reordered.push(headerMap[name].el);
        else if (name === '专家评审推荐') {
          // 如果表头中不存在专家评审推荐，注入一个
          var newTh = document.createElement('th');
          newTh.className = 'wb-exp-th';
          newTh.innerHTML = '<div class="cell">专家评审推荐</div>';
          newTh.setAttribute('data-col', 'expertReview');
          hr.appendChild(newTh);
          reordered.push(newTh);
          injected = true;
        }
      });

      // 其余列放最后（隐藏）
      var hidden = [];
      ths.forEach(function(th) {
        if (reordered.indexOf(th) < 0 && !th.classList.contains('wb-cb-th')) {
          hidden.push(th);
        }
      });

      // 重排：先放reordered，再放hidden
      var allOrdered = [];
      // 保留全选 th
      var selectTh = hr.querySelector('.wb-cb-th, .batch-cb-header');
      if (selectTh) allOrdered.push(selectTh);

      reordered.forEach(function(th) { allOrdered.push(th); });
      hidden.forEach(function(th) { allOrdered.push(th); });

      // 重新插入
      allOrdered.forEach(function(th) { hr.appendChild(th); });

      // 隐藏不需要的列
      hidden.forEach(function(th) { th.style.display = 'none'; });
      // 显示需要的列
      reordered.forEach(function(th) { th.style.display = ''; });
      if (selectTh) selectTh.style.display = '';

      // --- 重排 tbody 行 ---
      tbl.querySelectorAll('tbody tr').forEach(function(row) {
        var tds = Array.from(row.querySelectorAll('td'));

        // 按表头顺序重排 tds
        var orderedTds = [];
        var selectTd = row.querySelector('.batch-cb-cell');
        if (selectTd) orderedTds.push(selectTd);

        for (var i = 0; i < reordered.length; i++) {
          var thName = getText(reordered[i]);
          // 通过列文本匹配找对应 td
          // 策略：tds 顺序与 ths 顺序一致
          var origIdx = ths.indexOf(reordered[i]);
          if (origIdx >= 0 && origIdx < tds.length) {
            orderedTds.push(tds[origIdx]);
          } else if (reordered[i].classList.contains('wb-exp-th')) {
            // 新注入的专家评审推荐列
            var recIdx = Array.from(row.parentElement.querySelectorAll('tr')).indexOf(row);
            orderedTds.push(makeExpTd(recIdx));
            injected = true;
          }
        }

        // 剩余 tds（隐藏）
        var used = new Set(orderedTds);
        tds.forEach(function(td) {
          if (!used.has(td)) {
            orderedTds.push(td);
            td.style.display = 'none';
          }
        });

        orderedTds.forEach(function(td, i) {
          if (reordered.indexOf(ths[i]) < 0 && !td.classList.contains('batch-cb-cell') && !td.classList.contains('wb-exp-td')) {
            td.style.display = 'none';
          } else {
            td.style.display = '';
          }
          row.appendChild(td);
        });
      });

      // --- 重排 colgroup ---
      var cg = tbl.querySelector('colgroup');
      if (cg) {
        var cols = Array.from(cg.querySelectorAll('col'));
        var selectCol = cg.querySelector('.wb-cb-col, .batch-cb-col');

        var orderedCols = [];
        if (selectCol) orderedCols.push(selectCol);

        for (var j = 0; j < reordered.length; j++) {
          var oi = ths.indexOf(reordered[j]);
          if (oi >= 0 && oi < cols.length) {
            orderedCols.push(cols[oi]);
          } else if (reordered[j].classList.contains('wb-exp-th')) {
            var expCol = document.createElement('col');
            expCol.className = 'wb-exp-col';
            expCol.setAttribute('width', '110');
            expCol.style.cssText = 'width:110px;';
            orderedCols.push(expCol);
          }
        }

        var usedC = new Set(orderedCols);
        cols.forEach(function(c) {
          if (!usedC.has(c)) orderedCols.push(c);
        });

        orderedCols.forEach(function(c) { cg.appendChild(c); });
      }
    });

    if (injected) {
      // 数据到了回填专家评审推荐
      setTimeout(fillExpert, 300);
    }
  }

  var cachedRecords = [];

  function fillExpert() {
    fetch(API + '/achievement/page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageNum: 1, pageSize: 200 })
    }).then(function(r) { return r.json(); }).then(function(d) {
      cachedRecords = (d && d.data && d.data.records) || [];
      document.querySelectorAll('.el-table__body-wrapper tbody tr').forEach(function(row, i) {
        var td = row.querySelector('.wb-exp-td');
        if (!td) return;
        var rec = cachedRecords[i];
        var cell = td.querySelector('.cell');
        if (cell && rec) {
          cell.textContent = rec.expertLevel || '—';
        }
      });
    }).catch(function() {});
  }

  function makeExpTd(idx) {
    var rec = cachedRecords[idx];
    var val = (rec && rec.expertLevel) ? rec.expertLevel : '—';
    var td = document.createElement('td');
    td.className = 'wb-exp-td';
    td.innerHTML = '<div class="cell">' + val + '</div>';
    return td;
  }

  // 定时重试
  var tid = setInterval(reorder, 1500);
  setTimeout(function() { clearInterval(tid); reorder(); fillExpert(); }, 30000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(reorder, 800); });
  } else {
    setTimeout(reorder, 800);
  }
})();
