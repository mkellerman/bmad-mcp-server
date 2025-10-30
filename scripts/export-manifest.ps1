& npm run build
& npm run bmad -- "*export-master-manifest" ./.bmad

$master = Get-Content ./master-manifest.json | ConvertFrom-Json

$master.agents | Group-Object { $_.origin.root } -NoElement | Format-Table @{n='Agents'; e={ $_.Name }}, @{n='Count'; e={ $_.Count }}
$master.workflows | Group-Object { $_.origin.root } -NoElement | Format-Table @{n='Workflows'; e={ $_.Name }}, @{n='Count'; e={ $_.Count }}
$master.tasks | Group-Object { $_.origin.root } -NoElement | Format-Table @{n='Tasks'; e={ $_.Name }}, @{n='Count'; e={ $_.Count }}
