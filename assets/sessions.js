/* Builds the "Upcoming workshops" table rows and the schema.org Event data
   from /assets/sessions.json. Works for the English and the German homepage. */
(function () {
  var box = document.getElementById('sessions-rows');
  if (!box) return;
  var de = /^\/de(\/|$)/.test(location.pathname);
  var lang = de ? 'de' : 'en';
  var L = de
    ? { locale: 'de-CH', register: 'Anmelden', details: 'Details',
        empty: 'Zurzeit sind keine Termine geplant. Sagen Sie hallo, um über neue Termine informiert zu werden.' }
    : { locale: 'en-GB', register: 'Register', details: 'Details',
        empty: 'No sessions are scheduled at the moment. Say hello to be informed about new dates.' };

  var PIN = '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
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
  // Date text passed to the registration form (always English)
  function formDate(a, b) {
    var m1 = month(a, 'en-GB'), m2 = month(b, 'en-GB'), d1 = a.getDate(), d2 = b.getDate(), y = b.getFullYear();
    if (a.getTime() === b.getTime()) return d1 + ' ' + m1 + ' ' + y;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return d1 + '-' + d2 + ' ' + m1 + ' ' + y;
    return d1 + ' ' + m1 + ' - ' + d2 + ' ' + m2 + ' ' + y;
  }
  function slotsText(slots) {
    return (slots || []).map(function (s) { return s[0].replace(/^0/, '') + ' - ' + s[1].replace(/^0/, ''); }).join(' & ');
  }
  // Zurich offset for ISO dates (EU summer time: last Sunday of March to last Sunday of October)
  function lastSun(y, m) { var d = new Date(Date.UTC(y, m + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime(); }
  function offset(d) {
    var t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), y = d.getFullYear();
    return (t >= lastSun(y, 2) && t < lastSun(y, 9)) ? '+02:00' : '+01:00';
  }
  function iso(d, hhmm) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + hhmm + ':00' + offset(d);
  }

  fetch('/assets/sessions.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      var list = (data.sessions || []).filter(function (s) { return parse(s.end || s.start) >= today; })
        .sort(function (x, y) { return parse(x.start) - parse(y.start); });

      // Table rows
      if (!list.length) { box.innerHTML = '<p class="sessions-empty">' + esc(L.empty) + '</p>'; return; }
      box.innerHTML = list.map(function (s) {
        var a = parse(s.start), b = parse(s.end || s.start);
        var link = data.registerForm + '&entry.956495107=' + encodeURIComponent(s.practice).replace(/%20/g, '+') +
                   '&entry.1383122517=' + encodeURIComponent(formDate(a, b)).replace(/%20/g, '+');
        var sum = (s.summary && s.summary[lang]) ? esc(s.summary[lang]) + ' <br>' : '';
        return '<div class="class-row">' +
          '<div class="class-practice"><h3>' + esc(s.practice) + ' <em>' + esc(rangeText(a, b)) + '</em></h3>' +
            (s.tag ? '<span class="c-tag">' + esc(s.tag[lang]) + '</span>' : '') + '</div>' +
          '<div class="class-detail">' + PIN + esc(data.location.label[lang]) + '</div>' +
          '<div class="class-detail">' + CLOCK + sum + esc(slotsText(s.slots)) + '</div>' +
          '<div class="class-detail">' + esc(data.currency) + ' ' + esc(s.price) +
            (s.details ? ' | <a href="' + esc(s.details[lang]) + '" rel="noopener">' + L.details + '</a>' : '') + '</div>' +
          '<a href="' + esc(link) + '" class="class-register" target="_blank" rel="noopener">' + L.register + '</a>' +
        '</div>';
      }).join('');

      // schema.org Event data, one block per upcoming session
      document.querySelectorAll('script[data-sessions-ld]').forEach(function (n) { n.remove(); });
      list.forEach(function (s) {
        var a = parse(s.start), b = parse(s.end || s.start), slots = s.slots || [];
        var link = data.registerForm + '&entry.956495107=' + encodeURIComponent(s.practice).replace(/%20/g, '+') +
                   '&entry.1383122517=' + encodeURIComponent(formDate(a, b)).replace(/%20/g, '+');
        var ev = {
          '@context': 'https://schema.org', '@type': 'Event',
          name: s.practice + (de ? ' – Hatha-Yoga-Workshop' : ' – Hatha Yoga Workshop'),
          description: s.description ? s.description[lang] : undefined,
          startDate: slots.length ? iso(a, slots[0][0]) : s.start,
          endDate: slots.length ? iso(b, slots[slots.length - 1][1]) : (s.end || s.start),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          inLanguage: 'en',
          location: { '@type': 'Place', name: data.location.name,
            address: { '@type': 'PostalAddress', addressLocality: data.location.locality, addressRegion: data.location.region, addressCountry: data.location.country } },
          image: s.image ? [new URL(s.image, location.origin).href] : undefined,
          performer: { '@type': 'Person', name: data.performer },
          organizer: Object.assign({ '@type': 'Organization' }, data.organizer),
          offers: { '@type': 'Offer', price: String(s.price), priceCurrency: data.currency, availability: 'https://schema.org/InStock', url: link }
        };
        var el = document.createElement('script');
        el.type = 'application/ld+json'; el.setAttribute('data-sessions-ld', '');
        el.text = JSON.stringify(ev);
        document.head.appendChild(el);
      });
    })
    .catch(function () { /* leave the table empty if the file cannot be loaded */ });
})();
