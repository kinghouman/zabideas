$rows | Where-Object Status -eq 'Created' |
    Format-Table Status, RelativePath -AutoSize
