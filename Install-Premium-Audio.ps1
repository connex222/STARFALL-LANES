# STARFALL LANES -- 9 Mirelo SFX. Run from Run-Premium-Audio-Install.cmd.
# Asset URLs expire on 29 October 2026. Offline game audio is preserved on any download failure.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$audio = Join-Path $root 'public\audio'
$backup = Join-Path $audio 'backup-procedural'
$stage = Join-Path $env:TEMP ('starfall-premium-' + [guid]::NewGuid().ToString('N'))
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
New-Item -ItemType Directory -Path $stage -Force | Out-Null
try {
    foreach ($name in $urls.Keys) {
        $file = Join-Path $stage ($name + '.mp3')
        Invoke-WebRequest -UseBasicParsing -Uri $urls[$name] -OutFile $file -MaximumRedirection 5 -ErrorAction Stop
        $bytes = [System.IO.File]::ReadAllBytes($file)
        if ($bytes.Length -lt 3500 -or $bytes.Length -gt 30000000) { throw "Invalid size: $name" }
        $isMp3 = ($bytes[0] -eq 73 -and $bytes[1] -eq 68 -and $bytes[2] -eq 51) -or ($bytes[0] -eq 255 -and ($bytes[1] -band 224) -eq 224)
        if (-not $isMp3) { throw "Invalid MP3: $name" }
        Write-Host "Validated $name ($($bytes.Length) bytes)" -ForegroundColor Cyan
    }
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    foreach ($name in $urls.Keys) {
        $source = Join-Path $audio ($name + '.mp3')
        $saved = Join-Path $backup ($name + '.mp3')
        if ((Test-Path $source) -and -not (Test-Path $saved)) { Copy-Item $source $saved }
    }
    try {
        foreach ($name in $urls.Keys) {
            Copy-Item (Join-Path $stage ($name + '.mp3')) (Join-Path $audio ($name + '.mp3')) -Force
        }
    } catch {
        foreach ($name in $urls.Keys) {
            $saved = Join-Path $backup ($name + '.mp3')
            if (Test-Path $saved) { Copy-Item $saved (Join-Path $audio ($name + '.mp3')) -Force }
        }
        throw
    }
    $tracks = @{}
    foreach ($name in $urls.Keys) {
        $file = Join-Path $audio ($name + '.mp3')
        $tracks[$name] = @{ bytes = (Get-Item $file).Length; sha256 = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLower() }
    }
    @{provider='Mirelo SFX 2.0';install_count=9;tracks=$tracks;note='Downloaded to local game files, with procedural backups.'} |
        ConvertTo-Json -Depth 4 | Set-Content (Join-Path $audio 'premium-audio-receipt.json') -Encoding UTF8
    Write-Host 'SUCCESS: All 9 premium effects installed. Redeploy the updated game folder to make them live.' -ForegroundColor Green
    exit 0
} catch {
    Write-Host ('No premium effects installed: ' + $_.Exception.Message) -ForegroundColor Yellow
    Write-Host 'Existing game sound has been preserved. Links expire on 29 October 2026.'
    exit 1
} finally {
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}
