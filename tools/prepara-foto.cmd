@echo off
REM ===========================================================================
REM  EleoLab - prepara le foto per il pannello
REM  Trascina una o piu' foto sopra questo file.
REM  Il lavoro vero lo fa prepara-foto.ps1, qui accanto.
REM ===========================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0prepara-foto.ps1" %*
