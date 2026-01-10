Write-Host "🚀 Iniciando proceso de deploy..." -ForegroundColor Cyan

# Build de todos los proyectos
Write-Host "`n📦 Construyendo todos los proyectos..." -ForegroundColor Yellow
nx run-many -t build
if ($LASTEXITCODE -ne 0) {
	Write-Error "❌ Error al construir los proyectos"
	exit 1
}

Write-Host "✅ Build completado" -ForegroundColor Green

# Copiar cliente al servidor
$clientDist = Join-Path $PSScriptRoot "apps\dashboard\client\dist"
$serverDist = Join-Path $PSScriptRoot "apps\dashboard\server\dist-client"

if (-not (Test-Path $clientDist)) {
	Write-Error "❌ No se encontró el build del cliente"
	exit 1
}

Write-Host "`n📋 Copiando cliente al servidor..." -ForegroundColor Yellow

# Crear directorio si no existe
if (-not (Test-Path $serverDist)) {
	New-Item -Path $serverDist -ItemType Directory -Force | Out-Null
}

# Copiar recursivamente
Copy-Item -Path "$clientDist\*" -Destination $serverDist -Recurse -Force

Write-Host "✅ Cliente copiado correctamente" -ForegroundColor Green

# Git commit y push
Write-Host "`n📤 Subiendo cambios a Git..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
	Write-Error "❌ Error al añadir archivos a Git"
	exit 1
}

$commitMessage = Read-Host "Mensaje del commit"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
	$commitMessage = "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
	Write-Warning "⚠️ No hay cambios para commitear o error en commit"
}

git push
if ($LASTEXITCODE -ne 0) {
	Write-Error "❌ Error al hacer push"
	exit 1
}

Write-Host "✅ Cambios subidos a Git" -ForegroundColor Green

Write-Host "`n⏳ GitHub Actions se encargará del deploy en el servidor..." -ForegroundColor Yellow
Write-Host "   Puedes ver el progreso en: https://github.com/tu-usuario/tu-repo/actions" -ForegroundColor Cyan
Write-Host "`n🎉 Proceso local completado!" -ForegroundColor Cyan
