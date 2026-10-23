# Download the nine completed Mirelo sound effects to this game on a networked Windows PC.
# Signed URLs expire 29 October 2026. Keeps a backup of working procedural cues.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$audio = Join-Path $root 'public\audio'
$backup = Join-Path $audio 'backup-procedural'
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$urls = [ordered]@{
 'ambient-orbit'='https://mirelo.ai/dl/qx70wtc3vq422f3xn4t8edd5dd8gs37r/0?k=-w3JPHv9yJNlpuY1'
 'solar-storm'='https://mirelo.ai/dl/qx757ce9tprsvadkb2yvptry2n8gr95k/0?k=1JPLgV-HBzJzl-NQ'
 'hyperlane-open'='https://mirelo.ai/dl/qx7epjdm6mpdt4y47mgxpdwbxx8grmfr/0?k=DTqPGDe55jhlJG_R'
 'spire-build'='https://mirelo.ai/dl/qx7ev8za9e9sqqytx9s4c222j98gs517/0?k=1Aa-jRm2vEY0r0U0'
 'fleet-move'='https://mirelo.ai/dl/qx79sgwa371rrgrvd34e718s398gss2p/0?k=g0U5zpl52FsGD1HL'
 'fleet-clash'='https://mirelo.ai/dl/qx7cjhcfeaq8qp8g8fckx32cr18gs3ak/0?k=Ql9nggxwO0F8hcQm'
 'era-transition'='https://mirelo.ai/dl/qx7ebperj4c3cyej2qm1pkfbah8gskpq/0?k=KQtLcob14pBTH4ma'
 'victory'='https://mirelo.ai/dl/qx77mgnawrw08gx6s67rsfhseh8grakh/0?k=S8gNFRrzZBrCefmI'
 'credits'='https://mirelo.ai/dl/qx7ax76mda14fvqmthg8rjvkas8grw8t/0?k=_-65kqPEnULOhief'
}
$ok=0
foreach ($key in $urls.Keys) {
  $dest=Join-Path $audio "$key.mp3"
  $temp=Join-Path $audio "$key.mp3.download"
  try {
    Invoke-WebRequest -Uri $urls[$key] -OutFile $temp -MaximumRedirection 5 -ErrorAction Stop
    $blob=[System.IO.File]::ReadAllBytes($temp)
    if ($blob.Length -lt 1000) {throw 'Downloaded file too small'}
    if (-not (($blob[0] -eq 73 -and $blob[1] -eq 68 -and $blob[2] -eq 51) -or ($blob[0] -eq 255 -and (($blob[1] -band 224) -eq 224)))) {throw 'Download was not an MP3 file'}
    $save=Join-Path $backup "$key.mp3"
    if ((Test-Path $dest) -and -not (Test-Path $save)) { Copy-Item -Path $dest -Destination $save }
    Move-Item -Path $temp -Destination $dest -Force
    $ok++
    Write-Host "Installed $key" -ForegroundColor Green
  } catch {
    Remove-Item -Path $temp -ErrorAction SilentlyContinue
    Write-Host "Not installed: $key - $($_.Exception.Message)" -ForegroundColor Yellow
  }
}
Write-Host "$ok of 9 premium effects installed; the game retains old audio for failed files."
if ($ok -lt 9) {Write-Host 'If links expired, new provider downloads will be needed.'}
