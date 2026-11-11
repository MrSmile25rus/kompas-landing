(function () {
  'use strict';

  var doc = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SITE_URL = 'https://mrsmile25rus.github.io/kompas-landing/'; // TODO: реальный домен

  /* =========================================================
     Аналитика (Яндекс.Метрика) — грузится только после согласия на cookie
     ========================================================= */
  var METRIKA_ID = null; // TODO: номер счётчика, например 12345678
  var metrikaLoaded = false;

  function loadMetrika() {
    if (!METRIKA_ID || metrikaLoaded) return;
    metrikaLoaded = true;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(METRIKA_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }

  function track(goal, params) {
    if (METRIKA_ID && typeof window.ym === 'function') {
      window.ym(METRIKA_ID, 'reachGoal', goal, params || {});
    } else {
      console.debug('[goal]', goal, params || '');
    }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-goal]');
    if (el) track(el.getAttribute('data-goal'), { label: el.getAttribute('data-goal-label') || '' });
  });

  /* =========================================================
     Шкала компаса
     ========================================================= */
  var ticks = document.getElementById('ticks');
  if (ticks) {
    var NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 72; i++) {
      if (i % 18 === 0) continue;
      var major = i % 6 === 0;
      var a = (i * 5 - 90) * Math.PI / 180;
      var r1 = 196, r2 = major ? 180 : 188;
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', (200 + r1 * Math.cos(a)).toFixed(2));
      l.setAttribute('y1', (200 + r1 * Math.sin(a)).toFixed(2));
      l.setAttribute('x2', (200 + r2 * Math.cos(a)).toFixed(2));
      l.setAttribute('y2', (200 + r2 * Math.sin(a)).toFixed(2));
      l.setAttribute('class', major ? 'dial__tick dial__tick--major' : 'dial__tick');
      ticks.appendChild(l);
    }
  }

  /* =========================================================
     Шапка, кнопка «Наверх», вращение шкалы
     ========================================================= */
  var header = document.getElementById('header');
  var ring = document.getElementById('dialRing');
  var toTop = document.getElementById('toTop');
  var toTopProgress = document.getElementById('toTopProgress');
  var toTopDial = document.getElementById('toTopDial');
  var ticking = false;

  // риски компаса внутри кнопки «Наверх»
  (function () {
    var NS = 'http://www.w3.org/2000/svg';
    for (var k = 0; k < 16; k++) {
      var ang = (k * 22.5 - 90) * Math.PI / 180, len = k % 4 === 0 ? 4 : 2;
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', (21 + 20 * Math.cos(ang)).toFixed(2));
      ln.setAttribute('y1', (21 + 20 * Math.sin(ang)).toFixed(2));
      ln.setAttribute('x2', (21 + (20 - len) * Math.cos(ang)).toFixed(2));
      ln.setAttribute('y2', (21 + (20 - len) * Math.sin(ang)).toFixed(2));
      toTopDial.appendChild(ln);
    }
  })();

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    toTop.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(1, y / max) : 0;
    toTopProgress.style.strokeDashoffset = (100 - progress * 100).toFixed(2);
    if (!reduceMotion) toTopDial.style.transform = 'rotate(' + (progress * 360).toFixed(1) + 'deg)';
    if (ring && !reduceMotion && y < window.innerHeight * 1.5) {
      ring.style.transform = 'rotate(' + (y * 0.06).toFixed(2) + 'deg)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    document.querySelector('.header__logo').focus({ preventScroll: true });
  });

  /* =========================================================
     Мобильное меню
     ========================================================= */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function setMenu(open) {
    doc.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* =========================================================
     Анонсы мероприятий
     ========================================================= */
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  function parseMsk(s) { return new Date(s + ':00+03:00'); }
  function mskParts(d) {
    var m = new Date(d.getTime() + 3 * 3600 * 1000);
    return {
      day: m.getUTCDate(), month: MONTHS[m.getUTCMonth()], weekday: WEEKDAYS[m.getUTCDay()],
      time: String(m.getUTCHours()).padStart(2, '0') + ':' + String(m.getUTCMinutes()).padStart(2, '0')
    };
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function durationLabel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + ' ч' : '') + (h && m ? ' ' : '') + (m ? m + ' мин' : '');
  }

  var now = Date.now();
  var events = (window.EVENTS || [])
    .map(function (e) {
      var start = parseMsk(e.date);
      return Object.assign({}, e, { start: start, end: new Date(start.getTime() + (e.duration || 90) * 60000) });
    })
    .filter(function (e) { return !isNaN(e.start) && e.end.getTime() > now; })
    .sort(function (a, b) { return a.start - b.start; });

  var list = document.getElementById('eventsList');
  if (list) {
    if (!events.length) {
      list.innerHTML =
        '<div class="events__empty reveal">' +
          '<p class="events__empty-title">Новые даты скоро появятся</p>' +
          '<p class="events__empty-text">Подпишитесь на&nbsp;Telegram-канал, чтобы узнать о&nbsp;них первыми.</p>' +
        '</div>';
    } else {
      list.innerHTML = events.map(function (e) {
        var p = mskParts(e.start);
        return '' +
          '<article class="event reveal">' +
            '<div class="event__date">' +
              '<span class="event__day">' + p.day + '</span>' +
              '<span class="event__month">' + p.month + '</span>' +
              '<span class="event__time">' + p.weekday + ', ' + p.time + ' МСК</span>' +
            '</div>' +
            '<div class="event__body">' +
              '<p class="event__kicker">' + esc(e.type) + ' <span aria-hidden="true">·</span> ' + esc(e.audience) + '</p>' +
              '<h3 class="event__title">' + esc(e.title) + '</h3>' +
              (e.description ? '<p class="event__text">' + esc(e.description) + '</p>' : '') +
              '<ul class="event__meta">' +
                '<li>' + esc(e.platform) + '</li>' +
                '<li>' + durationLabel(e.duration || 90) + '</li>' +
                (e.price ? '<li>' + esc(e.price) + '</li>' : '') +
              '</ul>' +
            '</div>' +
            '<div class="event__cta">' +
              '<button class="btn btn--dark" type="button" data-register="' + esc(e.id) + '">Хочу участвовать</button>' +
            '</div>' +
          '</article>';
      }).join('');
    }

    if (events.length) {
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': events.map(function (e) {
          var free = /бесплат/i.test(e.price || '');
          return {
            '@type': 'Event',
            name: e.title,
            description: e.description || '',
            startDate: e.date + ':00+03:00',
            endDate: new Date(e.end.getTime() + 3 * 3600000).toISOString().slice(0, 19) + '+03:00',
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
            location: { '@type': 'VirtualLocation', url: SITE_URL + '#events' },
            image: SITE_URL + 'assets/og-image.jpg',
            organizer: { '@type': 'Person', name: 'Наталья Василянская', url: SITE_URL },
            performer: { '@type': 'Person', name: 'Наталья Василянская' },
            offers: free ? { '@type': 'Offer', price: 0, priceCurrency: 'RUB', availability: 'https://schema.org/InStock', url: SITE_URL + '#events' } : undefined
          };
        })
      });
      document.head.appendChild(ld);
    }
  }

  /* =========================================================
     Появление при прокрутке
     ========================================================= */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var siblings = parent ? Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains('reveal'); }) : [];
      var pos = siblings.indexOf(el);
      if (pos > 0) el.style.transitionDelay = Math.min(pos * 70, 350) + 'ms';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =========================================================
     Активный пункт меню
     ========================================================= */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll(':scope > a[href^="#"]:not(.btn):not([href="#"])'));
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* =========================================================
     Вкладки (WAI-ARIA)
     ========================================================= */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs__tab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.parentElement.scrollTo({ left: tab.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* =========================================================
     Маска телефона
     ========================================================= */
  document.querySelectorAll('[data-phone]').forEach(function (input) {
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '');
      if (!d) { input.value = ''; return; }
      if (d[0] === '8') d = '7' + d.slice(1);
      if (d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      var out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 4) out += ')';
      if (d.length > 4) out += ' ' + d.slice(4, 7);
      if (d.length > 7) out += '-' + d.slice(7, 9);
      if (d.length > 9) out += '-' + d.slice(9, 11);
      input.value = out;
    });
  });

  /* =========================================================
     Фирменный выпадающий список (вместо системного)
     Настоящий <select> остаётся в форме и хранит значение.
     ========================================================= */
  var uid = 0;
  function enhanceSelect(select) {
    var wrap = select.closest('.select');
    var field = select.closest('.field');
    var label = field && field.querySelector('label[for="' + select.id + '"]');
    var id = 'sel-' + (++uid);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'select__btn';
    btn.id = id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id + '-list');

    var listEl = document.createElement('ul');
    listEl.className = 'select__list';
    listEl.id = id + '-list';
    listEl.setAttribute('role', 'listbox');
    listEl.tabIndex = -1;
    listEl.hidden = true;

    if (label) {
      label.id = label.id || id + '-label';
      label.htmlFor = btn.id;
      btn.setAttribute('aria-labelledby', label.id + ' ' + btn.id);
      listEl.setAttribute('aria-labelledby', label.id);
    }

    var items = [];
    Array.prototype.forEach.call(select.options, function (o, idx) {
      if (o.hasAttribute('data-placeholder')) return;
      var li = document.createElement('li');
      li.className = 'select__option';
      li.id = id + '-opt-' + idx;
      li.setAttribute('role', 'option');
      li.textContent = o.text;
      li.dataset.index = idx;
      listEl.appendChild(li);
      items.push(li);
    });

    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    wrap.classList.add('select--enhanced');
    wrap.appendChild(btn);
    wrap.appendChild(listEl);

    var active = -1;

    function sync() {
      var o = select.options[select.selectedIndex];
      var placeholder = !o || o.hasAttribute('data-placeholder');
      btn.textContent = o ? o.text : '';
      btn.classList.toggle('is-placeholder', placeholder);
      items.forEach(function (li) {
        li.setAttribute('aria-selected', String(+li.dataset.index === select.selectedIndex));
      });
    }
    function setActive(i) {
      items.forEach(function (li) { li.classList.remove('is-active'); });
      active = Math.max(0, Math.min(items.length - 1, i));
      var li = items[active];
      li.classList.add('is-active');
      listEl.setAttribute('aria-activedescendant', li.id);
      var top = li.offsetTop, bottom = top + li.offsetHeight;
      if (top < listEl.scrollTop) listEl.scrollTop = top;
      else if (bottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = bottom - listEl.clientHeight;
    }
    function open() {
      if (!listEl.hidden) return;
      closeAllSelects();
      listEl.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      // раскрываем вверх, если снизу не хватает места (с учётом всплывающего окна)
      var r = btn.getBoundingClientRect();
      var dlg = btn.closest('dialog');
      var limit = dlg ? Math.min(window.innerHeight, dlg.getBoundingClientRect().bottom) : window.innerHeight;
      var need = Math.min(listEl.scrollHeight, 320) + 8;
      wrap.classList.toggle('is-up', limit - r.bottom < need && r.top > need);
      var cur = items.findIndex(function (li) { return +li.dataset.index === select.selectedIndex; });
      setActive(cur >= 0 ? cur : 0);
      listEl.focus({ preventScroll: true });
    }
    function close(focusBtn) {
      if (listEl.hidden) return;
      listEl.hidden = true;
      wrap.classList.remove('is-open', 'is-up');
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus({ preventScroll: true });
    }
    function choose(i) {
      var idx = +items[i].dataset.index;
      if (select.selectedIndex !== idx) {
        select.selectedIndex = idx;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
      }
      sync();
      close(true);
    }

    btn.addEventListener('click', function () { listEl.hidden ? open() : close(true); });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); open(); }
    });
    listEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') { close(false); }
      else if (e.key.length === 1) {
        // переход по первой букве
        var ch = e.key.toLowerCase();
        for (var k = 1; k <= items.length; k++) {
          var j = (active + k) % items.length;
          if (items[j].textContent.trim().toLowerCase().indexOf(ch) === 0) { setActive(j); break; }
        }
      }
    });
    listEl.addEventListener('mousemove', function (e) {
      var li = e.target.closest('.select__option');
      if (li) setActive(items.indexOf(li));
    });
    listEl.addEventListener('click', function (e) {
      var li = e.target.closest('.select__option');
      if (li) choose(items.indexOf(li));
    });
    listEl.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) close(false);
    });

    var form = select.form;
    if (form) form.addEventListener('reset', function () { setTimeout(sync, 0); });
    select._sync = sync;
    select._close = close;
    sync();
  }

  function closeAllSelects() {
    document.querySelectorAll('.select--enhanced select').forEach(function (s) { if (s._close) s._close(false); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.select--enhanced')) closeAllSelects();
  });
  document.querySelectorAll('.select select').forEach(enhanceSelect);

  /* =========================================================
     Общая валидация и отправка форм
     ========================================================= */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function mark(input, bad) {
    var f = input.closest('.field');
    if (f) f.classList.toggle('is-invalid', bad);
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function validate(form, opts) {
    var el = form.elements, ok = true;

    var nameBad = el.name.value.trim().length < 2;
    mark(el.name, nameBad); ok = ok && !nameBad;

    var email = el.email.value.trim();
    var emailBad = opts.emailRequired ? !emailRe.test(email) : (email !== '' && !emailRe.test(email));
    mark(el.email, emailBad); ok = ok && !emailBad;

    if (opts.contactRequired) {
      var noContact = email === '' && el.phone.value.replace(/\D/g, '').length < 11;
      mark(el.phone, noContact); ok = ok && !noContact;
    }

    var consentErr = form.querySelector('[data-consent-error]');
    consentErr.classList.toggle('is-shown', !el.consent.checked);
    ok = ok && el.consent.checked;

    if (!ok) {
      var first = form.querySelector('[aria-invalid="true"]') || (!el.consent.checked ? el.consent : null);
      if (first) first.focus();
    }
    return ok;
  }

  function clearOnInput(form) {
    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid')) mark(e.target, false);
      if (e.target.name === 'consent') form.querySelector('[data-consent-error]').classList.remove('is-shown');
      if (e.target.name === 'email' && form.elements.phone) mark(form.elements.phone, false);
    });
  }

  function resetForm(form) {
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { mark(i, false); });
    form.querySelector('[data-consent-error]').classList.remove('is-shown');
  }

  function serialize(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data.page = location.href;
    data.sent_at = new Date().toISOString();
    return data;
  }

  /*
    Отправка заявок. Сейчас — заготовка: данные выводятся в консоль.
    Подключение: укажите адрес обработчика (свой сервер, Telegram-бот, CRM, сервис рассылок):
    var ENDPOINT = '/api/lead';
  */
  var ENDPOINT = null;
  function send(type, data) {
    if (data.website) return Promise.resolve(); // honeypot заполнен — бот
    delete data.website;
    if (!ENDPOINT) {
      console.info('[' + type + '] заявка (заготовка, не отправлена):', data);
      return new Promise(function (r) { setTimeout(r, 500); });
    }
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ type: type }, data))
    }).then(function (res) { if (!res.ok) throw new Error(res.status); });
  }

  /* =========================================================
     Модальные окна: общее поведение
     ========================================================= */
  function openModal(d) {
    d.showModal();
    document.body.style.overflow = 'hidden';
  }
  document.querySelectorAll('dialog.modal').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', function () { document.body.style.overflow = ''; });
  });

  function selectFormat(select, value) {
    select.value = '';
    Array.prototype.forEach.call(select.options, function (o) { if (value && o.text === value) select.value = o.value || o.text; });
    if (select._sync) select._sync();
  }

  /* =========================================================
     Заявка «Пригласить эксперта»: форма внизу страницы и всплывающее окно
     ========================================================= */
  function bindLeadForm(form, onSuccess, source) {
    clearOnInput(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form, { contactRequired: true })) return;
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      var data = serialize(form);
      data.source = source;
      send('lead', data).then(function () {
        track('lead_submit', { format: form.elements.format.value || 'не выбран', source: source });
        onSuccess();
      }).catch(function () {
        alert('Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.');
      }).finally(function () { btn.disabled = false; });
    });
  }

  var form = document.getElementById('leadForm');
  var success = document.getElementById('formSuccess');
  bindLeadForm(form, function () { form.hidden = true; success.hidden = false; success.focus(); }, 'contacts');
  document.getElementById('formReset').addEventListener('click', function () {
    resetForm(form); success.hidden = true; form.hidden = false; form.elements.name.focus();
  });

  var leadDialog = document.getElementById('leadDialog');
  var leadForm = document.getElementById('leadFormModal');
  var leadFormWrap = document.getElementById('leadFormWrap');
  var leadSuccess = document.getElementById('leadSuccess');
  bindLeadForm(leadForm, function () { leadFormWrap.hidden = true; leadSuccess.hidden = false; leadSuccess.focus(); }, 'popup');

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-lead]');
    if (!trigger) return;
    e.preventDefault();
    var format = trigger.getAttribute('data-format') || '';
    if (!leadSuccess.hidden) resetForm(leadForm); // после отправленной заявки — чистая форма
    leadFormWrap.hidden = false; leadSuccess.hidden = true;
    selectFormat(leadForm.elements.format, format);
    selectFormat(document.getElementById('f-format'), format);
    document.getElementById('leadMeta').textContent = format ? 'Заявка · ' + format : 'Заявка';
    document.getElementById('leadTitle').textContent =
      format === 'Интенсив' ? 'Запросить программу интенсива' : format ? 'Обсудить формат' : 'Пригласить эксперта';
    openModal(leadDialog);
    track('lead_open', { format: format || 'не выбран' });
  });

  /* =========================================================
     Регистрация на мероприятие
     ========================================================= */
  var dialog = document.getElementById('eventDialog');
  var evForm = document.getElementById('eventForm');
  var evFormWrap = document.getElementById('evFormWrap');
  var evSuccess = document.getElementById('evSuccess');
  var currentEvent = null;
  clearOnInput(evForm);

  function openEvent(id) {
    currentEvent = events.filter(function (e) { return e.id === id; })[0];
    if (!currentEvent) return;
    var p = mskParts(currentEvent.start);
    document.getElementById('evMeta').textContent = p.day + ' ' + p.month + ', ' + p.time + ' МСК · ' + currentEvent.platform;
    document.getElementById('evTitle').textContent = currentEvent.title;
    resetForm(evForm);
    evForm.elements.event_id.value = currentEvent.id;
    evFormWrap.hidden = false; evSuccess.hidden = true;
    openModal(dialog);
    track('event_open', { event: currentEvent.id });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-register]');
    if (b) openEvent(b.getAttribute('data-register'));
  });

  evForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(evForm, { emailRequired: true })) return;
    var btn = evForm.querySelector('[type="submit"]');
    btn.disabled = true;
    var data = serialize(evForm);
    data.event_title = currentEvent.title;
    data.event_date = currentEvent.date;
    send('event_registration', data).then(function () {
      track('event_register', { event: currentEvent.id });
      document.getElementById('evEmail').textContent = data.email;
      evFormWrap.hidden = true; evSuccess.hidden = false; evSuccess.focus();
    }).catch(function () {
      alert('Не удалось зарегистрироваться. Попробуйте ещё раз.');
    }).finally(function () { btn.disabled = false; });
  });

  /* ---------- Файл для календаря (.ics) ---------- */
  function icsDate(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&'); }

  document.getElementById('evIcs').addEventListener('click', function () {
    if (!currentEvent) return;
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kompas//Events//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + currentEvent.id + '@kompas',
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(currentEvent.start),
      'DTEND:' + icsDate(currentEvent.end),
      'SUMMARY:' + icsText(currentEvent.title),
      'DESCRIPTION:' + icsText('Наталья Василянская. ' + (currentEvent.description || '') + '\nСсылка на подключение придёт на e-mail.'),
      'LOCATION:' + icsText(currentEvent.platform),
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Напоминание', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = currentEvent.id + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* =========================================================
     Согласие на cookie
     ========================================================= */
  var COOKIE_KEY = 'kompas_cookie_consent'; // 'all' | 'necessary'
  var cookieBar = document.getElementById('cookie');

  function readConsent() { try { return localStorage.getItem(COOKIE_KEY); } catch (e) { return null; } }
  function saveConsent(v) { try { localStorage.setItem(COOKIE_KEY, v); } catch (e) { /* приватный режим */ } }

  function syncCookieOffset() {
    // на телефоне плашка во всю ширину — поднимаем кнопку «Наверх» над ней
    var h = cookieBar.hidden || window.innerWidth > 640 ? 0 : cookieBar.offsetHeight;
    doc.style.setProperty('--cookie-h', h + 'px');
  }
  function showCookie(show) {
    cookieBar.hidden = !show;
    syncCookieOffset();
  }

  var consent = readConsent();
  if (consent === 'all') loadMetrika();
  else if (!consent) setTimeout(function () { showCookie(true); }, 800);

  cookieBar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cookie]');
    if (!b) return;
    var v = b.getAttribute('data-cookie');
    saveConsent(v);
    showCookie(false);
    if (v === 'all') loadMetrika();
  });
  document.getElementById('cookieSettings').addEventListener('click', function () { showCookie(true); });
  window.addEventListener('resize', syncCookieOffset);

  /* ---------- Год в подвале ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
