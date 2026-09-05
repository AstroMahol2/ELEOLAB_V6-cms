# ============================================================================
#  EleoLab - prepara le foto per il pannello
#  Ridimensiona sul lato lungo a 1600 px alla massima qualita JPEG (~600 KB).
#  Gli originali non vengono toccati: il risultato finisce in "pronte".
#  Si usa trascinando le foto sopra prepara-foto.cmd
# ============================================================================

param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Foto)

$ErrorActionPreference = 'Continue'

function Attendi {
    Write-Host ""
    Write-Host "  Premi Invio per chiudere." -ForegroundColor DarkGray
    [void](Read-Host)
}

Write-Host ""
Write-Host "  EleoLab - preparazione foto" -ForegroundColor Cyan
Write-Host "  ----------------------------"

if (-not $Foto -or $Foto.Count -eq 0) {
    Write-Host ""
    Write-Host "  Trascina le foto sopra prepara-foto.cmd." -ForegroundColor Yellow
    Write-Host "  Non aprirlo con un doppio clic: non saprebbe cosa ridurre."
    Attendi
    return
}

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) {
    Write-Host ""
    Write-Host "  Non trovo ffmpeg su questo computer." -ForegroundColor Red
    Write-Host "  Installalo con:  winget install Gyan.FFmpeg"
    Attendi
    return
}

# le foto valide, nell'ordine in cui sono state trascinate
$valide = @()
foreach ($f in $Foto) {
    if (Test-Path -LiteralPath $f -PathType Leaf) { $valide += (Resolve-Path -LiteralPath $f).Path }
    else { Write-Host "  salto (non trovata): $f" -ForegroundColor DarkYellow }
}

if ($valide.Count -eq 0) { Write-Host "  Nessuna foto da preparare." -ForegroundColor Red; Attendi; return }

# .NET invece di Split-Path: in PowerShell 5.1 -LiteralPath con -Parent e ambiguo
$dest = Join-Path ([System.IO.Path]::GetDirectoryName($valide[0])) 'pronte'
if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }

# lato lungo a 1600: funziona sia in verticale sia in orizzontale
$scala = "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))':flags=lanczos"

# I PNG ritagliati hanno lo sfondo trasparente: in JPEG diventerebbe nero.
# Qui la foto viene appoggiata su un fondo bianco prima di essere salvata.
$filtro = "[0:v]$scala[s];color=white[c];[c][s]scale2ref[c2][s2];[c2][s2]overlay=format=auto:shortest=1"

$n = 0
$risparmio = 0

foreach ($src in $valide) {
    $n++
    $numero = '{0:D2}' -f $n
    $nome = [System.IO.Path]::GetFileNameWithoutExtension($src)
    $uscita = Join-Path $dest "$numero-$nome.jpg"

    & $ffmpeg -hide_banner -loglevel error -y -i $src -filter_complex $filtro -q:v 2 -pix_fmt yuvj420p $uscita 2>$null

    if (Test-Path -LiteralPath $uscita) {
        $prima = [int]((Get-Item -LiteralPath $src).Length / 1KB)
        $dopo = [int]((Get-Item -LiteralPath $uscita).Length / 1KB)
        $risparmio += ($prima - $dopo)
        Write-Host ("  ok   {0}-{1}.jpg   {2} KB -> {3} KB" -f $numero, $nome, $prima, $dopo) -ForegroundColor Green
    } else {
        Write-Host ("  NON riuscita: {0}" -f (Split-Path $src -Leaf)) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ("  Fatte {0} foto, risparmiati {1} KB." -f $n, $risparmio) -ForegroundColor Cyan
Write-Host "  Le trovi in: $dest"
Write-Host ""
Write-Host "  Il numero davanti al nome tiene l'ordine in cui le hai trascinate:"
Write-Host "  caricandole nel pannello in quell'ordine, la galleria resta coerente."
Attendi
