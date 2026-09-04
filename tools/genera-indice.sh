#!/usr/bin/env bash
# ============================================================================
# Costruisce prodotti/index.json unendo tutti i JSON scritti dal pannello.
#
# Serve perche' un sito statico non puo' elencare il contenuto di una cartella:
# il browser deve sapere in anticipo quali file esistono. Con un unico indice
# la pagina Prodotti fa una sola richiesta invece di una per prodotto.
#
# Gira da solo a ogni pubblicazione (vedi "command" in netlify.toml).
# In locale: bash tools/genera-indice.sh
# ============================================================================
set -e

cd "$(dirname "$0")/.."

sorgente="prodotti"
uscita="$sorgente/index.json"
tmp="$(mktemp)"

printf '[' > "$tmp"
primo=1
n=0

for f in "$sorgente"/*.json; do
  [ -e "$f" ] || continue
  nome="$(basename "$f")"
  [ "$nome" = "index.json" ] && continue

  slug="${nome%.json}"

  [ $primo -eq 0 ] && printf ',' >> "$tmp"
  primo=0
  n=$((n + 1))

  # inserisce lo slug come primo campo dell'oggetto, poi copia il resto
  printf '\n{"slug":"%s",' "$slug" >> "$tmp"
  sed '1s/^[[:space:]]*{[[:space:]]*//' "$f" >> "$tmp"
done

printf '\n]\n' >> "$tmp"
mv "$tmp" "$uscita"

echo "indice rigenerato: $uscita ($n prodotti)"
