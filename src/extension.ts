import * as vscode from 'vscode';


/**
 * Activate
 */
export function activate(context: vscode.ExtensionContext)
{
	// Trim on Enter
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		const doc = e.document;
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document.uri === doc.uri) // Make sure editor didn't change
		{
			// Check content changes to see if they added newlines
			let deletedRanges: vscode.Range[] = [];
			for (const change of e.contentChanges)
			{
				if (change.text.startsWith("\n"))
				{
					// Get whitespace at end of line
					const endPos = change.range.start;
					let lineText = doc.getText(new vscode.Range(endPos.line, 0, endPos.line, endPos.character));
					const match = /\s+$/.exec(lineText);
					if (match !== null)
						deletedRanges.push(new vscode.Range(endPos.line, endPos.character - match[0].length, endPos.line, endPos.character));

					// Check if there was whitespace after where Enter was pressed
					let offset = doc.offsetAt(endPos) + change.text.length;
					let afterCursorPos = doc.positionAt(offset);
					let afterCursorText = doc.getText(new vscode.Range(afterCursorPos.line, afterCursorPos.character, afterCursorPos.line + 1, 0));
					const afterMatch = /^\s+/.exec(afterCursorText);
					if (afterMatch !== null)
						deletedRanges.push(new vscode.Range(afterCursorPos.line, afterCursorPos.character, afterCursorPos.line, afterCursorPos.character + afterMatch[0].length));
				}
			}

			// Do deletes
			if (deletedRanges.length > 0)
			{
				editor.edit((editBuilder: vscode.TextEditorEdit): void => {
					for (const deletedRange of deletedRanges)
						editBuilder.delete(deletedRange);
				}, {undoStopAfter: false, undoStopBefore: false});
			}
		}
	}));


	///// Highlighting /////
	const decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: "#c20000"
	});
	context.subscriptions.push(decorationType);
	// Set up function to do highlighting
	const highlightWhitespace = (editor: vscode.TextEditor, doc: vscode.TextDocument): void => {
		let trailingWhitespaceRanges: vscode.Range[] = [];
		let activeLines: number[] = [];
		for (const selection of editor.selections)
			activeLines.push(selection.end.line);
		for (const visibleRange of editor.visibleRanges)
		{
			for (let line = visibleRange.start.line; line <= visibleRange.end.line; line++)
			{
				// Check that it's not the current line
				if (activeLines.indexOf(line) !== -1)
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