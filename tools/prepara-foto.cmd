@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM  EleoLab - prepara le foto per il pannello
REM
REM  COME SI USA: trascina una o piu' foto (anche tutte insieme) sopra questo
REM  file. Crea la cartella "pronte" accanto alle foto, con le versioni
REM  ridotte: lato lungo 1600 px, circa 300 KB l'una.
REM  Gli originali non vengono toccati.
REM
REM  Il numero davanti al nome (01-, 02-, ...) tiene l'ordine in cui le hai
REM  trascinate: caricandole nel pannello in quell'ordine, la galleria del
REM  prodotto resta nella sequenza giusta.
REM ===========================================================================

if "%~1"=="" (
  echo.
  echo   Trascina le foto sopra questo file, non aprirlo con un doppio clic.
  echo.
  pause
  exit /b
)

set "DEST=%~dp1pronte"
if not exist "%DEST%" mkdir "%DEST%"

REM ridimensiona sul lato lungo, cosi funziona sia in verticale che in orizzontale
set "FILTRO=scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))':flags=lanczos"

set /a N=0
echo.
echo   Preparazione in corso...
echo.

for %%F in (%*) do call :una "%%~F"

echo.
echo   Fatte !N! foto. Le trovi in:
echo   %DEST%
echo.
pause
exit /b

:una
set /a N+=1
set "DUE=0!N!"
set "DUE=!DUE:~-2!"
set "USCITA=%DEST%\!DUE!-%~n1.jpg"

ffmpeg -hide_banner -loglevel error -y -i "%~1" -vf "%FILTRO%" -q:v 5 -pix_fmt yuvj420p "%USCITA%"

if exist "%USCITA%" (
  echo   ok   !DUE!-%~n1.jpg
) else (
  echo   NON riuscita: %~nx1
)
exit /b
