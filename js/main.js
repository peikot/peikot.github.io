(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Partials: lataa nav ja footer ulkoisista tiedostoista
  // ---------------------------------------------------------------------------
  function loadPartial(id, url, callback) {
    var placeholder = document.getElementById(id);
    if (!placeholder) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        while (tmp.firstChild) {
          placeholder.parentNode.insertBefore(tmp.firstChild, placeholder);
        }
        placeholder.parentNode.removeChild(placeholder);
        if (callback) callback();
      })
      .catch(function () {
        placeholder.style.display = 'none';
      });
  }

  function initNav() {
    var hamburger = document.querySelector('.nav-hamburger');
    var mobileNav = document.querySelector('.nav-mobile');

    if (hamburger) {
      hamburger.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (mobileNav) {
      mobileNav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          document.body.classList.remove('nav-open');
          var h = document.querySelector('.nav-hamburger');
          if (h) h.setAttribute('aria-expanded', 'false');
        });
      });
    }

    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('nav-open') && !e.target.closest('.nav')) {
        document.body.classList.remove('nav-open');
        var h = document.querySelector('.nav-hamburger');
        if (h) h.setAttribute('aria-expanded', 'false');
      }
    });

    // Merkitse aktiivinen navigointilinkki
    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  function initFooter() {
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  loadPartial('nav-placeholder', 'partials/nav.html', initNav);
  loadPartial('footer-placeholder', 'partials/footer.html', initFooter);

  // ---------------------------------------------------------------------------
  // Config: URL:t ja fallback-data ladataan config.jsonista
  // ---------------------------------------------------------------------------
  var CONFIG = null;

  function haeConfig() {
    if (CONFIG) return Promise.resolve(CONFIG);
    return fetch('config.json')
      .then(function (r) { return r.json(); })
      .then(function (c) { CONFIG = c; return c; });
  }

  // ---------------------------------------------------------------------------
  // Yhteinen count-up-animaatio
  // ---------------------------------------------------------------------------
  function animateCountUp(el, maara, kesto) {
    kesto = kesto || 1500;
    var alku = performance.now();
    function askel(nyt) {
      var edistyminen = Math.min((nyt - alku) / kesto, 1);
      var helpotus = 1 - Math.pow(1 - edistyminen, 3);
      el.textContent = Math.round(helpotus * maara);
      if (edistyminen < 1) requestAnimationFrame(askel);
    }
    requestAnimationFrame(askel);
  }

  function observeOnce(el, threshold, callback) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { callback(); obs.disconnect(); }
      }, { threshold: threshold }).observe(el);
    } else {
      callback();
    }
  }

  // ---------------------------------------------------------------------------
  // Jäsenmäärä: hae Apps Scriptistä (live Sheetsistä), fallback config.json
  // ---------------------------------------------------------------------------
  function initLaskuri() {
    document.querySelectorAll('.jasenmaara-luku').forEach(function (laskuri) {
      var maara = parseInt(laskuri.getAttribute('data-maara'), 10) || 0;
      var animoitu = false;
      function countUp() {
        if (animoitu || maara === 0) return;
        animoitu = true;
        animateCountUp(laskuri, maara);
      }
      observeOnce(laskuri, 0.5, countUp);
    });
  }

  function asetaJasenmaara(maara) {
    document.querySelectorAll('.jasenmaara-luku').forEach(function (el) {
      el.setAttribute('data-maara', maara);
      el.textContent = maara;
    });
  }

  // Käynnistä animaatio heti HTML:n data-maara-arvolla
  initLaskuri();

  haeConfig().then(function (config) {
    fetch(config.appsScriptUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.jasenmaara > 0) {
          asetaJasenmaara(data.jasenmaara);
        } else {
          throw new Error('Virheellinen jäsenmäärä');
        }
      })
      .catch(function () {
        asetaJasenmaara(config.jasenmaara);
      });
  });

  // ---------------------------------------------------------------------------
  // Kalenteri: Seuraava peli, Höntsymittari, Tapahtumalista
  // ---------------------------------------------------------------------------
  // Seuraava peli -widget
  function initSeuraavaPeli(data) {
    var container = document.getElementById('next-game');
    if (!container) return;

    var iconEl = document.getElementById('next-game-icon');
    var titleEl = document.getElementById('next-game-title');
    var detailsEl = document.getElementById('next-game-details');
    var countdownEl = document.getElementById('next-game-countdown');

    if (!data) {
      container.classList.add('next-game--empty');
      iconEl.textContent = '📅';
      titleEl.textContent = 'Ei tulevia pelejä';
      detailsEl.textContent = 'Tarkista kalenteri myöhemmin!';
      countdownEl.style.display = 'none';
      return;
    }

    var ikonit = { sahly: 'img/sahly-icon.webp', futsal: 'img/futsal-icon.webp' };
    if (ikonit[data.emoji]) {
      iconEl.innerHTML = '<img src="' + ikonit[data.emoji] + '" alt="' + data.otsikko + '" width="38" height="38">';
    } else {
      iconEl.textContent = data.emoji || '📅';
    }
    titleEl.textContent = data.otsikko;

    var alkaa = new Date(data.alkaa);
    var pvm = alkaa.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' });
    var klo = alkaa.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    var paikkaTeksti = data.paikka ? ' · ' + data.paikka : '';
    detailsEl.textContent = pvm + ' klo ' + klo + paikkaTeksti;

    function paivitaCountdown() {
      var nyt = new Date();
      var ero = alkaa - nyt;

      if (ero <= 0) {
        countdownEl.style.display = 'none';
        detailsEl.textContent = 'Käynnissä nyt!';
        container.classList.add('next-game--soon');
        return;
      }

      if (ero < 3600000) {
        container.classList.add('next-game--soon');
      }

      var paivat = Math.floor(ero / 86400000);
      var tunnit = Math.floor((ero % 86400000) / 3600000);
      var minuutit = Math.floor((ero % 3600000) / 60000);

      document.getElementById('cd-days').textContent = paivat;
      document.getElementById('cd-hours').textContent = tunnit;
      document.getElementById('cd-mins').textContent = minuutit;
    }

    paivitaCountdown();
    setInterval(paivitaCountdown, 60000);
  }

  // Höntsymittari
  function initHontsymittari(data) {
    var container = document.getElementById('hontsymittari');
    if (!container || !data) return;

    var vuosi = new Date().getFullYear();
    var titleEl = document.getElementById('hontsymittari-title');
    if (titleEl) titleEl.textContent = 'Höntsymittari ' + vuosi;

    var pelitEl = document.getElementById('mittari-pelit');
    var tunnitEl = document.getElementById('mittari-tunnit');
    var fillEl = document.getElementById('mittari-fill');
    var targetEl = document.getElementById('mittari-target');

    var tavoite = data.tavoite || 100;
    if (targetEl) targetEl.textContent = 'Tavoite: ' + tavoite + ' peliä';

    pelitEl.setAttribute('data-maara', data.pelit);
    tunnitEl.setAttribute('data-maara', data.tunnit);

    // Animoi laskurit scroll-triggerillä
    function animoiMittari() {
      [pelitEl, tunnitEl].forEach(function (el) {
        var maara = parseInt(el.getAttribute('data-maara'), 10) || 0;
        animateCountUp(el, maara);
      });

      // Edistymispalkki
      var prosentti = Math.min(Math.round((data.pelit / tavoite) * 100), 100);
      if (fillEl) fillEl.style.width = prosentti + '%';
    }

    observeOnce(container, 0.3, animoiMittari);
  }

  // Kalenterisivu: kuukausikalenteri
  var kalenteriTapahtumat = [];
  var kalenteriKuukausi = new Date();
  kalenteriKuukausi.setDate(1);

  var KK_NIMET = ['Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu','Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu'];

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function avaaModaali(t) {
    var alkaa = new Date(t.alkaa);
    var paattyy = new Date(t.paattyy);
    var viikonpaiva = alkaa.toLocaleDateString('fi-FI', { weekday: 'long' });
    var pvm = alkaa.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
    var kloAlkaa = alkaa.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    var kloPaattyy = paattyy.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });

    var modal = document.getElementById('cal-modal');
    document.getElementById('cal-modal-title').textContent = t.otsikko;
    document.getElementById('cal-modal-date').textContent = viikonpaiva + ' ' + pvm;
    document.getElementById('cal-modal-time').textContent = 'klo ' + kloAlkaa + '–' + kloPaattyy;

    var paikkaEl = document.getElementById('cal-modal-location');
    paikkaEl.textContent = t.paikka || '';
    paikkaEl.style.display = t.paikka ? '' : 'none';

    var kuvausEl = document.getElementById('cal-modal-desc');
    if (t.kuvaus) {
      kuvausEl.innerHTML = escapeHtml(t.kuvaus).replace(/https?:\/\/[^\s<>&"']+/g, function(url) {
        try { new URL(url); } catch (e) { return url; }
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
      }).replace(/\n/g, '<br>');
      kuvausEl.style.display = '';
    } else {
      kuvausEl.style.display = 'none';
    }

    modal.classList.add('cal-modal-open');
    document.body.style.overflow = 'hidden';
  }

  function suljeModaali() {
    document.getElementById('cal-modal').classList.remove('cal-modal-open');
    document.body.style.overflow = '';
  }

  function renderKuukausi() {
    var vuosi = kalenteriKuukausi.getFullYear();
    var kk = kalenteriKuukausi.getMonth();
    var titleEl = document.getElementById('cal-month-title');
    var daysEl = document.getElementById('cal-days');
    if (!titleEl || !daysEl) return;

    titleEl.textContent = KK_NIMET[kk] + ' ' + vuosi;

    var tana = new Date();
    var ensimmainen = new Date(vuosi, kk, 1);
    var viimeinen = new Date(vuosi, kk + 1, 0);
    var aloitusOffset = (ensimmainen.getDay() + 6) % 7;

    var html = '';
    for (var i = 0; i < aloitusOffset; i++) {
      html += '<div class="cal-day cal-day-empty"></div>';
    }

    for (var p = 1; p <= viimeinen.getDate(); p++) {
      var onkoTana = tana.getFullYear() === vuosi && tana.getMonth() === kk && tana.getDate() === p;
      var paivaTapahtumat = kalenteriTapahtumat.filter(function(t) {
        var d = new Date(t.alkaa);
        return d.getFullYear() === vuosi && d.getMonth() === kk && d.getDate() === p;
      });

      var cls = 'cal-day' + (onkoTana ? ' cal-day-today' : '') + (paivaTapahtumat.length ? ' cal-day-has-events' : '');
      html += '<div class="' + cls + '"><span class="cal-day-num">' + p + '</span>';

      for (var j = 0; j < paivaTapahtumat.length; j++) {
        var t = paivaTapahtumat[j];
        var klo = new Date(t.alkaa).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
        html += '<button class="cal-event cal-event-' + escapeHtml(t.laji) + '" data-idx="' + kalenteriTapahtumat.indexOf(t) + '">'
          + '<span class="cal-event-time">' + klo + '</span>'
          + '<span class="cal-event-text">' + escapeHtml(t.otsikko) + '</span>'
          + '</button>';
      }

      html += '</div>';
    }

    daysEl.innerHTML = html;

    daysEl.querySelectorAll('.cal-event').forEach(function(el) {
      el.addEventListener('click', function() {
        avaaModaali(kalenteriTapahtumat[parseInt(this.dataset.idx)]);
      });
    });

    renderAgenda();
  }

  var VP_LYHYT = ['su','ma','ti','ke','to','pe','la'];

  function renderAgenda() {
    var agendaEl = document.getElementById('cal-agenda');
    if (!agendaEl) return;

    var vuosi = kalenteriKuukausi.getFullYear();
    var kk = kalenteriKuukausi.getMonth();
    var tana = new Date();

    var kkTapahtumat = kalenteriTapahtumat.filter(function(t) {
      var d = new Date(t.alkaa);
      return d.getFullYear() === vuosi && d.getMonth() === kk;
    }).sort(function(a, b) { return new Date(a.alkaa) - new Date(b.alkaa); });

    if (!kkTapahtumat.length) {
      agendaEl.innerHTML = '<div class="cal-agenda-empty">Ei tapahtumia tässä kuussa.</div>';
      return;
    }

    var paivat = {};
    kkTapahtumat.forEach(function(t) {
      var d = new Date(t.alkaa);
      var avain = d.getDate();
      if (!paivat[avain]) paivat[avain] = [];
      paivat[avain].push(t);
    });

    var html = '';
    Object.keys(paivat).sort(function(a, b) { return a - b; }).forEach(function(p) {
      var d = new Date(vuosi, kk, p);
      var onTana = tana.getFullYear() === vuosi && tana.getMonth() === kk && tana.getDate() === +p;
      html += '<div class="cal-agenda-day' + (onTana ? ' cal-agenda-today' : '') + '">';
      html += '<div class="cal-agenda-date">' + VP_LYHYT[d.getDay()] + ' ' + p + '.' + (kk + 1) + '.</div>';

      paivat[p].forEach(function(t) {
        var alkaa = new Date(t.alkaa);
        var klo = alkaa.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
        html += '<button class="cal-agenda-event cal-agenda-event-' + escapeHtml(t.laji) + '" data-idx="' + kalenteriTapahtumat.indexOf(t) + '">';
        html += '<span class="cal-agenda-time">' + klo + '</span>';
        html += '<span class="cal-agenda-info">';
        html += '<span class="cal-agenda-title">' + escapeHtml(t.otsikko) + '</span>';
        if (t.paikka) html += '<span class="cal-agenda-location">' + escapeHtml(t.paikka) + '</span>';
        html += '</span>';
        html += '</button>';
      });

      html += '</div>';
    });

    agendaEl.innerHTML = html;

    agendaEl.querySelectorAll('.cal-agenda-event').forEach(function(el) {
      el.addEventListener('click', function() {
        avaaModaali(kalenteriTapahtumat[parseInt(this.dataset.idx)]);
      });
    });
  }

  // Hae kalenteridata (etusivu: seuraava + mittari)
  if (document.getElementById('next-game') || document.getElementById('hontsymittari')) {
    haeConfig().then(function (config) {
      fetch(config.kalenteriUrl)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.seuraava !== undefined) initSeuraavaPeli(data.seuraava);
          if (data.mittari) initHontsymittari(data.mittari);
        })
        .catch(function () {
          if (config.seuraavaPeli) initSeuraavaPeli(config.seuraavaPeli);
          else initSeuraavaPeli(null);
          if (config.hontsymittari) initHontsymittari(config.hontsymittari);
        });
    });
  }

  // Hae kalenteridata (kalenterisivu: kuukausikalenteri)
  if (document.getElementById('cal-days')) {
    document.getElementById('cal-modal-close').addEventListener('click', suljeModaali);
    document.getElementById('cal-modal').addEventListener('click', function(e) {
      if (e.target === this) suljeModaali();
    });

    document.getElementById('cal-prev').addEventListener('click', function() {
      kalenteriKuukausi.setMonth(kalenteriKuukausi.getMonth() - 1);
      renderKuukausi();
    });
    document.getElementById('cal-next').addEventListener('click', function() {
      kalenteriKuukausi.setMonth(kalenteriKuukausi.getMonth() + 1);
      renderKuukausi();
    });

    // Näkymävaihto: ruudukko ↔ agenda
    var toggleBtn = document.getElementById('cal-view-toggle');
    if (toggleBtn) {
      var eventList = document.getElementById('event-list');
      if (localStorage.getItem('peikot_cal_view') === 'agenda') {
        eventList.classList.add('cal-view-agenda');
      }
      toggleBtn.addEventListener('click', function() {
        eventList.classList.toggle('cal-view-agenda');
        var isAgenda = eventList.classList.contains('cal-view-agenda');
        localStorage.setItem('peikot_cal_view', isAgenda ? 'agenda' : 'grid');
      });
    }

    // Siivoa vanhat menneet-välimuistit
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('peikot_menneet_')) localStorage.removeItem(k);
    });

    // Hae tulevat ja menneet rinnakkain
    haeConfig().then(function (config) {
    Promise.all([
      fetch(config.kalenteriUrl + '?action=tapahtumat').then(function (r) { return r.json(); }).catch(function () { return { tapahtumat: [] }; }),
      fetch(config.kalenteriUrl + '?action=menneet').then(function (r) { return r.json(); }).catch(function () { return { tapahtumat: [] }; })
    ])
      .then(function (tulokset) {
        var tulevat = tulokset[0].tapahtumat || [];
        var menneet = tulokset[1].tapahtumat || [];
        kalenteriTapahtumat = menneet.concat(tulevat);
        renderKuukausi();
      })
      .catch(function () {
        var el = document.getElementById('cal-days');
        if (el) el.innerHTML = '<div class="event-list-empty" style="grid-column:1/-1">Tapahtumia ei voitu ladata. <a href="https://calendar.google.com/calendar/embed?src=info%40vuoreksenpeikot.fi&ctz=Europe%2FHelsinki" target="_blank" rel="noopener">Tarkista Google Calendar</a></div>';
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Focus trap: estää Tab-navigoinnin modaalin ulkopuolelle
  // ---------------------------------------------------------------------------
  function trapFocus(modal) {
    var focusable = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    first.focus();

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    modal.addEventListener('keydown', handler);
    modal._trapHandler = handler;
  }

  function releaseFocus(modal) {
    if (modal._trapHandler) {
      modal.removeEventListener('keydown', modal._trapHandler);
      delete modal._trapHandler;
    }
  }

  // Tarkkaile lightbox-modaalien avautumista
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') return;
      var el = m.target;
      if (el.classList.contains('is-open') || el.classList.contains('cal-modal-open')) {
        trapFocus(el);
      } else {
        releaseFocus(el);
      }
    });
  });
  document.querySelectorAll('.lightbox, .cal-modal-overlay').forEach(function (el) {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  // ---------------------------------------------------------------------------
  // Höntsysäännöt-kortti: click + keyboard
  // ---------------------------------------------------------------------------
  var hontsyBtn = document.getElementById('hontsy-btn');
  if (hontsyBtn) {
    function avaaHontsyModal() {
      document.getElementById('hontsy-modal').classList.add('is-open');
    }
    hontsyBtn.addEventListener('click', avaaHontsyModal);
    hontsyBtn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        avaaHontsyModal();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Lightbox & modaalit: sulje ESC-näppäimellä
  // ---------------------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var lightbox = document.querySelector('.lightbox.is-open');
      if (lightbox) lightbox.classList.remove('is-open');
      var calModal = document.getElementById('cal-modal');
      if (calModal && calModal.classList.contains('cal-modal-open')) {
        calModal.classList.remove('cal-modal-open');
        document.body.style.overflow = '';
      }
    }
  });

})();
