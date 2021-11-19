import assert from "assert";
import * as vscode from "vscode";
import { withRandomFileEditor } from "../utils";
import {
  getFixAsJsonString,
  getFixAsYamlString,
  insertJsonNode,
  insertYamlNode,
  safeParse,
} from "../../util";
import { FixContext, FixType, InsertReplaceRenameFix } from "../../types";
import { findJsonNodeValue } from "../../json-utils";

suite("Insert Node (Snippet)", () => {
  test("Method insertJsonNode (object)", async () => {
    const text = '{\n "a": {\n  "a1": "foo"\n },\n "c": [\n  1\n ]\n}';
    const expected = '{\n "a": {\n  "a1": "foo",\n  "a2": "baz"\n },\n "c": [\n  1\n ]\n}';
    const pointer = "/a";
    const fix = {
      problem: ["xxx"],
      title: "xxx",
      type: FixType.Insert,
      fix: {
        a2: "baz",
      },
    };

    await withRandomFileEditor(text, "json", async (editor, doc) => {
      let position: vscode.Position;
      const root = safeParse(editor.document.getText(), editor.document.languageId);

      const context: FixContext = {
        editor: editor,
        edit: null,
        issues: [],
        fix: <InsertReplaceRenameFix>fix,
        bulk: false,
        snippet: true,
        auditContext: null,
        version: null,
        bundle: null,
        root: root,
        target: findJsonNodeValue(root, pointer),
        document: editor.document,
      };

      let value = getFixAsJsonString(context);
      [value, position] = insertJsonNode(context, value);

      return editor.insertSnippet(new vscode.SnippetString(value), position).then(() => {
        assert.ok(doc.isDirty);
        assert.strictEqual(doc.getText(), expected);
      });
    });
  });

  test("Method insertJsonNode (array)", async () => {
    const text = '{\n "a": {\n  "a1": "foo"\n },\n "c": [\n  1\n ]\n}';
    // Windows insert snippet doesn't format correctly
    const expectedForWindows =
      '{\n "a": {\n  "a1": "foo"\n },\n "c": [\n  1,\n  {\n      "a2": "baz"\n  }\n ]\n}';
    const expected =
      '{\n "a": {\n  "a1": "foo"\n },\n "c": [\n  1,\n  {\n   "a2": "baz"\n  }\n ]\n}';
    const pointer = "/c";
    const fix = {
      problem: ["xxx"],
      title: "xxx",
      type: FixType.Insert,
      fix: {
        a2: "baz",
      },
    };

    await withRandomFileEditor(text, "json", async (editor, doc) => {
      let position: vscode.Position;
      const root = safeParse(editor.document.getText(), editor.document.languageId);

      const context: FixContext = {
        editor: editor,
        edit: null,
        issues: [],
        fix: <InsertReplaceRenameFix>fix,
        bulk: false,
        snippet: true,
        auditContext: null,
        version: null,
        bundle: null,
        root: root,
        target: findJsonNodeValue(root, pointer),
        document: editor.document,
      };

      let value = getFixAsJsonString(context);
      [value, position] = insertJsonNode(context, value);

      return editor.insertSnippet(new vscode.SnippetString(value), position).then(() => {
        assert.ok(doc.isDirty);
        const text = doc.getText();
        assert.ok(text == expected || text == expectedForWindows);
      });
    });
  });

  test("Method insertYamlNode (object)", async () => {
    const text = "a:\n  a1: foo\nc:\n  - 1\n";
    const expected = "a:\n  a1: foo\n  a2: baz\nc:\n  - 1\n";
    const pointer = "/a";
    const fix = {
      problem: ["xxx"],
      title: "xxx",
      type: FixType.Insert,
      fix: {
        a2: "baz",
      },
    };

    await withRandomFileEditor(text, "yaml", async (editor, doc) => {
      let position: vscode.Position;
      const root = safeParse(editor.document.getText(), editor.document.languageId);

      const context: FixContext = {
        editor: editor,
        edit: null,
        issues: [],
        fix: <InsertReplaceRenameFix>fix,
        bulk: false,
        snippet: true,
        auditContext: null,
        version: null,
        bundle: null,
        root: root,
        target: findJsonNodeValue(root, pointer),
        document: editor.document,
      };

      let value = getFixAsYamlString(context);
      [value, position] = insertYamlNode(context, value);

      return editor.insertSnippet(new vscode.SnippetString(value), position).then(() => {
        assert.ok(doc.isDirty);
        assert.strictEqual(doc.getText(), expected);
      });
    });
  });

  test("Method insertYamlNode (array)", async () => {
    const text = "a:\n  a1: foo\nc:\n  - 1\n";
    const expected = "a:\n  a1: foo\nc:\n  - 1\n  - a2: baz\n";
    const pointer = "/c";
    const fix = {
      problem: ["xxx"],
      title: "xxx",
      type: FixType.Insert,
      fix: {
        a2: "baz",
      },
    };

    await withRandomFileEditor(text, "yaml", async (editor, doc) => {
      let position: vscode.Position;
      const root = safeParse(editor.document.getText(), editor.document.languageId);

      const context: FixContext = {
        editor: editor,
        edit: null,
        issues: [],
        fix: <InsertReplaceRenameFix>fix,
        bulk: false,
        snippet: true,
        auditContext: null,
        version: null,
        bundle: null,
        root: root,
        target: findJsonNodeValue(root, pointer),
        document: editor.document,
      };

      let value = getFixAsYamlString(context);
      [value, position] = insertYamlNode(context, value);

      return editor.insertSnippet(new vscode.SnippetString(value), position).then(() => {
        assert.ok(doc.isDirty);
        assert.strictEqual(doc.getText(), expected);
      });
    });
  });
});
