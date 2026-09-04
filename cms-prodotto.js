/* ==========================================================================
   EleoLab — scheda del singolo prodotto
   Legge lo slug dall'indirizzo (prodotto-singolo.html?p=peonia-di-seta),
   carica prodotti/<slug>.json e riempie la pagina.

   Senza slug, o se il file non esiste, la pagina resta com'e': il contenuto
   scritto a mano nell'HTML fa da esempio e da rete di sicurezza.
   ========================================================================== */

(function () {
  'use strict';

  var slug = new URLSearchParams(window.location.search).get('p');
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  function immagineSicura(src) {
    return /^(\/|\.\/|assets\/|https:\/\/)/i.test(String(src || ''));
  }

  var euro = function (n) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Number(n) || 0);
  };

  var ETICHETTE = {
    sartoria: 'Sartoria',
    maglieria: 'Maglieria',
    fiori: 'Fiori in seta',
    accessori: 'Accessori'
  };

  /* ------------------------------------------------------------ galleria */

  // Raccoglie solo i posti foto davvero riempiti: i vuoti spariscono.
  function fotoDisponibili(p) {
    var g = p.galleria || {};
    var lista = [];
    ['foto1', 'foto2', 'foto3', 'foto4', 'foto5'].forEach(function (k) {
      if (g[k] && immagineSicura(g[k])) lista.push(g[k]);
    });
    // se la galleria e vuota resta almeno la copertina
    if (!lista.length && immagineSicura(p.immagine)) lista.push(p.immagine);
    return lista;
  }

  function costruisciGalleria(p) {
    var riga = $('#gallery');
    if (!riga) return;

    var foto = fotoDisponibili(p);
    if (!foto.length) return;

    // proporzioni alternate: la colonna desktop non diventa monotona
    var forme = ['lg:aspect-[4/5]', 'lg:aspect-[5/4]', 'lg:aspect-square'];

    riga.textContent = '';

    foto.forEach(function (src, i) {
      var fig = document.createElement('figure');
      fig.setAttribute('data-slide', '');
      fig.className = 'media aspect-[4/5] lg:w-full ' + forme[i % forme.length] +
        (i < foto.length - 1 ? ' lg:mb-3' : '');

      var img = document.createElement('img');
      img.src = src;
      img.alt = p.titolo ? (p.titolo + ' — foto ' + (i + 1)) : '';
      img.className = 'tex';
      img.decoding = 'async';
      if (i > 0) img.loading = 'lazy';

      fig.appendChild(img);
      riga.appendChild(fig);
    });

    // i puntini della versione mobile vanno ricostruiti sui nuovi elementi
    var punti = $('#gallery-dots');
    if (punti) punti.textContent = '';
    var contatore = $('#gallery-index');
    if (contatore) contatore.textContent = '1 / ' + foto.length;

    document.dispatchEvent(new CustomEvent('eleolab:galleria'));
  }

  /* ------------------------------------------------------------- testi -- */

  function riempi(p) {
    document.title = p.titolo + ' — EleoLab';

    var descrizioneMeta = $('meta[name="description"]');
    if (descrizioneMeta && p.descrizione) {
      descrizioneMeta.setAttribute('content', String(p.descrizione).slice(0, 160));
    }
    var ogImg = $('meta[property="og:image"]');
    if (ogImg && immagineSicura(p.immagine)) {
      ogImg.setAttribute('content', new URL(p.immagine, location.origin).href);
    }

    $$('[data-p="titolo"]').forEach(function (el) { el.textContent = p.titolo || ''; });
    $$('[data-p="prezzo"]').forEach(function (el) { el.textContent = euro(p.prezzo); });

    var occhiello = $('[data-p="occhiello"]');
    if (occhiello) {
      var voce = ETICHETTE[p.categoria] || 'Catalogo';
      occhiello.textContent = p.materiale ? (voce + ' — ' + p.materiale) : voce;
    }

    var nota = $('[data-p="prezzo-nota"]');
    if (nota) nota.textContent = euro(p.prezzo) + (p.materiale ? ' · ' + p.materiale : '');

    var testo = $('[data-p="descrizione"]');
    if (testo && p.descrizione) {
      testo.textContent = '';
      String(p.descrizione).split(/\n\s*\n/).forEach(function (blocco) {
        var par = document.createElement('p');
        par.textContent = blocco.trim();
        testo.appendChild(par);
      });
    }

    // i due pulsanti "aggiungi al carrello" puntano al prodotto giusto
    $$('[data-add]').forEach(function (b) {
      b.setAttribute('data-id', slug);
      b.setAttribute('data-nome', p.titolo || '');
      b.setAttribute('data-prezzo', String(p.prezzo || 0));
      b.setAttribute('data-img', p.immagine || '');
    });
  }

  /* ---------------------------------------------------------- correlati */

  function correlati(corrente) {
    var griglia = $('#correlati');
    if (!griglia) return;
    griglia = griglia.closest('.wrap').querySelector('.grid');
    if (!griglia) return;

    fetch('prodotti/index.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (tutti) {
        if (!Array.isArray(tutti)) return;

        var altri = tutti.filter(function (p) {
          return p.slug !== corrente.slug && !p.archiviato;
        });

        // prima quelli della stessa categoria
        altri.sort(function (a, b) {
          var sa = a.categoria === corrente.categoria ? 0 : 1;
          var sb = b.categoria === corrente.categoria ? 0 : 1;
          return sa - sb;
        });

        altri = altri.slice(0, 3);
        if (!altri.length) return;

        var classi = [
          'group md:col-span-4',
          'group md:col-span-4 md:col-start-5 md:mt-12',
          'group md:col-span-3 md:col-start-10 md:mt-4'
        ];
        var forme = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-square'];

        griglia.textContent = '';

        altri.forEach(function (p, i) {
          var a = document.createElement('a');
          a.href = 'prodotto-singolo.html?p=' + encodeURIComponent(p.slug);
          a.className = classi[i] || classi[0];

          var media = document.createElement('div');
          media.className = 'media ' + (forme[i] || forme[0]);
          if (immagineSicura(p.immagine)) {
            var img = document.createElement('img');
            img.src = p.immagine;
            img.alt = p.titolo || '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'tex tex-zoom';
            media.appendChild(img);
          }

          var riga = document.createElement('div');
          riga.className = 'mt-3 flex items-baseline justify-between gap-3';

          var nome = document.createElement('p');
          nome.className = 'font-display text-[13px] text-inchiostro';
          nome.textContent = p.titolo || '';

          var prezzo = document.createElement('p');
          prezzo.className = 't-price';
          prezzo.textContent = euro(p.prezzo);

          riga.appendChild(nome);
          riga.appendChild(prezzo);
          a.appendChild(media);
          a.appendChild(riga);
          griglia.appendChild(a);
        });
      })
      .catch(function () { /* restano i correlati scritti a mano */ });
  }

  /* ------------------------------------------------------------ avvio -- */

  fetch('prodotti/' + slug + '.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('prodotto non trovato');
      return r.json();
    })
    .then(function (p) {
      p.slug = slug;

      // un pezzo archiviato non ha piu una pagina pubblica
      if (p.archiviato) {
        window.location.replace('shop.html');
        return;
      }

      riempi(p);
      costruisciGalleria(p);
      correlati(p);

      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    })
    .catch(function () {
      /* slug sconosciuto: resta la scheda di esempio nell'HTML */
    });
})();
