/* Dopo aver accettato un invito via email, Netlify Identity riporta alla home
   con un token nell'indirizzo: questo lo rimanda al pannello.
   Sta in un file esterno (non inline) per rispettare la Content-Security-Policy. */
if (window.netlifyIdentity) {
  window.netlifyIdentity.on('init', function (user) {
    if (!user) {
      window.netlifyIdentity.on('login', function () {
        document.location.href = '/admin/';
      });
    }
  });
}
