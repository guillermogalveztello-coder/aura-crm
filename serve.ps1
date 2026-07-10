# Servidor estático simple para Aura CRM (sin dependencias externas).
# Los módulos ES (js/main.js) no cargan si abres index.html directo con file://
# en Chrome/Edge por la política CORS. Este script sirve la carpeta por HTTP.
# Uso: powershell -File serve.ps1  ->  abre http://localhost:5500

param([int]$Port = 5500)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "No se pudo iniciar el servidor en el puerto $Port (¿ya hay uno corriendo?): $_"
  exit 1
}
Write-Host "Aura CRM sirviendo en http://localhost:$Port  (Ctrl+C para detener)"

$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "application/javascript; charset=utf-8";
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".svg" = "image/svg+xml"; ".json" = "application/json; charset=utf-8";
}

try {
  while ($listener.IsListening) {
    try { $context = $listener.GetContext() } catch { break }
    $req = $context.Request
    $res = $context.Response
    try {
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq "/") { $path = "/index.html" }
      $filePath = [System.IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart("/"))))

      if ($filePath.StartsWith($root) -and (Test-Path $filePath -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
        $contentType = $mime[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.StatusCode = 200
        $res.ContentType = $contentType
        # Chunked transfer: .NET maneja el framing solo, evita desajustes con ContentLength64.
        $res.SendChunked = $true
        if ($bytes.Length -gt 0) { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else {
        $res.StatusCode = 404
      }
    } catch {
      Write-Host "Request error: $_"
      try { $res.StatusCode = 500 } catch {}
    } finally {
      try { $res.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
