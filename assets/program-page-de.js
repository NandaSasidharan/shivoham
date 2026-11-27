/* Gemeinsames Verhalten der Programmseiten (aus den Inline-Skripten der Startseite) */

  (function() {
    if (!localStorage.getItem('cookieAccepted')) {
      document.getElementById('cookie-banner').style.display = 'flex';
    }
    document.getElementById('cookie-close').addEventListener('click', function() {
      localStorage.setItem('cookieAccepted', '1');
      const banner = document.getElementById('cookie-banner');
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.3s ease';
      setTimeout(function() { banner.style.display = 'none'; }, 300);
    });
  })();

;

  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 75);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => io.observe(el));

  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

;

  // Fade transition for internal navigation, replacing native smooth-scroll.
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || link.target === '_blank') return;
    if (/^(mailto:|tel:|https?:\/\/)/.test(href)) return;

    const isSamePageHash = href.startsWith('#') && href.length > 1;

    link.addEventListener('click', function (e) {
      if (isSamePageHash) {
        const targetEl = document.querySelector(href);
        if (!targetEl) return;
        e.preventDefault();
        document.body.classList.remove('loaded');
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          requestAnimationFrame(() => document.body.classList.add('loaded'));
        }, 300);
      } else if (href.startsWith('/') || href === '') {
        e.preventDefault();
        document.body.classList.remove('loaded');
        setTimeout(() => { window.location.href = href; }, 300);
      }
    });
  });

  // Ensure the page is visible if restored from the back/forward cache.
  window.addEventListener('pageshow', () => document.body.classList.add('loaded'));

;

  // Sag-hallo-Pop-up: sendet an /submit.php
  (function () {
    var overlay = document.getElementById('hello-overlay');
    var openBtns = document.querySelectorAll('.js-say-hello');
    var lastBtn = null;
    var form = document.getElementById('hello-form');
    var thanks = document.getElementById('hello-thanks');
    var sendBtn = document.getElementById('hello-send');
    var fields = ['name', 'location', 'email', 'message'];
    if (!overlay || !openBtns.length) return;

    function el(id) { return document.getElementById('hello-' + id); }
    function clearErrors() {
      fields.concat(['form']).forEach(function (f) { el('e-' + f).textContent = ''; });
    }
    function openModal(e) {
      lastBtn = e && e.currentTarget ? e.currentTarget : null;
      form.hidden = false; thanks.hidden = true; clearErrors();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      el('name').focus();
    }
    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lastBtn) lastBtn.focus();
    }
    function resetForm() {
      fields.forEach(function (f) { el(f).value = ''; });
      el('news').checked = false; el('website').value = '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var v = {};
      fields.forEach(function (f) { v[f] = el(f).value.trim(); });
      var ok = true;
      function fail(f, msg) { el('e-' + f).textContent = msg; ok = false; }
      if (!v.name) fail('name', 'Bitte gib deinen Namen ein.');
      if (!v.location) fail('location', 'Bitte gib deinen Ort ein.');
      if (!v.email) fail('email', 'Bitte gib deine E-Mail-Adresse ein.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) fail('email', 'Bitte gib eine gültige E-Mail-Adresse ein.');
      if (!v.message) fail('message', 'Bitte schreib eine Nachricht.');
      if (!ok) return;

      var sub = el('news').checked;
      sendBtn.disabled = true; sendBtn.textContent = 'Wird gesendet…';
      fetch('/submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v.name, location: v.location, email: v.email,
          message: v.message, subscribe: sub, website: el('website').value })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
      }).then(function (res) {
        if (!res.ok) {
          var f = res.data.fields || {};
          Object.keys(f).forEach(function (k) { if (el('e-' + k)) el('e-' + k).textContent = 'Bitte überprüfe diese Angabe.'; });
          if (!Object.keys(f).length) el('e-form').textContent = res.status === 429
            ? 'Zu viele Nachrichten. Bitte versuche es in einigen Minuten erneut.'
            : 'Deine Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.';
          return;
        }
        el('thanks-text').textContent = 'Vielen Dank, ' + v.name + '. Deine Nachricht ist angekommen, ich melde mich bald bei dir.'
          + (sub ? ' Du hast auch den Newsletter abonniert.' : '');
        form.hidden = true; thanks.hidden = false;
        resetForm();
        el('done').focus();
      }).catch(function () {
        el('e-form').textContent = 'Der Server ist nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.';
      }).then(function () {
        sendBtn.disabled = false; sendBtn.textContent = 'Nachricht senden';
      });
    });

    Array.prototype.forEach.call(openBtns, function (b) { b.addEventListener('click', openModal); });
    el('close').addEventListener('click', closeModal);
    el('cancel').addEventListener('click', closeModal);
    el('done').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(
        overlay.querySelectorAll('button, input, textarea'),
        function (n) { return !n.disabled && n.tabIndex !== -1 && n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

;

// Click-to-load YouTube (same facade pattern as the homepage)
document.querySelectorAll('.video-facade').forEach(function (f) {
  var p = f.querySelector('.video-poster');
  p.src = f.dataset.localPoster || ('https://i.ytimg.com/vi/' + f.dataset.youtubeId + '/hqdefault.jpg');
  p.onerror = function () { p.style.display = 'none'; };
  function go() {
    f.innerHTML = '';
    var i = document.createElement('iframe');
    i.src = 'https://www.youtube-nocookie.com/embed/' + f.dataset.youtubeId + '?autoplay=1&rel=0';
    i.title = f.dataset.title;
    i.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    i.allowFullscreen = true;
    f.appendChild(i);
    f.removeEventListener('click', go); f.removeEventListener('keydown', key);
  }
  function key(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } }
  f.addEventListener('click', go); f.addEventListener('keydown', key);
});
