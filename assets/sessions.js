/* Builds the "Upcoming workshops" table rows and the schema.org Event data
   from /assets/sessions.json. Works for the English and the German homepage. */
(function () {
  var box = document.getElementById('sessions-rows');
  if (!box) return;
  var de = /^\/de(\/|$)/.test(location.pathname);
  var lang = de ? 'de' : 'en';
  var L = de
    ? { locale: 'de-CH', register: 'Anmelden', details: 'Details', online: 'Online', kind: 'Hatha-Yoga-Workshop',
        empty: 'Zurzeit sind keine Termine geplant. Sagen Sie hallo, um über neue Termine informiert zu werden.',
        fallback: 'Bitte kontaktieren Sie Nanda für die nächsten Termine.' }
    : { locale: 'en-GB', register: 'Register', details: 'Details', online: 'Online', kind: 'Hatha Yoga Workshop',
        empty: 'No sessions are scheduled at the moment. Say hello to be informed about new dates.',
        fallback: 'Please contact Nanda for upcoming dates.' };

  var PIN = '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
  var GLOBE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pick(v) { return (v && typeof v === 'object') ? v[lang] : v; }   // text or {en, de}
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function month(d, loc) { return new Intl.DateTimeFormat(loc, { month: 'long' }).format(d); }

  // Visible date range, in the style already used on the site
  function rangeText(a, b) {
    var y1 = a.getFullYear(), y2 = b.getFullYear(), same = a.getTime() === b.getTime(), sm = a.getMonth() === b.getMonth() && y1 === y2;
    var m1 = month(a, L.locale), m2 = month(b, L.locale), d1 = a.getDate(), d2 = b.getDate();
    if (de) {
      if (same) return d1 + '. ' + m1 + ' ' + y1;
      if (sm) return d1 + '.–' + d2 + '. ' + m1 + ' ' + y1;
      return d1 + '. ' + m1 + (y1 !== y2 ? ' ' + y1 : '') + ' – ' + d2 + '. ' + m2 + ' ' + y2;
    }
    if (same) return y1 + ' ' + m1 + ' ' + d1;
    if (sm) return y1 + ' ' + m1 + ' ' + d1 + '-' + d2;
    return y1 + ' ' + m1 + ' ' + d1 + ' - ' + (y1 !== y2 ? y2 + ' ' : '') + m2 + ' ' + d2;
  }
  // Date text passed to the default registration form (always English)
  function formDate(a, b) {
    var m1 = month(a, 'en-GB'), m2 = month(b, 'en-GB'), d1 = a.getDate(), d2 = b.getDate(), y = b.getFullYear();
    if (a.getTime() === b.getTime()) return d1 + ' ' + m1 + ' ' + y;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return d1 + '-' + d2 + ' ' + m1 + ' ' + y;
    return d1 + ' ' + m1 + ' - ' + d2 + ' ' + m2 + ' ' + y;
  }
  function slotsText(slots) {
    return (slots || []).map(function (s) { return s[0].replace(/^0/, '') + ' - ' + s[1].replace(/^0/, ''); }).join(' & ');
  }
  // Zurich offset (EU summer time: last Sunday of March to last Sunday of October)
  function lastSun(y, m) { var d = new Date(Date.UTC(y, m + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime(); }
  function offset(d) {
    var t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), y = d.getFullYear();
    return (t >= lastSun(y, 2) && t < lastSun(y, 9)) ? '+02:00' : '+01:00';
  }
  function iso(d, hhmm) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + hhmm + ':00' + offset(d);
  }

  // Registration link: the session's own "registerUrl" if given; otherwise the in-person or the
  // online Google form (see "forms" in sessions.json), pre-filled with the program name and the dates.
  function registerLink(data, s, a, b) {
    var own = pick(s.registerUrl);
    if (own) return own;
    var key = s.form || (s.mode === 'online' ? 'online' : 'in-person');
    var f = (data.forms || {})[key] || (data.forms || {})['in-person'];
    var q = function (v) { return encodeURIComponent(v).replace(/%20/g, '+'); };
    return f.url + '&' + f.programEntry + '=' + q(s.formProgram || s.practice) + '&' + f.dateEntry + '=' + q(formDate(a, b));
  }
  function placeOf(loc) {
    return { '@type': 'Place', name: loc.name,
      address: { '@type': 'PostalAddress', addressLocality: loc.locality, addressRegion: loc.region, addressCountry: loc.country } };
  }

  function showMessage(text) { box.innerHTML = '<p class="sessions-empty">' + esc(text) + '</p>'; }

  fetch('/assets/sessions.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      var list = (data.sessions || []).filter(function (s) { return parse(s.end || s.start) >= today; })
        .sort(function (x, y) { return parse(x.start) - parse(y.start); });
      if (!list.length) { showMessage(L.empty); return; }

      // Table rows
      box.innerHTML = list.map(function (s) {
        var a = parse(s.start), b = parse(s.end || s.start), loc = s.location || data.location, mode = s.mode || 'in-person';
        var link = registerLink(data, s, a, b), mail = /^mailto:/i.test(link);
        var where = mode === 'online' ? GLOBE + esc(L.online)
                  : mode === 'mixed' ? PIN + esc(pick(loc.label)) + ' + ' + esc(L.online)
                  : PIN + esc(pick(loc.label));
        var timeHtml = [pick(s.summary) ? esc(pick(s.summary)) : '', esc(slotsText(s.slots))].filter(Boolean).join(' <br>');
        var cost = typeof s.price === 'number' ? esc(data.currency) + ' ' + esc(s.price) : esc(pick(s.price) || '');
        return '<div class="class-row">' +
          '<div class="class-practice"><h3><span class="c-date">' + esc(rangeText(a, b)) + '</span><span class="c-name">' + esc(s.practice) +
            (pick(s.practiceTail) ? ' <em>' + esc(pick(s.practiceTail)) + '</em>' : '') + '</span></h3>' +
            (pick(s.tag) ? '<span class="c-tag">' + esc(pick(s.tag)) + '</span>' : '') + '</div>' +
          '<div class="class-detail">' + where + '</div>' +
          '<div class="class-detail">' + CLOCK + timeHtml + '</div>' +
          '<div class="class-detail">' + cost + (pick(s.details) ? (cost ? ' | ' : '') + '<a href="' + esc(pick(s.details)) + '" rel="noopener">' + L.details + '</a>' : '') + '</div>' +
          '<a href="' + esc(link) + '" class="class-register"' + (mail ? '' : ' target="_blank"') + ' rel="noopener">' + esc(pick(s.registerLabel) || L.register) + '</a>' +
        '</div>';
      }).join('');

      // schema.org Event data, one block per upcoming session
      document.querySelectorAll('script[data-sessions-ld]').forEach(function (n) { n.remove(); });
      list.forEach(function (s) {
        var a = parse(s.start), b = parse(s.end || s.start), slots = s.slots || [], loc = s.location || data.location, mode = s.mode || 'in-person';
        var link = registerLink(data, s, a, b);
        if (/^mailto:/i.test(link)) link = location.origin + '/#classes';
        var virtual = { '@type': 'VirtualLocation', url: s.onlineUrl || (location.origin + '/') };
        var ev = {
          '@context': 'https://schema.org', '@type': 'Event',
          name: s.practice + (pick(s.practiceTail) ? ' ' + pick(s.practiceTail) : '') + ' – ' + (pick(s.kind) || L.kind),
          description: pick(s.description),
          startDate: slots.length ? iso(a, slots[0][0]) : s.start,
          endDate: slots.length ? iso(b, slots[slots.length - 1][1]) : (s.end || s.start),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: mode === 'online' ? 'https://schema.org/OnlineEventAttendanceMode'
                              : mode === 'mixed' ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
          inLanguage: s.language || 'en',
          location: mode === 'online' ? virtual : mode === 'mixed' ? [placeOf(loc), virtual] : placeOf(loc),
          image: s.image ? [new URL(s.image, location.origin).href] : undefined,
          performer: { '@type': 'Person', name: data.performer },
          organizer: Object.assign({ '@type': 'Organization' }, data.organizer),
          offers: typeof s.price === 'number' ? { '@type': 'Offer', price: String(s.price), priceCurrency: data.currency, availability: 'https://schema.org/InStock', url: link,
                    validFrom: iso(s.registrationOpens ? parse(s.registrationOpens) : today, '00:00') } : undefined
        };
        var el = document.createElement('script');
        el.type = 'application/ld+json'; el.setAttribute('data-sessions-ld', '');
        el.text = JSON.stringify(ev);
        document.head.appendChild(el);
      });
    })
    .catch(function () { showMessage(L.fallback); });   // file missing, broken, or malformed
})();
