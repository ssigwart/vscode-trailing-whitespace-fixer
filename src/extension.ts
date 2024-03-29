import * as vscode from 'vscode';

// Settings
let allowWsOnlyLines = false;

/**
 * Update settings from config
 *
 * @param {vscode.TextDocument} doc Document
 */
function updateSettingsFromConfig(doc: vscode.TextDocument): void
{
	const config = vscode.workspace.getConfiguration("trailing-whitespace-fixer", doc.uri);
	const allowWsOnlyLinesSetting = config.get("allowWhitespaceOnlyLines");
	allowWsOnlyLines = !!allowWsOnlyLinesSetting;
}

/**
 * Activate
 */
export function activate(context: vscode.ExtensionContext)
{
	// Check when an editor looses focus
	let editorFocused: boolean = true;
	context.subscriptions.push(vscode.window.onDidChangeWindowState((e: vscode.WindowState): void => {
		editorFocused = e.focused;
	}));

	// Trim on Enter
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent): void => {
		// Don't make changes if the user isn't focused on the window. It's likely an external change (e.g. git)
		if (!editorFocused)
			return;

		// Don't want to break redo stack, so don't do anything for those
		if (e.reason === vscode.TextDocumentChangeReason.Undo || e.reason === vscode.TextDocumentChangeReason.Redo)
			return;

		const doc = e.document;
		updateSettingsFromConfig(doc);
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri === doc.uri) // Make sure editor didn't change
		{
			// Check content changes to see if they added newlines
			let deletedRanges: vscode.Range[] = [];
			let prevChangeLengths = 0;
			// Sort ranges
			let contentChanges = e.contentChanges.slice();
			let likelyMoveLineUpOrDown = false;
			for (let i = 1; i < contentChanges.length; i++)
			{
				const prevChange = contentChanges[i - 1];
				const currentChange = contentChanges[i];
				if (prevChange.rangeOffset > currentChange.rangeOffset)
				{
					// Was anything deleted?
					if (
						prevChange.rangeLength > prevChange.text.length ||
						currentChange.rangeLength > currentChange.text.length
					)
					{
						likelyMoveLineUpOrDown = true;
						break;
					}
				}
			}
			contentChanges.sort((a: vscode.TextDocumentContentChangeEvent, b: vscode.TextDocumentContentChangeEvent): number => {
				return a.rangeOffset - b.rangeOffset;
			});
			for (const change of contentChanges)
			{
				if (change.text.startsWith("\n") || change.text.startsWith("\r"))
				{
					// Get whitespace at end of line
					const adjustedEndOffset = change.rangeOffset + prevChangeLengths;
					const adjustedEndOffset2 = change.rangeOffset + change.rangeLength + prevChangeLengths;
					let endPos = doc.positionAt(adjustedEndOffset);
					let endPos2 = doc.positionAt(adjustedEndOffset2);
					// Make sure we're only dealing with 1 line
					if (endPos2.line > endPos.line)
					{
						const newOffset = doc.offsetAt(new vscode.Position(endPos.line + 1, 0)) - 1;
						endPos2 = doc.positionAt(newOffset);
					}
					let adjustedEndLine = endPos.line;
					let lineText = doc.getText(new vscode.Range(adjustedEndLine, 0, endPos2.line, endPos2.character));
					const match = /\s+$/.exec(lineText);
					if (match !== null)
					{
						const startChar = endPos.character - match[0].length;
						if (!allowWsOnlyLines || startChar !== 0)
							deletedRanges.push(new vscode.Range(adjustedEndLine, startChar, endPos2.line, endPos2.character));
					}

					// Check if there was whitespace after where Enter was pressed
					if (!likelyMoveLineUpOrDown)
					{
						let offset = change.rangeOffset + change.text.length + prevChangeLengths;
						let afterCursorPos = doc.positionAt(offset);
						let afterCursorText = doc.getText(new vscode.Range(afterCursorPos.line, afterCursorPos.character, afterCursorPos.line + 1, 0));
						afterCursorText = afterCursorText.substring(0, afterCursorText.length - 1); // Remove \n
						const afterMatch = /^\s+/.exec(afterCursorText);
						if (afterMatch !== null)
						{
							if (
								// Ignore if it looks like the end of a PHPDoc or similar comment
								/^\s* \*/.exec(afterCursorText) === null &&
								// Ignore if it looks like the next line is a brace
								/^\s[\[\]{}()]/.exec(afterCursorText) === null
							)
								deletedRanges.push(new vscode.Range(afterCursorPos.line, afterCursorPos.character, afterCursorPos.line, afterCursorPos.character + afterMatch[0].length));
						}
					}
				}
				// Check for all whitespace line that is part of a shifted line
				else if (change.range.start.character === 0 && contentChanges.length > 1)
				{
					const match = /^(\s+)\r?\n/.exec(change.text);
					if (match !== null)
						deletedRanges.push(new vscode.Range(change.range.start.line, change.range.start.character, change.range.start.line, change.range.start.character + match[1].length));
				}
				prevChangeLengths += change.text.length - change.rangeLength;
			}

			// Do deletes
			if (deletedRanges.length > 0)
			{
				// Check that deleted ranges are only whitespace
				for (const deletedRange of deletedRanges)
				{
					const removedText = doc.getText(deletedRange);
					if (!/^[\s\r\n]*$/.test(removedText))
					{
						const msg = "There was an error removing trailing whitespace.";
						vscode.window.showErrorMessage(msg);
						return;
					}
				}

				// Add change
				editor.edit((editBuilder: vscode.TextEditorEdit): void => {
					for (const deletedRange of deletedRanges)
						editBuilder.delete(deletedRange);
				}, {undoStopAfter: false, undoStopBefore: false});
			}
		}
	}));


	///// Highlighting /////
	const decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: new vscode.ThemeColor("trailingWhitespaceFixer.trailingWhitespaceColor")
	});
	context.subscriptions.push(decorationType);
	// Set up function to do highlighting
	const highlightWhitespace = (editor: vscode.TextEditor, doc: vscode.TextDocument): void => {
		updateSettingsFromConfig(doc);
		let trailingWhitespaceRanges: vscode.Range[] = [];
		let activeLines: number[] = [];
		for (const selection of editor.selections)
			activeLines.push(selection.end.line);
		const maxLineIdx = doc.lineCount - 1;
		for (const visibleRange of editor.visibleRanges)
		{
			for (let line = visibleRange.start.line; line <= visibleRange.end.line; line++)
			{
				// Check that it's not the current line or the last line
				if (activeLines.indexOf(line) !== -1 || line === maxLineIdx)
					continue;

				const offset = doc.offsetAt(new vscode.Position(line + 1, 0)) - 1;
				const eolPos = doc.positionAt(offset);
				let startPos = new vscode.Position(eolPos.line, Math.max(0, eolPos.character - 10));
				const endOfLineText = doc.getText(new vscode.Range(startPos, eolPos));
				const match = /\s+$/.exec(endOfLineText);
				if (match !== null)
				{
					let whitespaceLen = match[0].length;
					if (whitespaceLen === 10)
					{
						// See how much more whitespace there is
						let character = startPos.character - 1;
						while (character >= 0)
						{
							const newStartPos = new vscode.Position(startPos.line, character);
							const text = doc.getText(new vscode.Range(newStartPos, startPos));
							startPos = newStartPos;
							if (/\s/.test(text))
								whitespaceLen++;
							else
								break;
							character--;
						}
					}
					startPos = new vscode.Position(eolPos.line, eolPos.character - whitespaceLen);
					if (!allowWsOnlyLines || startPos.character !== 0)
						trailingWhitespaceRanges.push(new vscode.Range(startPos, eolPos));
				}
			}
		}
		editor.setDecorations(decorationType, trailingWhitespaceRanges);
	};

	// Trigger highlighting
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent): void => {
		const editor = vscode.window.activeTextEditor;
		if (editor)
			highlightWhitespace(editor, e.document);
	}));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined): void => {
		if (editor)
			highlightWhitespace(editor, editor.document);
	}));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent): void => {
		highlightWhitespace(e.textEditor, e.textEditor.document);
	}));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges((e: vscode.TextEditorVisibleRangesChangeEvent): void => {
		highlightWhitespace(e.textEditor, e.textEditor.document);
	}));
}

/**
 * Deactivate
 */
export function deactivate(): void
{
}
