/* =========================================================
   PEAK Performance — main.js
   اللغة، الثيم، الأنيميشن، الأسعار، حاسبة BMI، فورم واتساب
   ========================================================= */
(function () {
  'use strict';

  /* ===== الإعدادات: غيّر رقم واتساب هنا فقط (بصيغة دولية بدون +) ===== */
  var CONFIG = { whatsapp: '201000000000' };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var lang = root.lang === 'en' ? 'en' : 'ar';
  var t = function (key) {
    var dict = window.TRANSLATIONS[lang] || {};
    return dict[key] !== undefined ? dict[key] : key;
  };

  /* ---------- الشريط المتحرك: نكرّر المحتوى قبل الترجمة ---------- */
  var track = $('.marquee-track');
  if (track) track.innerHTML += track.innerHTML;

  /* ---------- الثيم ---------- */
  function setTheme(th) {
    root.setAttribute('data-theme', th);
    store.set('peak-theme', th);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th === 'dark' ? '#0a0a0c' : '#f6f7f1');
  }
  $('#themeBtn').addEventListener('click', function () {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ---------- اللغة ---------- */
  function applyLang(l, persist) {
    lang = l;
    root.lang = l;
    root.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (persist) store.set('peak-lang', l);

    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-i18n-alt]').forEach(function (el) { el.setAttribute('alt', t(el.dataset.i18nAlt)); });

    document.title = t('meta.title');
    var md = $('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta.desc'));

    clearErrors();
    renderPrices(false);
    renderBmi();
  }
  $('#langBtn').addEventListener('click', function () {
    applyLang(lang === 'ar' ? 'en' : 'ar', true);
  });

  /* ---------- عدّادات الأرقام ---------- */
  function countTo(el, to, dur) {
    var from = parseFloat(String(el.textContent).replace(/[^\d.-]/g, '')) || 0;
    var suffix = el.dataset.suffix || '';
    var start = performance.now();
    dur = dur || 1200;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var counterIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      var to = +el.dataset.count;
      if (reduceMotion) el.textContent = to + (el.dataset.suffix || '');
      else countTo(el, to, 1400);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { counterIO.observe(el); });

  /* ---------- Reveal عند السكرول ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  var revealStarted = false;
  function startReveal() {
    if (revealStarted) return;
    revealStarted = true;
    $$('.reveal').forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- Preloader ---------- */
  var pre = $('#preloader');
  function hidePreloader() {
    if (pre) pre.classList.add('hide');
    setTimeout(startReveal, 250);
  }
  window.addEventListener('load', function () { setTimeout(hidePreloader, reduceMotion ? 0 : 500); });
  setTimeout(hidePreloader, 3000); // أمان لو الصفحة اتأخرت

  /* ---------- Nav / progress / back to top ---------- */
  var nav = $('#nav'), progress = $('#progress'), toTop = $('#toTop');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('scrolled', y > 24);
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    toTop.classList.toggle('show', y > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- القائمة على الموبايل ---------- */
  var burger = $('#burger'), navLinks = $('#navLinks');
  function closeMenu() { navLinks.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', function () {
    var open = navLinks.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', navLinks).forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* ---------- تمييز الرابط النشط ---------- */
  var linkMap = {};
  $$('a', navLinks).forEach(function (a) { linkMap[a.getAttribute('href').slice(1)] = a; });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      Object.keys(linkMap).forEach(function (k) { linkMap[k].classList.remove('active'); });
      if (linkMap[en.target.id]) linkMap[en.target.id].classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(linkMap).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });

  /* ---------- Tilt للصور (على الأجهزة اللي فيها ماوس) ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateY(' + (x * 9) + 'deg) rotateX(' + (-y * 9) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- سلايدر قبل / بعد ---------- */
  var ba = $('#baSlider'), baRange = $('#baRange');
  if (ba && baRange) {
    var setPos = function () { ba.style.setProperty('--pos', baRange.value + '%'); };
    baRange.addEventListener('input', setPos);
    setPos();
    // حركة تعريفية صغيرة أول ما يظهر
    if (!reduceMotion) {
      var demoIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        demoIO.disconnect();
        var t0 = performance.now();
        (function demo(now) {
          var p = Math.min(1, (now - t0) / 1600);
          baRange.value = 50 + Math.sin(p * Math.PI * 2) * 22;
          setPos();
          if (p < 1) requestAnimationFrame(demo); else { baRange.value = 50; setPos(); }
        })(t0);
      }, { threshold: 0.6 });
      demoIO.observe(ba);
    }
  }

  /* ---------- آراء العملاء ---------- */
  var slides = $$('.t-slide'), dotsBox = $('#tDots'), tIndex = 0, tTimer = null;
  function showSlide(i) {
    tIndex = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle('active', n === tIndex); });
    $$('button', dotsBox).forEach(function (d, n) { d.classList.toggle('active', n === tIndex); });
  }
  slides.forEach(function (_, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', String(n + 1));
    b.addEventListener('click', function () { showSlide(n); restartAuto(); });
    dotsBox.appendChild(b);
  });
  function restartAuto() {
    clearInterval(tTimer);
    if (!reduceMotion) tTimer = setInterval(function () { showSlide(tIndex + 1); }, 6000);
  }
  var tWrap = $('.t-wrap');
  tWrap.addEventListener('mouseenter', function () { clearInterval(tTimer); });
  tWrap.addEventListener('mouseleave', restartAuto);
  showSlide(0);
  restartAuto();

  /* ---------- الأسعار (شهري / 3 شهور) ---------- */
  var billing = 'monthly';
  function priceFor(base) {
    return billing === 'monthly' ? base : Math.round((base * 0.85) / 10) * 10;
  }
  function renderPrices(animate) {
    $$('.price-num').forEach(function (el) {
      var to = priceFor(+el.dataset.base);
      if (animate && !reduceMotion) countTo(el, to, 700);
      else el.textContent = to.toLocaleString('en-US');
      var note = el.closest('.plan').querySelector('.price-note');
      note.textContent = billing === 'quarter'
        ? t('price.note').replace('{n}', (to * 3).toLocaleString('en-US'))
        : '';
    });
  }
  $$('[data-billing]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      billing = btn.dataset.billing;
      $$('[data-billing]').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderPrices(true);
    });
  });
  $$('.plan-choose').forEach(function (a) {
    a.addEventListener('click', function () { $('#fPlan').value = a.dataset.plan; });
  });

  /* ---------- حاسبة BMI ---------- */
  var lastBmi = null;
  function bmiCategory(v) {
    if (v < 18.5) return 'under';
    if (v < 25) return 'normal';
    if (v < 30) return 'over';
    return 'obese';
  }
  function renderBmi() {
    var box = $('#bmiResult');
    if (!lastBmi) { box.hidden = true; return; }
    var cat = bmiCategory(lastBmi);
    $('#bmiVal').textContent = lastBmi.toFixed(1);
    $('#bmiCat').textContent = t('cat.' + cat);
    $('#bmiTip').textContent = t('tip.' + cat);
    var pos = Math.max(0, Math.min(1, (lastBmi - 15) / 25)) * 100;
    $('#bmiMarker').style.left = pos + '%';
    box.hidden = false;
  }
  $('#bmiForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var h = parseFloat($('#bmiH').value), w = parseFloat($('#bmiW').value);
    var err = $('#bmiErr');
    if (!(h >= 100 && h <= 250 && w >= 30 && w <= 300)) {
      err.textContent = t('bmi.err');
      lastBmi = null;
      renderBmi();
      return;
    }
    err.textContent = '';
    lastBmi = w / Math.pow(h / 100, 2);
    $('#bmiMarker').style.left = '0%';
    renderBmi();
    requestAnimationFrame(function () {
      var pos = Math.max(0, Math.min(1, (lastBmi - 15) / 25)) * 100;
      $('#bmiMarker').style.left = pos + '%';
    });
  });

  /* ---------- الأسئلة الشائعة ---------- */
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-q', item);
    q.addEventListener('click', function () {
      var open = !item.classList.contains('open');
      $$('.faq-item.open').forEach(function (o) {
        o.classList.remove('open');
        $('.faq-q', o).setAttribute('aria-expanded', 'false');
      });
      if (open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- فورم الحجز → واتساب ---------- */
  var form = $('#bookForm'), toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }
  function setErr(field, key) {
    var small = $('[data-err="' + field + '"]', form);
    if (small) {
      small.textContent = key ? t(key) : '';
      small.parentElement.classList.toggle('invalid', !!key);
    }
  }
  function clearErrors() {
    if (!form) return;
    $$('[data-err]', form).forEach(function (s) { s.textContent = ''; s.parentElement.classList.remove('invalid'); });
    var be = $('#bmiErr'); if (be) be.textContent = '';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim();
    var phone = $('#fPhone').value.trim();
    var digits = phone.replace(/[^\d]/g, '');
    var ok = true;
    setErr('name', name.length < 2 ? 'err.name' : '');
    if (name.length < 2) ok = false;
    setErr('phone', digits.length < 10 || digits.length > 15 ? 'err.phone' : '');
    if (digits.length < 10 || digits.length > 15) ok = false;
    if (!ok) return;

    var goal = $('#fGoal').selectedOptions[0].textContent;
    var plan = $('#fPlan').selectedOptions[0].textContent;
    var msg = t('wa.msg')
      .replace('{name}', name).replace('{phone}', phone)
      .replace('{goal}', goal).replace('{plan}', plan);
    window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    toast(t('toast.ok'));
  });
  ['fName', 'fPhone'].forEach(function (id) {
    $('#' + id).addEventListener('input', function () { setErr(id === 'fName' ? 'name' : 'phone', ''); });
  });

  /* ---------- واتساب العايم + السنة ---------- */
  $('#waFloat').setAttribute('href', 'https://wa.me/' + CONFIG.whatsapp);

  /* ---------- تشغيل أولي ---------- */
  applyLang(lang, false);
})();
