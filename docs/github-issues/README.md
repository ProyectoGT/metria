# Metria Roadmap Issues

Este directorio contiene los issues del roadmap técnico listos para crear en GitHub.

## Archivos

- `metria-roadmap-issues.json`: manifiesto estructurado con título, body, labels, prioridad, dependencias y tamaño.

## Crear issues con GitHub CLI

Cuando `gh` esté instalado y autenticado:

```powershell
$issues = Get-Content docs/github-issues/metria-roadmap-issues.json | ConvertFrom-Json
foreach ($issue in $issues) {
  gh issue create `
    --title $issue.title `
    --body $issue.body `
    --label ($issue.labels -join ",")
}
```

## Crear labels sugeridas

```powershell
$labels = Get-Content docs/github-issues/metria-roadmap-issues.json |
  ConvertFrom-Json |
  ForEach-Object { $_.labels } |
  Sort-Object -Unique

foreach ($label in $labels) {
  gh label create $label --force
}
```

Notas:

- Las dependencias dentro del body usan referencias como `#1`, `#2`, etc. Si ya existen issues en el repo, conviene crear primero un milestone y ajustar referencias después de la creación real.
- Si el repositorio ya tiene labels normalizadas, revisa el array `labels` antes de ejecutar el script.
