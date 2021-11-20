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
