/* Segnala al CSS che il JS e attivo: gli elementi animati partono nascosti.
   Vive in un file esterno (non inline) per permettere una CSP severa. */
document.documentElement.classList.add('js');
