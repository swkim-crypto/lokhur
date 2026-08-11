/* ═══════════════════════════════════════════════════════════════
   docviewer.js — 3D 뷰어에 검토자료 버튼 · 모달을 붙입니다.

   주입 측에서 먼저 선언:
     window.LOKHUR_DOC = { site:"lokhur-0", label:"로후르-0", mount:"header" };

   docs/<site>/manifest.json 을 읽어 버튼을 만듭니다.
   문서가 늘어나면 manifest.json 에 항목만 추가하면 됩니다.
   기존 뷰어의 전역 변수(STATE·VIEW·EV 등)는 건드리지 않습니다.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.LOKHUR_DOC || {};
  var SITE = CFG.site || '';
  var BASE = CFG.base || ('../docs/' + SITE + '/');
  var docs = [], mod = null, ov = null, panes = [], tabs = [], loaded = {}, lastFocus = null;

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* ── 매니페스트 ─────────────────────────────────────────── */
  function boot() {
    fetch(BASE + 'manifest.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (m) {
        docs = (m && m.documents) || [];
        if (docs.length) mountButton(m);
      })
      .catch(function (e) {
        // file:// 로 열면 fetch 가 막힙니다. 버튼은 만들되 안내를 띄웁니다.
        docs = [];
        mountButton({ label: CFG.label, error: String(e && e.message || e) });
      });
  }

  /* ── 버튼 ───────────────────────────────────────────────────
     <button>이 아니라 <span role="button">을 씁니다.
     뷰어마다 «#modeBar button» 같은 ID 선택자가 있어서
     <button>으로 만들면 기존 규칙에 덮입니다. */
  function mountButton(m) {
    var b = el('span', 'dk-btn');
    b.setAttribute('role', 'button');
    b.setAttribute('tabindex', '0');
    b.setAttribute('aria-haspopup', 'dialog');
    b.appendChild(document.createTextNode('검토자료'));
    if (docs.length) b.appendChild(el('span', 'dk-n', String(docs.length)));

    b.addEventListener('click', function () { open(0); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); open(0);
      }
    });

    var host = CFG.mount ? document.querySelector(CFG.mount) : null;
    if (host) {
      if (CFG.push !== false) b.style.marginLeft = 'auto';
      host.appendChild(b);
    } else {
      b.classList.add('dk-float');   // 마운트 지점이 없으면 우하단 고정
      document.body.appendChild(b);
    }
    build(m);
  }

  /* ── 모달 조립 ──────────────────────────────────────────── */
  function build(m) {
    ov = el('div', 'dk-ov');
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });

    mod = el('div', 'dk-modal');
    mod.setAttribute('role', 'dialog');
    mod.setAttribute('aria-modal', 'true');
    mod.setAttribute('aria-label', (CFG.label || '') + ' 검토자료');

    var hd = el('div', 'dk-hd');
    hd.appendChild(el('span', 'dk-ttl', (m.label || CFG.label || '') + ' 검토자료'));
    hd.appendChild(el('span', 'dk-sub', m.updated ? '갱신 ' + m.updated : ''));

    var tb = el('div', 'dk-tabs');
    docs.forEach(function (d, i) {
      var t = el('button', 'dk-tab', d.title || ('문서 ' + (i + 1)));
      t.type = 'button';
      t.addEventListener('click', function () { show(i); });
      tabs.push(t); tb.appendChild(t);
    });
    hd.appendChild(tb);

    var x = el('button', 'dk-x', '\u00d7');
    x.type = 'button'; x.title = '닫기 (Esc)';
    x.setAttribute('aria-label', '닫기');
    x.addEventListener('click', close);
    hd.appendChild(x);
    mod.appendChild(hd);

    var bar = el('div', 'dk-bar');
    bar.appendChild(el('span', 'dk-note', ''));
    mod.appendChild(bar);

    var body = el('div', 'dk-body');
    mod.appendChild(body);

    if (!docs.length) {
      var msg = el('div', 'dk-msg');
      msg.innerHTML = '검토자료 목록을 읽지 못했습니다.<br>'
        + '이 페이지는 웹서버에서 열어야 합니다. 파일을 직접 열면 브라우저가 목록 조회를 차단합니다.<br>'
        + '<code>python3 serve.py</code> 실행 후 <code>http://localhost:8800/</code> 으로 접속하십시오.';
      body.appendChild(msg);
    }

    docs.forEach(function (d) {
      var p = el('div', 'dk-pane');
      panes.push(p); body.appendChild(p);
    });

    ov.appendChild(mod);
    document.body.appendChild(ov);
    mod._bar = bar;

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('dk-on')) { e.stopPropagation(); close(); }
    }, true);
  }

  /* ── 탭 전환 · 지연 로딩 ────────────────────────────────── */
  function show(i) {
    tabs.forEach(function (t, k) {
      t.classList.toggle('dk-on', k === i);
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
    });
    panes.forEach(function (p, k) { p.classList.toggle('dk-on', k === i); });
    var d = docs[i];
    if (!d) return;
    drawBar(d);
    if (!loaded[i]) { loaded[i] = true; load(i, d); }
  }

  function drawBar(d) {
    var bar = mod._bar;
    bar.innerHTML = '';
    bar.appendChild(el('span', 'dk-note', d.note || ''));
    var open_ = el('a', 'dk-lnk', '새 탭으로 열기');
    open_.href = BASE + d.file; open_.target = '_blank'; open_.rel = 'noopener';
    bar.appendChild(open_);
    var dl = el('a', 'dk-lnk', d.download ? '원본 내려받기 (' + ext(d.download) + ')' : '내려받기');
    dl.href = BASE + (d.download || d.file);
    dl.setAttribute('download', '');
    bar.appendChild(dl);
  }

  function ext(f) { var i = f.lastIndexOf('.'); return i < 0 ? '' : f.slice(i + 1).toUpperCase(); }

  function load(i, d) {
    var p = panes[i];
    if (d.type === 'pdf') {
      var fr = document.createElement('iframe');
      fr.src = BASE + d.file + '#view=FitH';
      fr.title = d.title || 'PDF';
      p.appendChild(fr);
      // iOS Safari 등 iframe PDF 미지원 환경 대비 안내를 뒤에 깔아둡니다.
      var fb = el('div', 'dk-msg');
      fb.style.zIndex = '-1';
      fb.innerHTML = 'PDF가 표시되지 않으면 위의 <b>새 탭으로 열기</b>를 누르십시오.';
      p.insertBefore(fb, fr);
      return;
    }
    if (d.type === 'html') {
      var sc = el('div', 'dk-scroll');
      var doc = el('div', 'dk-doc');
      doc.innerHTML = '<p style="color:#888">불러오는 중…</p>';
      sc.appendChild(doc); p.appendChild(sc);
      fetch(BASE + d.file, { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (h) { doc.innerHTML = h; })
        .catch(function (e) {
          doc.innerHTML = '<p>본문을 불러오지 못했습니다 (' + String(e.message || e) + ').'
            + ' 위의 <b>원본 내려받기</b>로 받아 보십시오.</p>';
        });
      return;
    }
    var m2 = el('div', 'dk-msg');
    m2.innerHTML = '이 형식은 브라우저에서 바로 볼 수 없습니다.<br>'
      + '위의 <b>원본 내려받기</b>를 누르십시오.';
    p.appendChild(m2);
  }

  /* ── 열기 · 닫기 ────────────────────────────────────────── */
  function open(i) {
    lastFocus = document.activeElement;
    ov.classList.add('dk-on');
    if (docs.length) show(i);
    var f = mod.querySelector('.dk-tab,.dk-x');
    if (f) f.focus();
  }
  function close() {
    ov.classList.remove('dk-on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.LokhurDocs = { open: open, close: close };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
