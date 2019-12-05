// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require("fs");
const path = require("path");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pho-pyqt-class-generator" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.createMatchingPyQtClass', async function (contextPassed) {
		// The code you place here will be executed every time your command is executed
		vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: contextPassed ${contextPassed}`);
		
		const filesystemPath = contextPassed.fsPath
		// vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: filesystemPath ${filesystemPath}`);
		// See "https://stackoverflow.com/questions/29496515/get-directory-from-a-file-path-or-url". Could also use "e.substr(0, e.lastIndexOf("/"))"
		const folderPath = path.dirname(filesystemPath)

		// resourceFilename

		const fileName = filesystemPath.substring(filesystemPath.lastIndexOf('/')+1);
		// var filename = filesystemPath.replace(/^.*[\\\/]/, '')
		if (!fileName) return;

		vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: fileName ${fileName}`);

		// Copied from "https://scotch.io/tutorials/creating-a-python-class-generator-for-vs-code"
		if (!vscode.workspace.workspaceFolders) {
			return vscode.window.showErrorMessage(
			  "Please open a directory before creating a class."
			);
		}

		const className = path.parse(fileName).name;
		if (!className) return;

		vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: className ${className}`);

		const properties = [];
		properties.push('parent=None');

		// Create class content string:
		const classDefinition = `class ${className}:`;
		const constructorDefinition = `def __init__(self, ${properties.join(", ")}):`;
		
		const constructorAssignments = properties
		.map(property => `self.${property} = ${property}\n\t\t`)
		.join("");

		const classGetters = properties
		.map(
		  property => `\tdef get_${property}(self):\n\t\treturn self.${property}\n\n`
		)
		.join("");

		const dunderStrString = `\tdef __str__():\n \t\treturn ${properties
			.map(property => '"' + property + ': "' + " + " + property + ' + " , " + ')
			.join("")
			.slice(0, -11)}`;

		const classString = `${classDefinition}
		${constructorDefinition}
			${constructorAssignments}
	${classGetters}
	${dunderStrString}`;

		// Write the file to disk
		fs.writeFile(path.join(folderPath, `${className}.py`), classString, err => {
			if (err) {
			  vscode.window.showErrorMessage("Something went wrong");
			  return console.log(err);
			}
			vscode.window.showInformationMessage(`${className} Class created.`);
		  });

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
