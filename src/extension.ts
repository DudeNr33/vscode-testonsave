import { exec } from 'child_process';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('"python-autotest" is now active!');
	var extension = new PythonAutoTest(context);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		extension.runTests(document);
	});
}


interface IConfig {
	testCommand: string;
}


class PythonAutoTest {
	private _config: IConfig;
	private _context: vscode.ExtensionContext;
	private _outputChannel: vscode.OutputChannel;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
		this._outputChannel = vscode.window.createOutputChannel('Python Autotest');
		this._config = <IConfig><any>vscode.workspace.getConfiguration('afinkler.pythonAutotest');  // TODO: error handling and typing
	}

	public runTests(document: vscode.TextDocument) {
		if (document.languageId !== 'python') {
			console.log("Not a python file - nothing to do.");
			return;
		}
		const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceFolderUri) {
			console.error("workspaceFolderUri is null");
			return;
		}
		const workspaceFolderPath = workspaceFolderUri.uri.fsPath;
		exec(this._config.testCommand, { cwd: workspaceFolderPath }, (error, stdout, stderr) => {
			this._outputChannel.append(stdout);
			this._outputChannel.append(stderr);
			if (error) {
				this._outputChannel.append(error.message);
				vscode.window.showErrorMessage(error.message);
			}
		});
	}
}
