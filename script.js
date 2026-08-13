/* ============================================================
   МАЭСТРО — поведение главной страницы
   Одна подписная интеракция: сцена глубины.
   Инструмент живёт в 3D, свет идёт за курсором и вскрывает
   детали, типографика расходится вокруг на разных скоростях.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- 1. Вход лесенкой ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-in'); });
  });

  /* ---------- 2. Навигация ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var onNav = function () { nav.classList.toggle('is-stuck', window.scrollY > 40); };
    onNav();
    window.addEventListener('scroll', onNav, { passive: true });
  }

  var burger = document.querySelector('.burger');
  var menu   = document.querySelector('.menu');
  if (burger && menu) {
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ---------- 3. Появление секций по скроллу ---------- */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var group = el.parentElement;
          var sibs = group ? [].slice.call(group.children).filter(function (n) {
            return n.classList.contains('reveal');
          }) : [];
          var i = Math.max(0, sibs.indexOf(el));
          el.style.setProperty('--rd', Math.min(i, 6) * 90 + 'ms');
          el.classList.add('is-vis');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-vis'); });
    }
  }

  /* ---------- 4. Магнитные кнопки ---------- */
  if (fine.matches && !reduce.matches) {
    [].slice.call(document.querySelectorAll('[data-magnet]')).forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.transform = 'translate3d(' + (dx * 10).toFixed(2) + 'px,' + (dy * 6).toFixed(2) + 'px,0)';
      }, { passive: true });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; }, { passive: true });
    });
  }

  /* ---------- 5. Сцена глубины ---------- */
  var stage  = document.querySelector('[data-stage]');
  var object = document.querySelector('[data-object]');
  var obj    = document.querySelector('[data-obj]');
  var lit    = document.querySelector('[data-lit]');
  var glow   = document.querySelector('[data-glow]');
  var pool   = document.querySelector('[data-pool]');
  var dust   = document.querySelector('[data-dust]');
  var panel  = document.querySelector('[data-panel]');
  var hint   = document.querySelector('[data-hint]');
  var wTop   = document.querySelector('[data-word="top"]');
  var wBot   = document.querySelector('[data-word="bot"]');
  var hero   = document.querySelector('.hero');

  /* пылинки в световом столбе — 14 штук, разные скорости */
  if (dust && !reduce.matches) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 14; i++) {
      var d = document.createElement('span');
      d.className = 'dust';
      d.style.left = (30 + Math.random() * 40).toFixed(1) + '%';
      d.style.top  = (34 + Math.random() * 44).toFixed(1) + '%';
      d.style.setProperty('--dur', (16 + Math.random() * 14).toFixed(1) + 's');
      d.style.setProperty('--del', (-Math.random() * 22).toFixed(1) + 's');
      d.style.setProperty('--dx', (Math.random() * 44 - 22).toFixed(0) + 'px');
      d.style.setProperty('--op', (0.14 + Math.random() * 0.24).toFixed(2));
      frag.appendChild(d);
    }
    dust.appendChild(frag);
  }

  if (!stage || !object || !hero) return;

  /* при отключённой анимации инструмент просто освещён и подписан */
  if (reduce.matches) {
    stage.classList.add('is-lit');
    return;
  }

  var px = 0, py = 0;    /* цель курсора  -1..1 */
  var cx = 0, cy = 0;    /* сглаженное значение */
  var mx = 50, my = 46;  /* позиция света внутри кадра, % */
  var tx = 50, ty = 46;
  var scroll = 0;
  var visible = true;
  var ticking = false;
  var touched = false;

  if (fine.matches) {
    window.addEventListener('pointermove', function (e) {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = (e.clientY / window.innerHeight) * 2 - 1;
      if (obj) {
        var r = obj.getBoundingClientRect();
        if (r.width && r.height) {
          tx = ((e.clientX - r.left) / r.width) * 100;
          ty = ((e.clientY - r.top) / r.height) * 100;
        }
      }
    }, { passive: true });

    window.addEventListener('pointerleave', function () { px = 0; py = 0; }, { passive: true });

    /* свет включается, когда курсор входит в кадр сцены */
    stage.addEventListener('pointerenter', function () {
      stage.classList.add('is-lit');
      document.body.classList.add('cue-off');
    });
    stage.addEventListener('pointerleave', function () {
      stage.classList.remove('is-lit');
    });
  } else {
    /* без мыши: свет всё равно живёт — его ведёт скролл */
    touched = true;
    stage.classList.add('is-lit');
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) loop();
    }, { rootMargin: '10% 0px' }).observe(hero);
  }

  function readScroll() {
    var r = hero.getBoundingClientRect();
    var travel = hero.offsetHeight - window.innerHeight;
    scroll = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
  }

  function loop() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(function step() {
      ticking = false;
      readScroll();

      /* сглаживание курсора — пружина без библиотеки */
      cx += (px - cx) * 0.075;
      cy += (py - cy) * 0.075;

      var p = scroll;
      var ease = p * p * (3 - 2 * p);          /* smoothstep */

      /* инструмент: приближается, доворачивается, уходит вглубь кадра */
      var rotY = (-8 + ease * 14) + cx * 4.8;
      var rotX = (2 - ease * 4.5) - cy * 3.0;
      object.style.transform =
        'translate(-50%,-50%)' +
        ' translate3d(' + (cx * -24 - ease * 8) + 'px,' + (cy * -16 - ease * 38) + 'px,' + (ease * 120) + 'px)' +
        ' rotateY(' + rotY.toFixed(2) + 'deg) rotateX(' + rotX.toFixed(2) + 'deg)' +
        ' scale(' + (1 + ease * 0.12).toFixed(3) + ')';

      /* свет по кадру: за курсором, а без мыши — сверху вниз по скроллу */
      if (touched) { tx = 46; ty = 14 + p * 62; }
      mx += (tx - mx) * 0.10;
      my += (ty - my) * 0.10;
      if (lit) {
        lit.style.setProperty('--mx', mx.toFixed(1) + '%');
        lit.style.setProperty('--my', my.toFixed(1) + '%');
      }

      /* типографика расходится медленнее объекта — отсюда глубина */
      if (wTop) wTop.style.transform =
        'translate3d(' + (cx * 16 - ease * 30) + 'px,' + (-ease * 112 + cy * 10) + 'px,0)';
      if (wBot) wBot.style.transform =
        'translate3d(' + (cx * 16 + ease * 30) + 'px,' + (ease * 112 + cy * 10) + 'px,0)';

      /* свет и лужа — самые медленные слои */
      if (glow) glow.style.transform =
        'translate(-50%,-50%) translate3d(' + (cx * 38) + 'px,' + (cy * 28 - ease * 26) + 'px,0)' +
        ' scale(' + (1 + ease * 0.28).toFixed(3) + ')';
      if (pool) {
        pool.style.transform =
          'translate(-50%,-50%) translate3d(' + (cx * 16) + 'px,' + (ease * 26) + 'px,0)' +
          ' scale(' + (1 - ease * 0.18).toFixed(3) + ',' + (1 - ease * 0.3).toFixed(3) + ')';
        pool.style.opacity = (1 - ease * 0.55).toFixed(3);
      }

      /* панель и подсказка уходят, освобождая кадр */
      var fade = Math.max(0, 1 - Math.max(0, p - 0.34) / 0.26);
      if (panel) {
        panel.style.opacity = fade;
        panel.style.transform = 'translate3d(0,' + ((1 - fade) * 26).toFixed(1) + 'px,0)';
        panel.style.pointerEvents = fade < 0.08 ? 'none' : '';
      }
      if (hint) hint.style.opacity = Math.max(0, 1 - p / 0.16);

      if (visible) loop();
    });
  }

  loop();
})();
