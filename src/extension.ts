import { exec } from 'child_process';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	var extension = new TestOnSave(context);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		extension.runTests(document);
	});
}

// general TODOS:
// DONE: listen for configuration changes
// TODO: different test commands for different languages / file types
// TODO: file pattern matching - might be combined with different test commands for different languages
// TODO: find out precedence of settings (settings.json vs. Settings window)

class TestOnSave {
	private _testCommand: any = null;
	private _isEnabled: any = false;
	private _outputChannel: vscode.OutputChannel;
	private _statusBarIcon: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext) {
		const enableDisableCommandId = 'testOnSave.enableDisable';
		context.subscriptions.push(vscode.commands.registerCommand(enableDisableCommandId, () => {
			this._isEnabled ? this._disable() : this._enable();
		}));
		this._statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		this._statusBarIcon.command = enableDisableCommandId;
		context.subscriptions.push(this._statusBarIcon);
		context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => this._readConfiguration()));
		this._outputChannel = vscode.window.createOutputChannel('Test On Save');
		this._readConfiguration();
	}

	private _readConfiguration() {
		this._isEnabled = vscode.workspace.getConfiguration('testOnSave').get('enabled');
		this._testCommand = vscode.workspace.getConfiguration('testOnSave').get('testCommand');
		this._isEnabled ? this._enable() : this._disable();
	}

	private _enable() {
		console.log("Enabling Test On Save");
		this._isEnabled = true;
		this._statusUpdate('Autotest Enabled');
	}

	private _disable() {
		console.log("Disabling Test On Save");
		this._isEnabled = false;
		this._statusUpdate('Autotest Disabled');
	}

	private _statusUpdate(message: string) {
		this._statusBarIcon.text = message;
		this._statusBarIcon.show();
	}

	private _isRelevantFile(document: vscode.TextDocument): boolean {
		return document.languageId === 'python';
	}

	private _getWorkingDirectory(document: vscode.TextDocument): string | undefined {
		const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceFolderUri) {
			console.error("workspaceFolderUri is null");
			return undefined;
		}
		return workspaceFolderUri.uri.fsPath;
	}

	public runTests(document: vscode.TextDocument) {
		if (!this._isRelevantFile(document) || !this._isEnabled) {
			return;
		}
		if (this._testCommand === null || this._testCommand.trim() === "") {
			vscode.window.showErrorMessage('No test command configured');
			return;
		}
		const workspaceFolderPath = this._getWorkingDirectory(document);
		if (workspaceFolderPath === undefined) {
			return;
		}
		this._statusUpdate("$(loading~spin) Tests");
		exec(this._testCommand, { cwd: workspaceFolderPath }, (error, stdout, stderr) => {
			this._outputChannel.append(stdout);
			this._outputChannel.append(stderr);
			if (error) {
				this._outputChannel.append(error.message);
				this._statusUpdate('$(testing-failed-icon) Tests');
			}
			else {
				this._statusUpdate('$(testing-passed-icon) Tests');
			}
			this._statusBarIcon.show();
		});
	}
}
