docker run -d --name redis -p 6379:6379 redis:7-alpine

npx ts-node src/index.ts


Beautiful tree command
```
$root = (Get-Location).Path

Get-ChildItem -Recurse -Depth 4 |
Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\.git\\' } |
Sort-Object FullName |
ForEach-Object {
    $relative = $_.FullName.Substring($root.Length).TrimStart('\','/')
    $level = ($relative -split '[\\/]').Count - 1
    $indentLevel = [Math]::Max(0, $level)   # prevent negative values
    ('│   ' * $indentLevel) + '├── ' + $_.Name
}
```

To create .env.example:
- Go to .env file
- Ctrl + F -> Regex option (last icon)
- `(?<=^[A-Z0-9_]+=).*`
- Replace with "" (empty)