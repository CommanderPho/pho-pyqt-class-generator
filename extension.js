// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require("fs");
const path = require("path");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * Given a source directory and a target filename, return the relative
 * file path from source to target.
 * @param source {String} directory path to start from for traversal
 * @param target {String} directory path and filename to seek from source
 * @return Relative path (e.g. "../../style.css") as {String}
 */
function getRelativePath(source, target) {
    var sep = (source.indexOf("/") !== -1) ? "/" : "\\",
        targetArr = target.split(sep),
        sourceArr = source.split(sep),
        filename = targetArr.pop(),
        targetPath = targetArr.join(sep),
        relativePath = "";
    
    while (targetPath.indexOf(sourceArr.join(sep)) === -1) {
        sourceArr.pop();
        relativePath += ".." + sep;
    }
    
    var relPathArr = targetArr.slice(sourceArr.length);
    relPathArr.length && (relativePath += relPathArr.join(sep) + sep);
    
    return relativePath + filename;
}



/**
 * Given a source directory and a target filename, return the relative
 * file path from source to target.
 * @param className {String} directory path to start from for traversal
 * @param fileName {String} directory path and filename to seek from source
 * @return Relative path (e.g. "../../style.css") as {String}
 */
function buildOldFile(className, fileName, relativeFilePath, externalImportComment, properties) {
        // const indentationSymbol = `\t`; // 1 tab
        const indentationSymbol = `    `; // 4 spaces

        const uiFileName = `${className}.ui`;

        // Create class content string:
        const commentHeader = `# ${className}.py
# Generated from ${fileName} automatically by PhoPyQtClassGenerator VSCode Extension`;

        const uicLoadUIPath = `
## Define the .ui file path
path = os.path.dirname(os.path.abspath(__file__))
uiFile = os.path.join(path, '${uiFileName}')
`

        const headerDefinition = `
import sys
import os

from PyQt5 import QtGui, QtWidgets, uic
from PyQt5.QtWidgets import QMessageBox, QToolTip, QStackedWidget, QHBoxLayout, QVBoxLayout, QSplitter, QFormLayout, QLabel, QFrame, QPushButton, QTableWidget, QTableWidgetItem
from PyQt5.QtWidgets import QApplication, QFileSystemModel, QTreeView, QWidget, QHeaderView
from PyQt5.QtGui import QPainter, QBrush, QPen, QColor, QFont, QIcon
from PyQt5.QtCore import Qt, QPoint, QRect, QObject, QEvent, pyqtSignal, pyqtSlot, QSize, QDir

## IMPORTS:
# ${externalImportComment}

${uicLoadUIPath}
`;
        const classDefinition = `class ${className}(QWidget):`;
        const allInitializerPropertyArguments = properties.concat(["parent=None"])
        const propertiesInitializerString = allInitializerPropertyArguments.join(", ")
        
        const constructorDefinition = `
${indentationSymbol}def __init__(self, ${propertiesInitializerString}):`;
        const constructorPreAssignmentInitialization = `
${indentationSymbol}${indentationSymbol}super().__init__(parent=parent) # Call the inherited classes __init__ method
${indentationSymbol}${indentationSymbol}self.ui = uic.loadUi(uiFile, self) # Load the .ui file
`;
        const constructorPostAssignmentInitialization = `
${indentationSymbol}${indentationSymbol}self.initUI()
${indentationSymbol}${indentationSymbol}self.show() # Show the GUI
`;
        
        const constructorAssignments = properties
        .map(property => `self.${property} = ${property}\n${indentationSymbol}${indentationSymbol}`)
        .join("");

        const initUIFunctionDefinintion = `
    def initUI(self):
        pass`;

        const classGetters = properties
        .map(
          property => `${indentationSymbol}def get_${property}(self):\n${indentationSymbol}${indentationSymbol}return self.${property}\n\n`
        )
        .join("");

        var dunderStrStringProperties = properties.map(property => '"' + property + ': "' + " + " + property + ' + " , " + ').join("").slice(0, -11);
        var dunderStrString = ``;
        if (dunderStrStringProperties) {
            // dunderStrStringProperties = `'${className}'`
            dunderStrString = `${indentationSymbol}def __str__(self):\n ${indentationSymbol}${indentationSymbol}return ${dunderStrStringProperties}`;
        }
        else {
            dunderStrString = ``; // don't include a __str__ block
        }
        


        const rawQtTestAppSetupString = `
    app = QApplication([])
    widget = ${className}()
    widget.show()
    sys.exit(app.exec_())
`;

        const pyqtgraphQtTestAppSetupString = `
    app = mkQApp("${className} Example")
    widget = ${className}()
    widget.show()
    pg.exec()
`;


        const mainTestCodeString = `


## Start Qt event loop
if __name__ == '__main__':${rawQtTestAppSetupString}`;


        const classString = `${commentHeader}${headerDefinition}${classDefinition}${constructorDefinition}${constructorPreAssignmentInitialization}${constructorAssignments}${constructorPostAssignmentInitialization}${initUIFunctionDefinintion}${classGetters}${dunderStrString}${mainTestCodeString}`;
        return classString;
}



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
        // vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: contextPassed ${contextPassed}`);
        
        // Class properties to add to our new class. Untested.
        const properties = [];
        // properties.push('parent');


        const filesystemPath = contextPassed.fsPath;
        const fileName = filesystemPath.substring(filesystemPath.lastIndexOf('/')+1);
        if (!fileName) return;
        // vscode.window.showInformationMessage(`PhoPyQtClassGenerator Extension: Debug: filesystemPath ${filesystemPath}`);
        // See "https://stackoverflow.com/questions/29496515/get-directory-from-a-file-path-or-url". Could also use "e.substr(0, e.lastIndexOf("/"))"
        const folderPath = path.dirname(filesystemPath);
        // Build the new .py class name from the .ui filename
        const className = path.parse(fileName).name;
        if (!className) return;

        // Get the workspace project folder:
        // Copied from "https://scotch.io/tutorials/creating-a-python-class-generator-for-vs-code"
        if (!vscode.workspace.workspaceFolders) {
            return vscode.window.showErrorMessage(
              "Please open a directory before creating a class."
            );
        }
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;

        // Use the workspace project folder path and the file path to build the relative paths. Used in the initializer to specify the location of the .ui file and in the header comment to specify how to import our generated classes in another class
        const relativeFilePathBackslashes = getRelativePath(workspacePath, filesystemPath)
        const relativeFilePath = relativeFilePathBackslashes.replace(/\\/g, "/");
        const relativeParentPath = path.dirname(relativeFilePath)

        const relativePythonPathParts = relativeParentPath.split("/"); // An array of the parts (like ["GUI", "UI", "NewClassDialog"])
        const externalImportComment = `from ${relativePythonPathParts.join(".")} import ${className}`

        const classString = buildOldFile(className, fileName, relativeFilePath, externalImportComment, properties);

        // Write the file to disk
        fs.writeFile(path.join(folderPath, `${className}.py`), classString, err => {
            if (err) {
              vscode.window.showErrorMessage("Something went wrong");
              return console.log(err);
            }
            vscode.window.showInformationMessage(`${className} Class created.`);
          });

        // Display a message box to the user
        // vscode.window.showInformationMessage('Hello World!');
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
