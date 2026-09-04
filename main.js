/* ==========================================================================
   EleoLab — main.js
   Vanilla JS modulare. Unica dipendenza esterna: GSAP + ScrollTrigger.
   Ogni modulo e autonomo: se il markup non esiste nella pagina, esce subito.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ utils */

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var ridottoMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var haGsap = typeof window.gsap !== 'undefined';

  var euro = function (n) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(n);
  };

  /* ---------------------------------------------------------------- header */

  var Header = (function () {
    var header = $('#site-header');
    if (!header) return {};

    var ultimo = 0;
    // se la pagina ha una barra agganciata sotto lo header (i filtri del
    // catalogo), lo header resta sempre visibile: altrimenti si aprirebbe un
    // varco tra le due barre
    var fisso = !!$('[data-sticky-under-header]');

    function aggiorna() {
      var y = window.pageYOffset;
      header.classList.toggle('is-stuck', y > 40);

      // altrove lo header si ritrae scendendo: piu spazio verticale alla pagina
      var giu = !fisso && y > ultimo && y > 280;
      if (!document.body.classList.contains('is-locked')) {
        header.classList.toggle('is-hidden', giu);
      }
      ultimo = y;
    }

    window.addEventListener('scroll', aggiorna, { passive: true });
    aggiorna();

    return { el: header };
  })();

  /* ------------------------------------------------------- voce di menu attiva */

  (function navAttiva() {
    var pagina = location.pathname.split('/').pop() || 'index.html';
    $$('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === pagina) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ------------------------------------------------- pannelli (menu/ricerca/carrello) */

  var Pannelli = (function () {
    var apertoOra = null;
    var ultimoFocus = null;

    function apri(id) {
      var p = document.getElementById(id);
      if (!p) return;
      if (apertoOra && apertoOra !== p) chiudi();

      ultimoFocus = document.activeElement;
      p.classList.add('is-open');
      p.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      apertoOra = p;

      $$('[data-panel-toggle="' + id + '"]').forEach(function (b) {
        b.setAttribute('aria-expanded', 'true');
        b.classList.add('is-open');
      });

      var primo = p.querySelector('input, a, button');
      if (primo) window.setTimeout(function () { primo.focus(); }, 260);

      if (haGsap && !ridottoMovimento) {
        var voci = $$('[data-panel-item]', p);
        if (voci.length) {
          window.gsap.fromTo(
            voci,
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, stagger: 0.055, ease: 'power3.out', delay: 0.12 }
          );
        }
      }
    }

    function chiudi() {
      if (!apertoOra) return;
      apertoOra.classList.remove('is-open');
      apertoOra.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');

      $$('[data-panel-toggle]').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        b.classList.remove('is-open');
      });

      apertoOra = null;
      if (ultimoFocus && ultimoFocus.focus) ultimoFocus.focus();
    }

    $$('[data-panel-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-panel-toggle');
        var p = document.getElementById(id);
        if (p && p.classList.contains('is-open')) chiudi();
        else apri(id);
      });
    });

    $$('[data-panel-close]').forEach(function (btn) {
      btn.addEventListener('click', chiudi);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') chiudi();
    });

    // navigando via da un link del menu, il pannello si chiude
    $$('.panel a').forEach(function (a) {
      a.addEventListener('click', function () { window.setTimeout(chiudi, 60); });
    });

    return { apri: apri, chiudi: chiudi };
  })();

  /* --------------------------------------------------------------- carrello */

  var Carrello = (function () {
    var CHIAVE = 'eleolab:carrello';
    var righe = [];

    function leggi() {
      try {
        var raw = window.localStorage.getItem(CHIAVE);
        righe = raw ? JSON.parse(raw) : [];
      } catch (err) {
        righe = [];
      }
      if (!Array.isArray(righe)) righe = [];
    }

    function salva() {
      try {
        window.localStorage.setItem(CHIAVE, JSON.stringify(righe));
      } catch (err) { /* modalita privata: il carrello resta in memoria */ }
    }

    function totalePezzi() {
      return righe.reduce(function (t, r) { return t + r.qta; }, 0);
    }

    function subtotale() {
      return righe.reduce(function (t, r) { return t + r.prezzo * r.qta; }, 0);
    }

    function disegna() {
      $$('[data-cart-count]').forEach(function (el) {
        var n = totalePezzi();
        el.textContent = n;
        el.classList.toggle('opacity-0', n === 0);
      });

      var lista = $('#cart-items');
      if (!lista) return;

      var vuoto = $('#cart-empty');
      var piede = $('#cart-footer');

      lista.textContent = '';

      if (!righe.length) {
        if (vuoto) vuoto.hidden = false;
        if (piede) piede.hidden = true;
        return;
      }

      if (vuoto) vuoto.hidden = true;
      if (piede) piede.hidden = false;

      righe.forEach(function (r, i) { lista.appendChild(rigaCarrello(r, i)); });

      var sub = $('#cart-subtotal');
      if (sub) sub.textContent = euro(subtotale());
    }

    /* Le righe del carrello si costruiscono con le API del DOM, non con
       stringhe HTML: il testo passa sempre da textContent, quindi nessun
       contenuto puo trasformarsi in markup eseguibile. */
    function nodo(tag, classe, testo) {
      var el = document.createElement(tag);
      if (classe) el.className = classe;
      if (testo !== undefined && testo !== null) el.textContent = testo;
      return el;
    }

    // solo percorsi locali, https o immagini inline: niente javascript: o simili
    function immagineSicura(src) {
      return /^(assets\/|\.\/|\/|https:\/\/|data:image\/)/i.test(String(src || ''));
    }

    function bottoneQta(delta, indice, etichetta, segno) {
      var b = nodo('button', 'text-ardesia hover:text-gotico leading-none', segno);
      b.type = 'button';
      b.setAttribute('data-qta', String(delta));
      b.setAttribute('data-i', String(indice));
      b.setAttribute('aria-label', etichetta);
      return b;
    }

    function rigaCarrello(r, i) {
      var li = nodo('li', 'flex gap-4 py-6 border-b border-linea');

      var media = nodo('div', 'media miniatura w-20 shrink-0');
      if (immagineSicura(r.img)) {
        var img = nodo('img', 'tex');
        img.src = r.img;
        img.alt = '';
        img.loading = 'lazy';
        media.appendChild(img);
      }

      var corpo = nodo('div', 'flex-1 min-w-0');
      corpo.appendChild(nodo('p', 'font-display text-sm text-inchiostro leading-tight', r.nome));
      if (r.variante) corpo.appendChild(nodo('p', 't-micro text-salvia mt-1', r.variante));

      var riga = nodo('div', 'flex items-center justify-between mt-4');
      var conta = nodo('div', 'flex items-center gap-4 border border-linea px-3 py-1');
      conta.appendChild(bottoneQta(-1, i, 'Riduci quantita', '−'));
      conta.appendChild(nodo('span', 't-price', r.qta));
      conta.appendChild(bottoneQta(1, i, 'Aumenta quantita', '+'));

      riga.appendChild(conta);
      riga.appendChild(nodo('span', 't-price text-inchiostro', euro(r.prezzo * r.qta)));
      corpo.appendChild(riga);

      li.appendChild(media);
      li.appendChild(corpo);
      return li;
    }

    function aggiungi(riga) {
      var esiste = null;
      righe.forEach(function (r) {
        if (r.id === riga.id && r.variante === riga.variante) esiste = r;
      });

      if (esiste) esiste.qta += riga.qta;
      else righe.push(riga);

      salva();
      disegna();
    }

    // quantita e rimozione
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-qta]') : null;
      if (!b) return;
      var i = parseInt(b.getAttribute('data-i'), 10);
      var d = parseInt(b.getAttribute('data-qta'), 10);
      if (!righe[i]) return;
      righe[i].qta += d;
      if (righe[i].qta < 1) righe.splice(i, 1);
      salva();
      disegna();
    });

    // aggiungi al carrello
    $$('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var selettore = document.getElementById(btn.getAttribute('data-variant-source') || '');
        var variante = selettore ? selettore.value : (btn.getAttribute('data-variante') || '');

        aggiungi({
          id: btn.getAttribute('data-id'),
          nome: btn.getAttribute('data-nome'),
          prezzo: parseFloat(btn.getAttribute('data-prezzo')) || 0,
          img: btn.getAttribute('data-img'),
          variante: variante,
          qta: 1
        });

        Pannelli.apri('panel-cart');
      });
    });

    var checkout = $('#cart-checkout');
    if (checkout) {
      checkout.addEventListener('click', function () {
        var nota = $('#cart-nota');
        if (nota) {
          nota.hidden = false;
          window.setTimeout(function () { nota.hidden = true; }, 4200);
        }
      });
    }

    leggi();
    disegna();

    return { aggiungi: aggiungi };
  })();

  /* ----------------------------------------------------------- ricerca */

  (function ricerca() {
    var input = $('#search-input');
    if (!input) return;

    var voci = $$('[data-search-item]');
    var vuoto = $('#search-empty');

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var visibili = 0;

      voci.forEach(function (v) {
        var testo = (v.getAttribute('data-search-item') || '').toLowerCase();
        var ok = !q || testo.indexOf(q) > -1;
        v.hidden = !ok;
        if (ok) visibili++;
      });

      if (vuoto) vuoto.hidden = visibili !== 0;
    });

    var form = $('#search-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        window.location.href = 'shop.html';
      });
    }
  })();

  /* ------------------------------------------------------------- accordion */

  (function accordion() {
    $$('.acc-trigger').forEach(function (trigger) {
      var corpo = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!corpo) return;

      trigger.addEventListener('click', function () {
        var aperto = trigger.getAttribute('aria-expanded') === 'true';

        // fisarmonica: chiude i fratelli dello stesso gruppo
        var gruppo = trigger.getAttribute('data-acc-group');
        if (gruppo && !aperto) {
          $$('.acc-trigger[data-acc-group="' + gruppo + '"]').forEach(function (t) {
            if (t === trigger) return;
            var c = document.getElementById(t.getAttribute('aria-controls'));
            t.setAttribute('aria-expanded', 'false');
            if (c) c.style.height = '0px';
          });
        }

        trigger.setAttribute('aria-expanded', aperto ? 'false' : 'true');
        corpo.style.height = aperto ? '0px' : corpo.scrollHeight + 'px';
      });
    });

    window.addEventListener('resize', function () {
      $$('.acc-trigger[aria-expanded="true"]').forEach(function (t) {
        var c = document.getElementById(t.getAttribute('aria-controls'));
        if (c) c.style.height = c.scrollHeight + 'px';
      });
    });
  })();

  /* --------------------------------------------------- filtri catalogo (shop) */

  (function filtri() {
    var bottoni = $$('[data-filter]');
    if (!bottoni.length) return;

    var contatore = $('#shop-count');

    bottoni.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-filter');

        // le schede si rileggono a ogni clic: quelle stampate dal CMS
        // arrivano dopo questo script e altrimenti resterebbero fuori
        var items = $$('.m-item');

        bottoni.forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var visibili = 0;
        items.forEach(function (it) {
          var ok = cat === 'tutto' || it.getAttribute('data-cat') === cat;
          it.classList.toggle('is-hidden', !ok);
          if (ok) visibili++;
        });

        if (contatore) contatore.textContent = visibili;

        if (haGsap && !ridottoMovimento) {
          window.gsap.fromTo(
            $$('.m-item:not(.is-hidden) .m-inner'),
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power2.out' }
          );
        }
        if (haGsap && window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
  })();

  /* ------------------------------------------- galleria prodotto (slider mobile) */

  (function galleria() {
    var riga = $('#gallery');
    if (!riga) return;

    var slides = $$('[data-slide]', riga);
    var punti = $('#gallery-dots');
    var contatore = $('#gallery-index');
    if (!slides.length) return;

    if (punti && !punti.children.length) {
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dot' + (i === 0 ? ' is-on' : '');
        b.setAttribute('aria-label', 'Vai alla foto ' + (i + 1));
        b.addEventListener('click', function () {
          riga.scrollTo({ left: slides[i].offsetLeft - riga.offsetLeft, behavior: 'smooth' });
        });
        punti.appendChild(b);
      });
    }

    var pendente = false;
    riga.addEventListener('scroll', function () {
      if (pendente) return;
      pendente = true;
      window.requestAnimationFrame(function () {
        pendente = false;
        var i = Math.round(riga.scrollLeft / (slides[0].offsetWidth || 1));
        i = Math.max(0, Math.min(slides.length - 1, i));
        if (punti) {
          $$('.dot', punti).forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
        }
        if (contatore) contatore.textContent = (i + 1) + ' / ' + slides.length;
      });
    }, { passive: true });

    if (contatore) contatore.textContent = '1 / ' + slides.length;
  })();

  /* ---------------------------------------------------------------- form */

  (function form() {
    var forms = $$('[data-validate]');
    if (!forms.length) return;

    var reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var locale = ['localhost', '127.0.0.1', ''].indexOf(location.hostname) > -1 ||
      location.protocol === 'file:';

    forms.forEach(function (f) {
      f.addEventListener('submit', function (e) {
        var errori = 0;

        $$('[required]', f).forEach(function (campo) {
          var err = campo.parentNode.querySelector('.field-error');
          var valore = (campo.value || '').trim();
          var ko = !valore ||
            (campo.type === 'email' && !reEmail.test(valore)) ||
            (campo.type === 'checkbox' && !campo.checked);

          if (err) err.classList.toggle('is-on', ko);
          campo.style.borderBottomColor = ko ? 'var(--gotico)' : '';
          if (ko) errori++;
        });

        if (errori) {
          e.preventDefault();
          var primo = f.querySelector('.field-error.is-on');
          if (primo && primo.scrollIntoView) {
            primo.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        // in locale non c e il backend Netlify: mostriamo lo stato di conferma
        if (locale) {
          e.preventDefault();
          var ok = f.querySelector('[data-success]');
          if (ok) {
            f.querySelectorAll('[data-form-body]').forEach(function (x) { x.hidden = true; });
            ok.hidden = false;
            if (haGsap && !ridottoMovimento) {
              window.gsap.fromTo(ok, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
            }
          }
        }
      });
    });
  })();

  /* ------------------------------------------------------------------ anno */

  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ------------------------------------------- accesso al pannello contenuti
     Il bottone minuscolo in fondo al footer apre il login di Netlify Identity.
     Se il widget non c'e' (o non ha ancora caricato), porta direttamente a
     /admin/, dove il login viene comunque chiesto. */

  (function accessoPannello() {
    var tasto = $('#accesso-pannello');
    if (!tasto) return;

    tasto.addEventListener('click', function () {
      if (window.netlifyIdentity && window.netlifyIdentity.open) {
        window.netlifyIdentity.open();
      } else {
        window.location.href = '/admin/';
      }
    });

    // a login avvenuto si entra nel pannello
    if (window.netlifyIdentity && window.netlifyIdentity.on) {
      window.netlifyIdentity.on('login', function () {
        window.location.href = '/admin/';
      });
    }
  })();

  /* --------------------------------------------------- tasto destro disattivato
     Nei campi del modulo resta attivo: servono correttore, incolla e
     suggerimenti della tastiera. */

  document.addEventListener('contextmenu', function (e) {
    var campo = e.target.closest && e.target.closest('input, textarea, select');
    if (campo) return;
    e.preventDefault();
  });

  /* ------------------------------------------------------------ animazioni */

  function spezzaInParole(el) {
    if (el.dataset.splitted === '1') return [];
    if (el.children.length) return []; // markup annidato: non tocchiamo nulla

    var parole = (el.textContent || '').trim().split(/\s+/);
    var interni = [];
    el.textContent = '';

    parole.forEach(function (parola, i) {
      var esterno = document.createElement('span');
      esterno.style.display = 'inline-block';
      esterno.style.overflow = 'hidden';
      esterno.style.verticalAlign = 'top';
      esterno.style.paddingBottom = '0.08em';

      var interno = document.createElement('span');
      interno.style.display = 'inline-block';
      interno.style.willChange = 'transform';
      interno.textContent = parola;

      esterno.appendChild(interno);
      el.appendChild(esterno);
      if (i < parole.length - 1) el.appendChild(document.createTextNode(' '));
      interni.push(interno);
    });

    el.dataset.splitted = '1';
    return interni;
  }

  function animazioni() {
    if (!haGsap || ridottoMovimento) {
      $$('[data-reveal]').forEach(function (el) { el.style.opacity = 1; });
      $$('[data-fiore]').forEach(function (el) {
        el.style.opacity = el.getAttribute('data-opacita') || 0.5;
      });
      return;
    }

    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    var trigger = function (el, start) {
      return { trigger: el, start: start || 'top 88%', once: true };
    };

    /* --- hero: entrata immediata al caricamento -------------------------- */
    var hero = $('[data-hero]');
    if (hero) {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      var titolo = $('[data-hero-title]', hero);

      if (titolo) {
        var parole = spezzaInParole(titolo);
        titolo.style.opacity = 1;
        if (parole.length) {
          tl.from(parole, { yPercent: 118, duration: 1.15, stagger: 0.07 }, 0.15);
        }
      }

      tl.fromTo($$('[data-hero-fade]', hero),
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.12 },
        0.5
      );
    }

    /* --- titoli con maschera per parola ---------------------------------- */
    $$('[data-split]').forEach(function (el) {
      if (el.closest('[data-hero]')) return;
      var parole = spezzaInParole(el);
      el.style.opacity = 1;
      if (!parole.length) return;

      gsap.from(parole, {
        yPercent: 118,
        duration: 1.05,
        ease: 'power3.out',
        stagger: 0.045,
        scrollTrigger: trigger(el, 'top 85%')
      });
    });

    /* --- rivelazioni singole e a gruppi ---------------------------------- */
    $$('[data-stagger]').forEach(function (gruppo) {
      var figli = $$('[data-reveal]', gruppo);
      if (!figli.length) return;

      gsap.fromTo(figli,
        { opacity: 0, y: 34 },
        {
          opacity: 1,
          y: 0,
          duration: 0.95,
          ease: 'power3.out',
          stagger: 0.09,
          scrollTrigger: trigger(gruppo)
        }
      );
      figli.forEach(function (f) { f.dataset.done = '1'; });
    });

    $$('[data-reveal]').forEach(function (el) {
      if (el.dataset.done === '1' || el.closest('[data-hero]')) return;
      var da = el.getAttribute('data-reveal') === 'fade' ? 0 : 34;
      gsap.fromTo(el,
        { opacity: 0, y: da },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          delay: parseFloat(el.getAttribute('data-delay')) || 0,
          scrollTrigger: trigger(el)
        }
      );
    });

    /* --- parallasse leggera sulle immagini ------------------------------- */
    if (window.ScrollTrigger) {
      $$('[data-parallax]').forEach(function (media) {
        var img = media.querySelector('img');
        if (!img) return;
        var forza = parseFloat(media.getAttribute('data-parallax')) || 8;

        gsap.fromTo(img,
          { yPercent: -forza, scale: 1.12 },
          {
            yPercent: forza,
            scale: 1.12,
            ease: 'none',
            scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true }
          }
        );
      });

      /* --- decori floreali -------------------------------------------
         Due tween separati e non in conflitto: uno sull opacita (compaiono
         in dissolvenza allo scroll), uno sulla y (galleggiano in parallasse).
         --------------------------------------------------------------- */
      $$('[data-fiore]').forEach(function (fiore) {
        var opacita = parseFloat(fiore.getAttribute('data-opacita')) || 0.5;
        var forza = parseFloat(fiore.getAttribute('data-fiore')) || 40;

        gsap.fromTo(fiore,
          { opacity: 0, scale: 0.9 },
          {
            opacity: opacita,
            scale: 1,
            duration: 1.6,
            ease: 'power2.out',
            scrollTrigger: trigger(fiore, 'top 96%')
          }
        );

        gsap.fromTo(fiore,
          { y: forza },
          {
            y: -forza,
            ease: 'none',
            scrollTrigger: {
              trigger: fiore.parentNode,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2
            }
          }
        );
      });

      // linee che si disegnano
      $$('[data-linea]').forEach(function (l) {
        gsap.fromTo(l,
          { scaleX: 0, transformOrigin: 'left center' },
          {
            scaleX: 1,
            duration: 1.4,
            ease: 'power2.inOut',
            scrollTrigger: trigger(l, 'top 92%')
          }
        );
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', animazioni);
  } else {
    animazioni();
  }

  // il video hero: se il browser blocca l autoplay, mostriamo comunque il poster
  var video = $('[data-hero-video]');
  if (video) {
    var prova = video.play();
    if (prova && prova.catch) prova.catch(function () { video.controls = false; });
  }
})();
