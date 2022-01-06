import * as assert from "assert";
import * as vscode from "vscode";

let uriChangeResolvers: Map<vscode.Uri, () => any> = new Map();
let docClosedResolvers: Map<vscode.Uri, (docText: string) => any> = new Map();

async function testWhitespace(initialText: string, expectedText: string, pos: vscode.Position, command: string | null, expectedNumChanges: number): Promise<void>
{
	await vscode.workspace.openTextDocument({
		language: "plaintext",
		content: initialText
	}).then(async (doc: vscode.TextDocument) => {
		let finalDocText = "";
		let changedPromise = new Promise((resolve: (value: any) => any) => {
			uriChangeResolvers.set(doc.uri, function() {
				expectedNumChanges--;
				if (expectedNumChanges === 0)
					resolve(true);
			});
		});
		let closePromise = new Promise((resolve: (value: any) => any) => {
			docClosedResolvers.set(doc.uri, function(docText: string) {
				finalDocText = docText;
				resolve(true);
			});
		});
		return vscode.window.showTextDocument(doc).then((editor: vscode.TextEditor) => {
			editor.options.tabSize = 2;
			editor.selection = new vscode.Selection(pos, pos);
			if (command !== null)
				return vscode.commands.executeCommand(command);
			return editor.edit((editBuilder: vscode.TextEditorEdit) => {
				editBuilder.insert(pos, "\n");
			});
		}).then(() => {
			return changedPromise;
		}).then(() => {
			assert.strictEqual(doc.getText(), expectedText);
			return vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		}).then(() => {
			return closePromise;
		}).then(() => {
			assert.strictEqual(finalDocText, expectedText);
		});
	});
}

suite('Extension Test Suite', () => {
	const disposable = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent): void => {
		const func = uriChangeResolvers.get(e.document.uri);
		if (func !== undefined)
			func.apply(this);
	});
	vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument): void => {
		const func = docClosedResolvers.get(doc.uri);
		if (func !== undefined)
			func.call(this, doc.getText());
	});

	test('Test space after newline', async function () {
		this.timeout(3000);
		const initialText = [
			"[",
			"\t1, 2, 3, 4",
			"]"
		].join("\n");
		const expectedText = [
			"[",
			"\t1, 2,",
			"3, 4",
			"]"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 6), null, 2);
	});

	test('Test space before newline', async function () {
		this.timeout(3000);
		const initialText = [
			"[",
			"\t1, 2, 3, 4",
			"]"
		].join("\n");
		const expectedText = [
			"[",
			"\t1, 2,",
			"3, 4",
			"]"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 7), null, 2);
	});

	test('Test v 1.0.4 fix', async function () {
		this.timeout(3000);
		const initialText = [
			"b",
			"a",
			"c #"
		].join("\n");
		const expectedText = [
			"a",
			"b",
			"c #"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 1), "editor.action.moveLinesUpAction", 1);
	});

	test('Test v 1.0.5 fix', async function () {
		this.timeout(3000);
		const initialText = [
			"a c",
			"ab"
		].join("\n");
		const expectedText = [
			"ab",
			"a c"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 1), "editor.action.moveLinesUpAction", 1);
	});

	test('Test v 1.0.6 fix', async function () {
		this.timeout(3000);
		const initialText = [
			"[",
			"\t88,",
			"",
			"\t99",
			"]"
		].join("\n");
		const expectedText = [
			"[",
			"",
			"\t88,",
			"\t99",
			"]"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 1), "editor.action.moveLinesDownAction", 1);
	});

	test('Test v 1.0.7 fix', async function () {
		this.timeout(3000);
		const initialText = [
			"a 1",
			"b"
		].join("\n");
		const expectedText = [
			"b",
			"a 1"
		].join("\n");
		await testWhitespace(initialText, expectedText, new vscode.Position(1, 1), "editor.action.moveLinesUpAction", 1);
	});

	// Close editors
	vscode.commands.executeCommand('workbench.action.closeAllEditors');
});
