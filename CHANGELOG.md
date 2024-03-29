## 1.0.0
- Initial release.

## 1.0.1
- Added `trailing-whitespace-fixer.allowWhitespaceOnlyLines` setting to allow lines that are only whitespace.
- Fix highlighting suppression on last line of file.

## 1.0.2
- Fixed multi-cursor support.

## 1.0.3
- Added support for `\r\n` newlines.
- Fixes redo stack being broken after first redo that triggers an edit.

## 1.0.4
- Fixed issue where Move Line Up command on the line 2 below resulted in the space after "c" being removed.

```
b
a
c #
```

## 1.0.5
- Fixed issue where Move Line Up command on the line 2 below resulted in the space between "a" and "c" being removed.

```
a c
ab
```

## 1.0.6
- Updated Move Line Down command on the line 2 to remove whitespace on the moved up line.

```json
[
	88,

	99
]
```

## 1.0.7
- Fixed Move Line Up command on the line 2 that would cause `a ` to be removed.
```
a 1
b
```

## 1.0.8
- Fix multi-cursor support for hitting Enter where the cursor is displays below.
```
1| 2| 3 4
```
```
	|	1	|	2
```
- Added check that only whitespace is deleted.

## 1.0.9
- Fix closing PHPDoc comment when hitting Enter where the cursor is displays below.
```
/**| */
```

## 1.0.10
- Fix removed whitespace after file changes on disk (e.g. via git operations).

## 1.0.11
- Don't make changes if not focused on the window. The main intent is to not make changes when file is changed on disk (e.g. via git branch changes or stashing).

## 1.0.12
- Allow as web extension.

## 1.0.13
- Allow setting `trailingWhitespaceFixer.trailingWhitespaceColor` in `workbench.colorCustomizations` to change the background color of trailing whitespace.
