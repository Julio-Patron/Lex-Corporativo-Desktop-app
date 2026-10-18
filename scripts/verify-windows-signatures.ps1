param(
  [string]$ReleaseDirectory = 'release',
  [string]$ExpectedThumbprint = $env:WINDOWS_CERTIFICATE_SHA1,
  [switch]$InstallerOnly
)
$ErrorActionPreference = 'Stop'
if ($ExpectedThumbprint -notmatch '^[a-fA-F0-9]{40}$') { throw 'Falta la huella esperada del certificado de Windows.' }
$releaseRoot = (Resolve-Path -LiteralPath $ReleaseDirectory).Path
$installers = @(Get-ChildItem -LiteralPath $releaseRoot -File -Filter 'Lex-Corporativo-Setup-*.exe')
if ($installers.Count -ne 1) { throw 'Se requiere exactamente un instalador.' }
$targets = @($installers[0].FullName)
if (-not $InstallerOnly) { $targets += Join-Path $releaseRoot 'win-unpacked/Lex Corporativo.exe' }
$records = foreach ($target in $targets) {
  $signature = Get-AuthenticodeSignature -LiteralPath $target
  if ($signature.Status -ne 'Valid') { throw "Firma Authenticode inválida: $target ($($signature.Status))" }
  if ($signature.SignerCertificate.Thumbprint -ne $ExpectedThumbprint) { throw "Editor inesperado: $target" }
  if (-not $signature.TimeStamperCertificate) { throw "Firma sin sello de tiempo: $target" }
  [PSCustomObject]@{
    file = [IO.Path]::GetRelativePath($releaseRoot, $target).Replace('\', '/')
    status = 'Valid'
    thumbprint = $signature.SignerCertificate.Thumbprint.ToLower()
    sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()
    timestamped = $true
  }
}
if (-not $InstallerOnly) {
  @{ status = 'pass'; files = @($records) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $releaseRoot 'signatures.json') -Encoding utf8NoBOM
}
$records | ConvertTo-Json -Depth 5
