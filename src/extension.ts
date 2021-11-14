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
	private _context: vscode.ExtensionContext;
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
		this._context = context;
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

	private _statusUpdate(message: string, isError: boolean = false) {
		this._statusBarIcon.text = message;
		if (isError) {
			this._statusBarIcon.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		}
		else {
			this._statusBarIcon.backgroundColor = new vscode.ThemeColor('statusBarItem.background');
		}
		this._statusBarIcon.show();
	}

	public runTests(document: vscode.TextDocument) {
		if (document.languageId !== 'python') {
			console.log("Not a python file - nothing to do.");
			return;
		}
		if (!this._isEnabled) {
			console.log("Autotest is disabled - nothing to do.");
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
				this._statusBarIcon.text = 'Autotest Failed';
				this._statusBarIcon.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
				this._statusBarIcon.show();
			}
			else {
				this._statusBarIcon.text = 'Autotest Passed';
				this._statusBarIcon.backgroundColor = new vscode.ThemeColor('statusBarItem.background');
				this._statusBarIcon.show();
			}
		});
	}
}
