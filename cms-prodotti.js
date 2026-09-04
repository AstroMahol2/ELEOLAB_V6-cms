/* ==========================================================================
   EleoLab — prodotti dal CMS
   Legge prodotti/index.json (generato a ogni pubblicazione da
   tools/genera-indice.sh) e stampa le schede nella griglia esistente.

   Se l'indice non c'e' o e' vuoto, la pagina resta com'e': le schede scritte
   a mano nell'HTML restano al loro posto. Nessuna pagina bianca, mai.
   ========================================================================== */

(function () {
  'use strict';

  var griglia = document.getElementById('griglia-prodotti');
  if (!griglia) return;

  var zona = griglia.closest('.zona-catalogo');
  var velo = zona ? zona.querySelector('.velo-espandi') : null;
  var bottone = zona ? zona.querySelector('.btn-espandi') : null;
  var contatore = document.getElementById('shop-count');

  // quante schede restano visibili prima della sfumatura
  var LIMITE = parseInt(zona && zona.getAttribute('data-limite'), 10) || 6;

  /* --------------------------------------------------------------- utilita */

  function nodo(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (testo !== undefined && testo !== null) el.textContent = testo;
    return el;
  }

  // accetta solo percorsi interni o https: niente javascript: o simili
  function immagineSicura(src) {
    return /^(\/|\.\/|assets\/|https:\/\/)/.test(String(src || ''));
  }

  var euro = function (n) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Number(n) || 0);
  };

  /* ------------------------------------------------------- una scheda ---- */

  function scheda(p) {
    var art = nodo('article', 'm-item');
    art.setAttribute('data-cat', p.categoria || 'sartoria');

    var inner = nodo('div', 'm-inner');

    var a = nodo('a', 'group block');
    a.href = 'prodotto-singolo.html?p=' + encodeURIComponent(p.slug || '');

    var media = nodo('div', 'media aspect-[4/5]');
    if (immagineSicura(p.immagine)) {
      var img = nodo('img', 'tex tex-zoom');
      img.src = p.immagine;
      img.alt = p.titolo || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    }
    a.appendChild(media);

    if (p.materiale) a.appendChild(nodo('p', 't-micro mt-4 text-ocra', p.materiale));
    a.appendChild(nodo('h2', 'mt-1 font-display text-base text-inchiostro', p.titolo || ''));
    a.appendChild(nodo('p', 't-price mt-1', euro(p.prezzo)));

    inner.appendChild(a);
    art.appendChild(inner);
    return art;
  }

  /* ------------------------------------------------- limite e sfumatura -- */

  function applicaLimite() {
    var visibili = [];
    var tutte = Array.prototype.slice.call(griglia.querySelectorAll('.m-item'));

    tutte.forEach(function (el) {
      if (!el.classList.contains('is-hidden')) visibili.push(el);
    });

    var daNascondere = visibili.length - LIMITE;

    visibili.forEach(function (el, i) {
      el.classList.toggle('is-oltre-limite', zona.classList.contains('is-chiusa') && i >= LIMITE);
    });

    // la sfumatura e il bottone servono solo se c'e' davvero altro da vedere
    var serve = daNascondere > 0;
    if (velo) velo.hidden = !serve || !zona.classList.contains('is-chiusa');
    if (bottone) {
      bottone.hidden = !serve || !zona.classList.contains('is-chiusa');
      var etichetta = bottone.querySelector('.btn-espandi-testo');
      if (etichetta) {
        etichetta.textContent = 'Mostra altri ' + daNascondere +
          (daNascondere === 1 ? ' pezzo' : ' pezzi');
      }
    }
    if (contatore) contatore.textContent = visibili.length;
  }

  function espandi() {
    zona.classList.remove('is-chiusa');
    applicaLimite();

    if (window.gsap) {
      var nuove = griglia.querySelectorAll('.m-item:not(.is-oltre-limite) .m-inner');
      window.gsap.from(Array.prototype.slice.call(nuove, LIMITE), {
        opacity: 0, y: 26, duration: 0.7, stagger: 0.05, ease: 'power3.out'
      });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
  }

  if (bottone) bottone.addEventListener('click', espandi);

  // i filtri del catalogo rimescolano le carte: il limite va riapplicato
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-filter]')) {
      window.setTimeout(applicaLimite, 0);
    }
  });

  /* ---------------------------------------------------------- caricamento */

  fetch('prodotti/index.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('indice non disponibile');
      return r.json();
    })
    .then(function (prodotti) {
      if (!Array.isArray(prodotti) || !prodotti.length) return;

      // in evidenza per primi, poi in ordine alfabetico
      prodotti.sort(function (a, b) {
        if (!!b.evidenza !== !!a.evidenza) return b.evidenza ? 1 : -1;
        return String(a.titolo || '').localeCompare(String(b.titolo || ''), 'it');
      });

      griglia.textContent = '';
      prodotti.forEach(function (p) { griglia.appendChild(scheda(p)); });

      if (zona) zona.classList.add('is-chiusa');
      applicaLimite();

      if (window.gsap) {
        window.gsap.from(griglia.querySelectorAll('.m-item:not(.is-oltre-limite) .m-inner'), {
          opacity: 0, y: 26, duration: 0.8, stagger: 0.06, ease: 'power3.out'
        });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      }
    })
    .catch(function () {
      /* nessun indice: restano le schede scritte a mano nell'HTML */
    });
})();
