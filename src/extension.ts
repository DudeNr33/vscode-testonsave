import { exec } from 'child_process';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	const extension = new TestOnSave(context);

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		extension.runTests(document);
	});
}

class TestOnSave {
	private _testCommand: any = null;
	private _isEnabled: any = false;
	private _languageId: any = "any";
	private _exitCodePass: Set<Number> = new Set<Number>();
	private _exitCodeFail: Set<Number> = new Set<Number>();
	private _exitCodeError: Set<Number> = new Set<Number>();
	private _running: boolean = false;
	private _outputChannel: vscode.OutputChannel;
	private _statusBarIcon: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext) {
		// Create a private command to toggle between enabled/disabled. This command is not accessible through the command palette.
		const enableDisableCommandId = 'testOnSave.enableDisable';
		context.subscriptions.push(vscode.commands.registerCommand(enableDisableCommandId, () => {
			this._isEnabled ? this._disable() : this._enable();
		}));
		// The status bar item shows the last test result (if TestOnSave is enabled) and can be clicked to toggle between enabled/disabled.
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
		let languageId = <String>vscode.workspace.getConfiguration('testOnSave').get('languageId');
		this._languageId = languageId.trim();
		this._isEnabled ? this._enable() : this._disable();
		let exitCodePassString = <String>vscode.workspace.getConfiguration('testOnSave').get('exitCodePass');
		this._exitCodePass = this._parseExitCodes(exitCodePassString);
		let exitCodeFailString = <String>vscode.workspace.getConfiguration('testOnSave').get('exitCodeFail');
		this._exitCodeFail = this._parseExitCodes(exitCodeFailString);
		let exitCodeErrorString = <String>vscode.workspace.getConfiguration('testOnSave').get('exitCodeError');
		this._exitCodeError = this._parseExitCodes(exitCodeErrorString);
		console.log(this._exitCodePass);
		console.log(this._exitCodeFail);
		console.log(this._exitCodeError);
	}

	/**
	 * Create a set of all possible exit codes as defined by the exitCodes string.
	 * @param exitCodes - A string representing ranges of exit codes separated by commas.
	 * 					  For example, "0,1,2-4,6-9" would match exit codes 0, 1, 2, 3, 4, 6, 7, 8, 9.	
	 */
	private _parseExitCodes(exitCodes: String): Set<Number> {
		const exitCodesSet = new Set<Number>();
		if (exitCodes === null || exitCodes === undefined || exitCodes.trim() === "") {
			return exitCodesSet;
		}
		const exitCodesArray = exitCodes.split(',');
		for (let i = 0; i < exitCodesArray.length; i++) {
			const exitCodeRange = exitCodesArray[i].trim().split('-');
			if (exitCodeRange.length === 1) {
				exitCodesSet.add(parseInt(exitCodeRange[0]));
			} else if (exitCodeRange.length === 2) {
				for (let j = parseInt(exitCodeRange[0]); j <= parseInt(exitCodeRange[1]); j++) {
					exitCodesSet.add(j);
				}
			}
		}
		return exitCodesSet;
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
		return this._languageId === "any" || document.languageId === this._languageId;
	}

	private _getWorkingDirectory(document: vscode.TextDocument): string | undefined {
		const workspaceFolderUri = vscode.workspace.getWorkspaceFolder(document.uri);
		if (!workspaceFolderUri) {
			console.error("workspaceFolderUri is null");
			return undefined;
		}
		return workspaceFolderUri.uri.fsPath;
	}

	private _getStatusIconForExitCode(exitCode: Number): string {
		if (this._exitCodePass.has(exitCode)) {
			return '$(testing-passed-icon)';
		} else if (this._exitCodeFail.has(exitCode)) {
			return '$(testing-failed-icon)';
		} else if (this._exitCodeError.has(exitCode)) {
			return '$(testing-error-icon)';
		} else {
			return '$(question)';
		}
	}

	public runTests(document: vscode.TextDocument) {
		if (!this._isEnabled || this._running || !this._isRelevantFile(document)) {
			// TestOnSave is disabled, or we are already running tests, or the file is not relevant.
			return;
		}
		if (this._testCommand === null || this._testCommand.trim() === "") {
			// No test command configured or empty.
			vscode.window.showErrorMessage('No test command configured');
			return;
		}
		const workspaceFolderPath = this._getWorkingDirectory(document);
		if (workspaceFolderPath === undefined) {
			return;
		}
		this._outputChannel.clear();
		this._running = true;
		this._statusUpdate("$(loading~spin) Tests");
		let child = exec(this._testCommand, { cwd: workspaceFolderPath });
		if (child.stdout && child.stderr) {
			child.stdout.on('data', data => { this._outputChannel.append(data); });
			child.stderr.on('data', data => { this._outputChannel.append(data); });
		}
		child.on('error', e => {
			this._outputChannel.append(e.message);
		});
		child.on('exit', code => {
			let statusIcon = '$(question)';
			if (code !== null) {
				statusIcon = this._getStatusIconForExitCode(code);
			}
			this._statusUpdate(`${statusIcon} Tests`);
			this._running = false;
		});
	}
}
