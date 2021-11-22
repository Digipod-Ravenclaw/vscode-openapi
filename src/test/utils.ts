/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { TestFS } from "./memfs";
import * as assert from "assert";
import { readFileSync } from "fs";
import { workspace, window, TextEditor, TextDocument } from "vscode";
import { FixContext, FixType } from "../types";
import { find, parseJson, parseYaml } from "@xliic/preserving-json-yaml-parser";
import { findJsonNodeValue, JsonNodeValue } from "../json-utils";
import { getFixAsJsonString, renameKeyNode, replaceJsonNode, safeParse } from "../util";

export async function replaceKey(editor: vscode.TextEditor, pointer: string, key: string) {
  const root = safeParse(editor.document.getText(), editor.document.languageId);
  const context: FixContext = {
    editor: editor,
    edit: null,
    issues: [],
    fix: {
      problem: ["x"],
      title: "x",
      type: FixType.RenameKey,
      fix: key,
    },
    bulk: false,
    snippet: false,
    auditContext: null,
    version: null,
    bundle: null,
    root: root,
    target: findJsonNodeValue(root, pointer),
    document: editor.document,
  };

  const edit = new vscode.WorkspaceEdit();
  edit.replace(editor.document.uri, renameKeyNode(context), getFixAsJsonString(context));
  await vscode.workspace.applyEdit(edit);
}

export async function replaceValue(editor: vscode.TextEditor, pointer: string, value: string) {
  const root = safeParse(editor.document.getText(), editor.document.languageId);
  const context: FixContext = {
    editor: editor,
    edit: null,
    issues: [],
    fix: {
      problem: ["x"],
      title: "x",
      type: FixType.Replace,
      fix: value,
    },
    bulk: false,
    snippet: false,
    auditContext: null,
    version: null,
    bundle: null,
    root: root,
    target: findJsonNodeValue(root, pointer),
    document: editor.document,
  };

  const edit = new vscode.WorkspaceEdit();
  const [fixAsString, range] = replaceJsonNode(context, getFixAsJsonString(context));
  edit.replace(editor.document.uri, range, fixAsString);
  await vscode.workspace.applyEdit(edit);
}

export function rndName() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, 10);
}

export const testFs = new TestFS("fake-fs", true);
vscode.workspace.registerFileSystemProvider(testFs.scheme, testFs, {
  isCaseSensitive: testFs.isCaseSensitive,
});

export async function createRandomFile(
  contents = "",
  dir: vscode.Uri | undefined = undefined,
  ext = ""
): Promise<vscode.Uri> {
  let fakeFile: vscode.Uri;
  if (dir) {
    assert.equal(dir.scheme, testFs.scheme);
    fakeFile = dir.with({ path: dir.path + "/" + rndName() + ext });
  } else {
    fakeFile = vscode.Uri.parse(`${testFs.scheme}:/${rndName() + ext}`);
  }
  testFs.writeFile(fakeFile, Buffer.from(contents), { create: true, overwrite: true });
  return fakeFile;
}

export async function deleteFile(file: vscode.Uri): Promise<boolean> {
  try {
    testFs.delete(file);
    return true;
  } catch {
    return false;
  }
}

export function pathEquals(path1: string, path2: string): boolean {
  if (process.platform !== "linux") {
    path1 = path1.toLowerCase();
    path2 = path2.toLowerCase();
  }

  return path1 === path2;
}

export function closeAllEditors(): Thenable<any> {
  return vscode.commands.executeCommand("workbench.action.closeAllEditors");
}

export async function revertAllDirty(): Promise<void> {
  return vscode.commands.executeCommand("_workbench.revertAllDirty");
}

export function disposeAll(disposables: vscode.Disposable[]) {
  vscode.Disposable.from(...disposables).dispose();
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withLogDisabled(runnable: () => Promise<any>): () => Promise<void> {
  return async (): Promise<void> => {
    const logLevel = await vscode.commands.executeCommand("_extensionTests.getLogLevel");
    await vscode.commands.executeCommand("_extensionTests.setLogLevel", 6 /* critical */);

    try {
      await runnable();
    } finally {
      await vscode.commands.executeCommand("_extensionTests.setLogLevel", logLevel);
    }
  };
}

export function loadJson(filename) {
  return parseJson(readFileSync(filename, { encoding: "utf8" }));
}

export function loadYaml(filename) {
  return parseYaml(readFileSync(filename, { encoding: "utf8" }));
}

export function withRandomFileEditor(
  initialContents: string,
  languageId: string,
  run: (editor: TextEditor, doc: TextDocument) => Thenable<void>
): Thenable<boolean> {
  return workspace
    .openTextDocument({ language: languageId, content: initialContents })
    .then((doc) => {
      return window.showTextDocument(doc).then((editor) => {
        return run(editor, doc).then((_) => {
          return true;
        });
      });
    });
}

export function getContextUpdatedByPointer(context: FixContext, pointer: string): FixContext {
  context.target = findJsonNodeValue(context.root, pointer);
  return context;
}

export function wrap(text: string): string {
  return text.replace(new RegExp("\r\n", "g"), "\n");
}

export function assertStrictNodesEqual(node1: JsonNodeValue, node2: JsonNodeValue) {
  assert.strictEqual(node1.value, node2.value);
  assert.strictEqual(node1.pointer, node2.pointer);
}

export function assertStrictNodeEqual(node: JsonNodeValue, value: any, pointer: string) {
  assert.strictEqual(node.value, value);
  assert.strictEqual(node.pointer, pointer);
}
