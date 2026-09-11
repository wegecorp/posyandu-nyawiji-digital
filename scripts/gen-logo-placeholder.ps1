# Placeholder brand logo generator (POSYANDU NYAWIJI DIGITAL).
# Menghasilkan ikon hijau (#075e54) bermotif hati putih sebagai pengganti logo sementara.
# Swap ke logo asli nanti cukup dengan menimpa file di public/brand/ + src/app/favicon.ico.

Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..\public\brand'
New-Item -ItemType Directory -Force -Path $root | Out-Null

$appRoot = Join-Path $PSScriptRoot '..\src\app'
$green = [System.Drawing.ColorTranslator]::FromHtml('#075e54')
$white = [System.Drawing.Color]::White

function New-HeartPath {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.StartFigure()
    $p.AddBezier(50, 88, 8, 58, 0, 32, 0, 20)
    $p.AddBezier(0, 20, 0, 8, 8, 0, 18, 0)
    $p.AddBezier(18, 0, 30, 0, 42, 10, 50, 24)
    $p.AddBezier(50, 24, 58, 10, 70, 0, 82, 0)
    $p.AddBezier(82, 0, 92, 0, 100, 8, 100, 20)
    $p.AddBezier(100, 20, 100, 32, 92, 58, 50, 88)
    $p.CloseFigure()
    return $p
}

function Draw-Heart {
    param($g, [int]$size, [float]$heartWidth)
    $s = $heartWidth / 100.0
    $h = 88.0 * $s
    $m = New-Object System.Drawing.Drawing2D.Matrix
    $m.Translate(($size - $heartWidth) / 2.0, ($size - $h) / 2.0)
    $m.Scale($s, $s)
    $p = New-HeartPath
    $p.Transform($m)
    $g.FillPath((New-Object System.Drawing.SolidBrush($white)), $p)
    $p.Dispose()
    $m.Dispose()
}

function New-LogoPng {
    param([int]$size, [bool]$maskable)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush($green)

    if ($maskable) {
        $g.FillRectangle($brush, 0, 0, $size, $size)
        Draw-Heart -g $g -size $size -heartWidth ($size * 0.55)
    } else {
        $rad = [int]($size * 0.22)
        $d = $rad * 2
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($brush, $path)
        Draw-Heart -g $g -size $size -heartWidth ($size * 0.5)
        $path.Dispose()
    }

    $brush.Dispose()
    $g.Dispose()
    return $bmp
}

# PWA / install icons
$targets = @(
    @{ Name = 'logo-192.png'; Size = 192; Maskable = $false },
    @{ Name = 'logo-512.png'; Size = 512; Maskable = $false },
    @{ Name = 'logo-maskable-512.png'; Size = 512; Maskable = $true },
    @{ Name = 'logo-apple-180.png'; Size = 180; Maskable = $false }
)

foreach ($t in $targets) {
    $bmp = New-LogoPng -size $t.Size -maskable $t.Maskable
    $out = Join-Path $root $t.Name
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "OK $out"
}

# favicon.ico (32x32, full-bleed hijau + hati putih, tanpa transparansi agar aman di .ico)
$icoBmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($icoBmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear($green)
Draw-Heart -g $g -size 32 -heartWidth 18
$g.Dispose()

$hIcon = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoOut = Join-Path $appRoot 'favicon.ico'
$fs = [System.IO.File]::Create($icoOut)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$icoBmp.Dispose()
Write-Output "OK $icoOut"
