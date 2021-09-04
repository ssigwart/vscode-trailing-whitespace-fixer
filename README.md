## Trailing Whitespace Fixer
This extension helps to identify and remove trailing whitespace.
It includes the following features:

### Trim on Enter
- If you hit Enter on a line that has trailing whitespace, it will be automatically removed.
- If you hit Enter before whitespace on a line, the whitespace will be removed.

	**Example: The `|` character represents the cursor position.**
	```php
	$arr = [
		1, 2,| 3, 4
	];
	```
	**Hitting Enter without Extension**
	```php
	$arr = [
		1, 2,
		| 3, 4
	];
	```
	**Hitting Enter with Extension**
	```php
	$arr = [
		1, 2,
		|3, 4
	];
	```

### Show Trailing Whitespace
- Any trailing whitespace on lines other than the current line will be highlighted in red.

## Configuration
- If you want to allow lines that are only whitespace, you can enable the `trailing-whitespace-fixer.allowWhitespaceOnlyLines` setting. This is useful if you want to retain the current indentation level.
