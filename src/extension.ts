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
	enabled: boolean;
	testCommand: string;
}


class PythonAutoTest {
	private _config: IConfig;
	private _isEnabled: boolean;
	private _outputChannel: vscode.OutputChannel;
	private _statusBarIcon: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext) {
		this._config = <IConfig><any>vscode.workspace.getConfiguration('afinkler.pythonAutotest');  // TODO: error handling and typing
		this._isEnabled = this._config.enabled;
		const enableDisableCommandId = 'afinkler.pythonAutotest.enableDisable';
		context.subscriptions.push(vscode.commands.registerCommand(enableDisableCommandId, () => {
			this._isEnabled ? this._disable() : this._enable();
		}));
		this._statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		this._statusBarIcon.command = enableDisableCommandId;
		console.log(`config value enabled: ${this._config.enabled}, isEnabled: ${this._isEnabled}`);
		this._isEnabled ? this._enable() : this._disable();
		context.subscriptions.push(this._statusBarIcon);
		this._outputChannel = vscode.window.createOutputChannel('Python Autotest');
	}

	private _enable() {
		console.log("Enabling Python Autotest");
		this._isEnabled = true;
		this._statusUpdate('Autotest Enabled');
	}

	private _disable() {
		console.log("Disabling Python Autotest");
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
		const workspaceFolderPath = this._getWorkingDirectory(document);
		if (workspaceFolderPath === undefined) {
			return;
		}
		this._statusUpdate("$(loading~spin) Tests");
		exec(this._config.testCommand, { cwd: workspaceFolderPath }, (error, stdout, stderr) => {
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
