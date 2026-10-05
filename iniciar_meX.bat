@echo off
setlocal
cd /d "%~dp0"
set PORT=8765

rem Tenta Python Launcher
where py >nul 2>&1
if %errorlevel%==0 goto PYTHON
where python >nul 2>&1
if %errorlevel%==0 goto PYTHON_EXE

rem Sem Python, usa PowerShell (disponível no Windows)
start "MeX Server" powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Get-Location).Path; $listener=New-Object Net.HttpListener; $listener.Prefixes.Add('http://127.0.0.1:%PORT%/'); $listener.Start(); Write-Host 'MeX em http://127.0.0.1:%PORT%/'; while($listener.IsListening){ $ctx=$listener.GetContext(); try{ $p=$ctx.Request.Url.AbsolutePath.TrimStart('/'); if([string]::IsNullOrWhiteSpace($p)){$p='index.html'}; $file=Join-Path $root $p; if((Test-Path $file) -and -not((Get-Item $file).PSIsContainer)){ $bytes=[IO.File]::ReadAllBytes($file); $ext=[IO.Path]::GetExtension($file).ToLower(); $ct=@{'.html'='text/html; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.png'='image/png';'.json'='application/json; charset=utf-8';'.webmanifest'='application/manifest+json'}[$ext]; if(-not $ct){$ct='application/octet-stream'}; $ctx.Response.ContentType=$ct; $ctx.Response.ContentLength64=$bytes.Length; $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)} else {$ctx.Response.StatusCode=404}; } catch {} finally {$ctx.Response.OutputStream.Close()} }"
goto OPEN

:PYTHON
start "MeX Server" cmd /c "py -m http.server %PORT%"
goto OPEN

:PYTHON_EXE
start "MeX Server" cmd /c "python -m http.server %PORT%"

goto OPEN

:OPEN
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/index.html"
endlocal
