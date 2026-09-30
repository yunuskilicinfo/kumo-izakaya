param(
  [int]$Port = 8420,
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Net.HttpListener -ErrorAction SilentlyContinue

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Serving $Root on http://localhost:$Port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".mp4"  = "video/mp4"
  ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $filePath = Join-Path $Root ($path.TrimStart("/"))

    # Resolve to an absolute path and refuse anything that escapes $Root
    # (e.g. "..%2F..%2F" traversal) before touching the filesystem.
    $rootFull = [System.IO.Path]::GetFullPath($Root)
    $requestedFull = [System.IO.Path]::GetFullPath($filePath)
    $withinRoot = $requestedFull.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)

    if ($withinRoot -and (Test-Path $requestedFull -PathType Leaf)) {
      $filePath = $requestedFull
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mime[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.AddHeader("Accept-Ranges", "bytes")
      $total = $bytes.Length
      $rangeHeader = $request.Headers["Range"]
      if ($rangeHeader -and $rangeHeader -match '^bytes=(\d*)-(\d*)$') {
        # Video needs HTTP Range (206) — Safari refuses to play without it
        # and every browser needs it to seek. Static hosts do this natively.
        if ($matches[1] -eq "") {
          $start = [Math]::Max(0, $total - [int64]$matches[2]); $end = $total - 1
        } else {
          $start = [int64]$matches[1]
          if ($matches[2] -eq "") { $end = $total - 1 } else { $end = [Math]::Min([int64]$matches[2], $total - 1) }
        }
        if ($start -gt $end -or $start -ge $total) {
          $response.StatusCode = 416
          $response.AddHeader("Content-Range", "bytes */$total")
        } else {
          $len = $end - $start + 1
          $response.StatusCode = 206
          $response.AddHeader("Content-Range", "bytes $start-$end/$total")
          $response.ContentLength64 = $len
          $response.OutputStream.Write($bytes, [int]$start, [int]$len)
        }
      } else {
        $response.ContentLength64 = $total
        $response.OutputStream.Write($bytes, 0, $total)
      }
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
  } catch {
    # A client aborting mid-transfer (video seeks do this constantly) can
    # leave headers already sent; don't let that kill the server loop.
    try { $response.StatusCode = 500 } catch {}
  } finally {
    try { $response.OutputStream.Close() } catch {}
  }
}
