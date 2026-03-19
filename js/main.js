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
  // Jäsenmäärä: hae Apps Scriptistä (live Sheetsistä), fallback config.json
  // ---------------------------------------------------------------------------
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxe5zT0oY_1dgBaQ8CPJgdIB0oJ7sqiXNlC4tZwMvCW9GUK5bniqYM-hsTlI0c_pLhf/exec';

  function initLaskuri() {
    document.querySelectorAll('.jasenmaara-luku').forEach(function (laskuri) {
      var maara = parseInt(laskuri.getAttribute('data-maara'), 10) || 0;
      var animoitu = false;
      function countUp() {
        if (animoitu || maara === 0) return;
        animoitu = true;
        var kesto = 1500;
        var alku = performance.now();
        function askel(nyt) {
          var edistyminen = Math.min((nyt - alku) / kesto, 1);
          var helpotus = 1 - Math.pow(1 - edistyminen, 3);
          laskuri.textContent = Math.round(helpotus * maara);
          if (edistyminen < 1) requestAnimationFrame(askel);
        }
        requestAnimationFrame(askel);
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries, obs) {
          if (entries[0].isIntersecting) { countUp(); obs.disconnect(); }
        }, { threshold: 0.5 }).observe(laskuri);
      } else {
        countUp();
      }
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

  fetch(APPS_SCRIPT_URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.jasenmaara > 0) {
        asetaJasenmaara(data.jasenmaara);
      } else {
        throw new Error('Virheellinen jäsenmäärä');
      }
    })
    .catch(function () {
      // Varasuunnitelma: käytä config.json (staattinen arvo)
      fetch('config.json')
        .then(function (r) { return r.json(); })
        .then(function (config) { asetaJasenmaara(config.jasenmaara); });
    });

  // ---------------------------------------------------------------------------
  // Lightbox: sulje ESC-näppäimellä
  // ---------------------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.querySelector('.lightbox.is-open');
      if (modal) modal.classList.remove('is-open');
    }
  });

})();
