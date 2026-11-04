/* ═══════════════════════════════════════════════════════════════
   panels.js — 뷰어의 좌·우 패널을 접어 3D 화면을 넓힙니다.

   주입 측에서 먼저 선언:
     window.LOKHUR_PANELS = { left:"#rail", right:"#side" };

   · 화면 우하단 토글, 단축키 [ ] \
   · URL  ?panels=both|left|right|none  (초기 상태)
   · 비교 화면(부모 창)에서 postMessage 로 원격 제어
   기존 뷰어의 DOM·전역 변수는 건드리지 않습니다.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.LOKHUR_PANELS || {};
  var L = CFG.left ? document.querySelector(CFG.left) : null;
  var R = CFG.right ? document.querySelector(CFG.right) : null;
  if (!L && !R) return;

  var prev = {};               // 원래 display 값 보관
  [['l', L], ['r', R]].forEach(function (p) {
    if (p[1]) prev[p[0]] = p[1].style.display || '';
  });

  var on = { l: true, r: true };

  /* ── 스타일 (각 뷰어 CSS 와 겹치지 않는 접두사) ────────── */
  var css = document.createElement('style');
  css.textContent =
    '.lkp-bar{position:fixed;right:12px;bottom:12px;z-index:99980;display:flex;gap:0;' +
    'border:1px solid rgba(128,128,128,.45);border-radius:4px;overflow:hidden;' +
    'box-shadow:0 2px 10px rgba(0,0,0,.28);font:600 11px/1 "Malgun Gothic",' +
    '"Apple SD Gothic Neo",system-ui,sans-serif;background:rgba(255,255,255,.94);' +
    'backdrop-filter:blur(3px)}' +
    '.lkp-bar button{appearance:none;-webkit-appearance:none;margin:0;' +
    'border:0;border-right:1px solid rgba(128,128,128,.32);' +
    'background:transparent;color:#4a5159;padding:6px 9px;cursor:pointer;' +
    'font:inherit;letter-spacing:-.2px;line-height:1;white-space:nowrap}' +
    '.lkp-bar button:last-child{border-right:0}' +
    '.lkp-bar button:hover{background:rgba(0,0,0,.07)}' +
    '.lkp-bar button.lkp-off{background:#2b3139;color:#fff}' +
    '.lkp-bar button:focus-visible{outline:2px solid #3d7fe0;outline-offset:-2px}' +
    '@media (max-width:700px){.lkp-bar{display:none}}';
  document.head.appendChild(css);

  /* ── 적용 ────────────────────────────────────────────── */
  function apply(fire) {
    if (L) L.style.display = on.l ? prev.l : 'none';
    if (R) R.style.display = on.r ? prev.r : 'none';
    if (bL) { bL.className = on.l ? '' : 'lkp-off'; bL.title = (on.l ? '좌측 패널 숨기기' : '좌측 패널 보이기') + ' ( [ )'; }
    if (bR) { bR.className = on.r ? '' : 'lkp-off'; bR.title = (on.r ? '우측 패널 숨기기' : '우측 패널 보이기') + ' ( ] )'; }
    // 캔버스 재계산 — 뷰어마다 resize 처리 방식이 달라 두 번 보냅니다.
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    setTimeout(function () {
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }, 80);
    if (fire !== false) report();
  }

  function report() {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          { type: 'lokhur-panels-state', left: on.l, right: on.r }, '*');
      } catch (e) {}
    }
  }

  /* ── 토글 바 ─────────────────────────────────────────── */
  var bar = document.createElement('div');
  bar.className = 'lkp-bar';
  var bL = null, bR = null;

  function mk(label, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', fn);
    bar.appendChild(b);
    return b;
  }

  if (L) bL = mk('◧ 좌', function () { on.l = !on.l; apply(); });
  if (R) bR = mk('우 ◨', function () { on.r = !on.r; apply(); });
  mk('⤢ 넓게', function () {
    var anyOn = (L && on.l) || (R && on.r);
    on.l = on.r = !anyOn;
    apply();
  });

  document.body.appendChild(bar);

  /* ── 단축키 ──────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === '[') { on.l = !on.l; apply(); }
    else if (e.key === ']') { on.r = !on.r; apply(); }
    else if (e.key === '\\') {
      var anyOn = (L && on.l) || (R && on.r);
      on.l = on.r = !anyOn; apply();
    }
  });

  /* ── 부모 창 제어 ────────────────────────────────────── */
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'lokhur-panels') return;
    if (typeof d.left === 'boolean') on.l = d.left;
    if (typeof d.right === 'boolean') on.r = d.right;
    apply(false);
    report();
  });

  /* ── 초기 상태 (URL) ─────────────────────────────────── */
  var m = /[?&]panels=(both|left|right|none)/.exec(location.search);
  if (m) {
    on.l = (m[1] === 'both' || m[1] === 'left');
    on.r = (m[1] === 'both' || m[1] === 'right');
  }
  apply(false);
  report();

  window.LokhurPanels = {
    set: function (l, r) { on.l = l; on.r = r; apply(); },
    get: function () { return { left: on.l, right: on.r }; }
  };
})();
