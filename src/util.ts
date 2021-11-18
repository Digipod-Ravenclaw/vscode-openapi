import * as vscode from "vscode";
import * as yaml from "js-yaml";
import { parserOptions } from "./parser-options";
import { replace } from "@xliic/openapi-ast-node";
import { InsertReplaceRenameFix, FixType, FixContext, Fix, OpenApiVersion } from "./types";
import parameterSources from "./audit/quickfix-sources";
import { parse, Parsed } from "@xliic/preserving-json-yaml-parser";
import {
  findJsonNodeValue,
  getChildren,
  getDepth,
  getKey,
  getKeyRange,
  getLastChild,
  getParent,
  getRange,
  getRanges,
  getRootAsJsonNodeValue,
  getValueRange,
  isArray,
  isObject,
  JsonNodeValue,
  next,
  prev,
} from "./json-utils";
import { componentsTags, topTags } from "./audit/quickfix";

export class DocumentIndent {
  private readonly indent: number;
  private readonly indentChar: string;

  constructor(indent: number, indentChar: string) {
    this.indent = indent;
    this.indentChar = indentChar;
  }

  public getIndent() {
    return this.indent;
  }

  public getIndentChar() {
    return this.indentChar;
  }

  public toDefaultString(): string {
    return this.indentChar.repeat(this.indent);
  }

  public toString(n: number) {
    return this.indentChar.repeat(n);
  }

  public static defaultInstance(): DocumentIndent {
    return new DocumentIndent(2, " ");
  }
}

function getBasicIndent(document: vscode.TextDocument, root: Parsed): DocumentIndent {
  const children = getChildren(getRootAsJsonNodeValue(root));
  if (document.languageId === "json") {
    if (children.length > 0) {
      const position = document.positionAt(getRange(root, children[0])[0]);
      const index = document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
      return new DocumentIndent(index, getCharAtIndex(document, position.line, index));
    }
  } else {
    for (const child of children) {
      if (isObject(child)) {
        const ranges = getRanges(child);
        if (ranges && ranges.length > 0) {
          const position = document.positionAt(ranges[0][0]);
          const index = Math.round(document.lineAt(position.line).firstNonWhitespaceCharacterIndex);
          return new DocumentIndent(index, getCharAtIndex(document, position.line, index));
        }
      }
    }
  }
  return DocumentIndent.defaultInstance();
}

function getCharAtIndex(document: vscode.TextDocument, line: number, index: number): string {
  return document.getText(
    new vscode.Range(new vscode.Position(line, index - 1), new vscode.Position(line, index))
  );
}

function getText(document: vscode.TextDocument, start: number, end: number): string {
  return document.getText(new vscode.Range(document.positionAt(start), document.positionAt(end)));
}

function getCurrentIndent(document: vscode.TextDocument, offset: number): number {
  const position = document.positionAt(offset);
  return document.lineAt(position.line).firstNonWhitespaceCharacterIndex;
}

function getLineByOffset(document: vscode.TextDocument, offset: number): vscode.TextLine {
  return document.lineAt(document.positionAt(offset).line);
}

function getTopLineByOffset(document: vscode.TextDocument, offset: number): vscode.TextLine {
  return document.lineAt(document.positionAt(offset).line - 1);
}

function shift(
  text: string,
  indent: DocumentIndent,
  padding: number,
  extra: number = 0,
  prepend: boolean = true
): string {
  if (prepend) {
    text = indent.toString(padding) + text;
  }
  text = text.replace(new RegExp("\n", "g"), "\n" + indent.toString(padding + extra));
  text = text.replace(new RegExp("\t", "g"), indent.toDefaultString());
  return text;
}

export function renameKeyNode(context: FixContext): vscode.Range {
  const document = context.document;
  const target = context.target;
  const [start, end] = getKeyRange(context.root, target);
  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

export function deleteJsonNode(context: FixContext): vscode.Range {
  const document = context.document;
  const target = context.target;
  let startPosition: vscode.Position;
  const prevTarget = prev(context.root, target);

  if (prevTarget) {
    const [, end] = getRange(context.root, prevTarget);
    const line = getLineByOffset(document, end);
    const nextTarget = next(context.root, target);
    startPosition = new vscode.Position(line.lineNumber, line.text.length + (nextTarget ? 0 : -1));
  } else {
    const parent = getParent(context.root, target);
    const [start] = getRange(context.root, parent);
    const line = getLineByOffset(document, start);
    startPosition = new vscode.Position(line.lineNumber, line.text.length);
  }

  const [, end] = getRange(context.root, target);
  const line = getLineByOffset(document, end);
  const endPosition = new vscode.Position(line.lineNumber, line.text.length);

  return new vscode.Range(startPosition, endPosition);
}

export function deleteYamlNode(context: FixContext): vscode.Range {
  const document = context.document;
  const target = context.target;
  const [start, end] = getRange(context.root, target);

  let apply = false;
  let startPosition = document.positionAt(start);
  let endPosition = document.positionAt(end);
  const parent = getParent(context.root, target);

  if (isArray(parent)) {
    const nextTarget = next(context.root, target);
    if (nextTarget) {
      const line = getLineByOffset(document, getRange(context.root, nextTarget)[0]);
      startPosition = document.positionAt(start - "- ".length);
      endPosition = new vscode.Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex);
    } else {
      startPosition = new vscode.Position(getLineByOffset(document, start).lineNumber, 0);
      endPosition = new vscode.Position(getLineByOffset(document, end).lineNumber + 1, 0);
    }
    apply = true;
  } else if (isObject(parent)) {
    const nextTarget = next(context.root, target);
    if (nextTarget) {
      const line = getLineByOffset(document, getRange(context.root, nextTarget)[0]);
      endPosition = new vscode.Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex);
    } else {
      startPosition = new vscode.Position(getLineByOffset(document, start).lineNumber, 0);
      endPosition = new vscode.Position(getLineByOffset(document, end).lineNumber + 1, 0);
    }
    apply = true;
  }

  if (apply) {
    return new vscode.Range(startPosition, endPosition);
  }
}

export function insertJsonNode(context: FixContext, value: string): [string, vscode.Position] {
  const document = context.document;
  const root = context.root;
  const target = context.target;
  const snippet = context.snippet;

  let start: number, end: number;
  const indent = getBasicIndent(document, root);

  let anchor: JsonNodeValue;
  if (isObject(target)) {
    anchor = keepInsertionOrder(context) ? getAnchor(context, true) : getLastChild(target);
  } else {
    anchor = getLastChild(target);
  }

  if (anchor === null) {
    [start, end] = getValueRange(root, target);
    const text = getText(document, start, end);
    end = start + 1;
    const padding = getCurrentIndent(document, getRange(root, target)[0]) + indent.getIndent();
    if (snippet) {
      value = "\n\t" + value.replace(new RegExp("\n", "g"), "\n\t");
    } else {
      value = "\n" + indent.toString(padding) + shift(value, indent, padding, 0, false);
    }
    if (!text.includes("\n")) {
      value += "\n";
    }
    if (getChildren(target).length > 0) {
      value += ",";
    }
    return [value, document.positionAt(end)];
  } else {
    [start, end] = getRange(root, anchor);
    const padding = getCurrentIndent(document, start);
    const position = document.positionAt(end);
    if (snippet) {
      return [",\n" + value, position];
    } else {
      return [",\n" + shift(value, indent, padding), position];
    }
  }
}

export function insertYamlNode(context: FixContext, value: string): [string, vscode.Position] {
  const document = context.document;
  const root = context.root;
  const target = context.target;
  let position: vscode.Position;
  let start: number, end: number;

  let anchor: JsonNodeValue;
  if (isObject(target)) {
    anchor = getAnchor(context, false);
  }

  let newLine = "";
  if (anchor) {
    [start, end] = getRange(root, anchor);
    position = document.positionAt(start);
  } else {
    // Insert pointer is either {} or [], nothing else
    const ranges = getRanges(target);
    if (ranges && ranges.length > 0) {
      [start, end] = ranges[ranges.length - 1];
      position = document.positionAt(end);
      if (position.line + 1 === document.lineCount && document.lineCount > 1) {
        position = document.positionAt(start);
        position = new vscode.Position(position.line, 0);
      } else {
        if (position.line + 1 === document.lineCount) {
          newLine = "\n";
        }
        position = new vscode.Position(position.line + 1, 0);
      }
    }
  }

  const index = getCurrentIndent(document, start);
  const indent = getBasicIndent(document, root);

  if (isObject(target)) {
    value = newLine + shift(value, indent, index) + "\n";
    return [value, position];
  } else if (isArray(target)) {
    value = shift("- " + value, indent, index, "- ".length) + "\n";
    return [value, position];
  }
}

export function replaceJsonNode(context: FixContext, value: string): [string, vscode.Range] {
  const document = context.document;
  const root = context.root;
  const target = context.target;
  const [start, end] = getValueRange(root, target);

  const isObject = value.startsWith("{") && value.endsWith("}");
  const isArray = value.startsWith("[") && value.endsWith("]");

  if (isObject || isArray) {
    const index = getCurrentIndent(document, start);
    const indent = getBasicIndent(document, root);
    value = shift(value, indent, index, 0, false);
  }
  return [value, new vscode.Range(document.positionAt(start), document.positionAt(end))];
}

export function replaceYamlNode(context: FixContext, value: string): [string, vscode.Range] {
  const document = context.document;
  const root = context.root;
  const target = context.target;
  const [start, end] = getValueRange(root, target);

  const i1 = value.indexOf(":");
  const i2 = value.indexOf("- ");
  const isObjectValue = i1 > 0 && (i2 < 0 || (i2 > 0 && i2 > i1));
  const isArrayValue = i2 >= 0 && (i1 < 0 || (i1 > 0 && i1 > i2));

  if (isObjectValue || isArrayValue) {
    const index = getCurrentIndent(document, start);
    const indent = getBasicIndent(document, root);
    // Last array member end offset may be at the beggining of the next key node (next line)
    // In this case we must keep ident + \n symbols
    if (isArray(target)) {
      const line = getLineByOffset(document, end);
      // But do not handle the case if the last array member = the last item in the doc
      if (!line.text.trim().startsWith("-")) {
        const line = getTopLineByOffset(document, end);
        const endPosition = new vscode.Position(line.lineNumber, line.text.length);
        value = shift(value, indent, index, 0, false);
        return [value, new vscode.Range(document.positionAt(start), endPosition)];
      }
    }
    // Replace plain value with not plain one (add a new line)
    const parent = getParent(context.root, target);
    if (!(isArray(target) || isObject(target)) && isObject(parent)) {
      value = shift("\n" + value, indent, index, indent.getIndent(), false);
    }
  }
  return [value, new vscode.Range(document.positionAt(start), document.positionAt(end))];
}

export function getFixAsJsonString(context: FixContext): string {
  const snippet = context.snippet;
  const fix = <InsertReplaceRenameFix>context.fix;
  const type = fix.type;
  let text = JSON.stringify(fix.fix, null, "\t").trim();
  if (fix.parameters) {
    text = handleParameters(context, text);
  }
  // For snippets we must escape $ symbol
  if (snippet && (type === FixType.Insert || type === FixType.Replace)) {
    text = text.replace(new RegExp("\\$ref", "g"), "\\$ref");
  }
  if (isObject(context.target) && type === FixType.Insert) {
    text = text.replace("{\n\t", "");
    text = text.replace("\n}", "");
    // Replace only trailing \t, i.e. a\t\t\ta\t\ta\t -> a\t\ta\ta
    text = text.replace(new RegExp("\t(?!\t)", "g"), "");
  }
  return text;
}

export function getFixAsYamlString(context: FixContext): string {
  const snippet = context.snippet;
  const fix = <InsertReplaceRenameFix>context.fix;
  const type = fix.type;
  let text = yaml.dump(fix.fix, { indent: 2 }).trim();
  if (fix.parameters) {
    text = handleParameters(context, text);
  }
  // For snippets we must escape $ symbol
  if (snippet && (type === FixType.Insert || type === FixType.Replace)) {
    text = text.replace(new RegExp("\\$ref", "g"), "\\$ref");
  }
  // 2 spaces is the ident for the dump()
  return text.replace(new RegExp("  ", "g"), "\t");
}

function handleParameters(context: FixContext, text: string): string {
  const replacements = [];
  const { issues, fix, version, bundle, document, snippet } = context;
  const languageId = context.document.languageId;

  const root = safeParse(text, languageId);

  for (const parameter of context.fix.parameters) {
    const pointer = parameter.path;
    const index = replacements.length + 1;
    const replaceKey = parameter.type === "key";
    let phValues = parameter.values;
    const target = findJsonNodeValue(root, pointer);
    let defaultValue = replaceKey ? getKey(target) : target.value;
    let cacheValues = null;

    if (parameter.source && parameterSources[parameter.source]) {
      const source = parameterSources[parameter.source];
      const issue = parameter.fixIndex ? issues[parameter.fixIndex] : issues[0];
      cacheValues = source(issue, fix, parameter, version, bundle, document);
    }

    let finalValue: string;
    if (snippet) {
      finalValue = getPlaceholder(index, defaultValue, phValues, cacheValues);
    } else {
      if (cacheValues && cacheValues.length > 0) {
        finalValue = cacheValues[0];
      } else {
        finalValue = defaultValue;
        // Faster just to skip this replacement, leaving it default as it is
        continue;
      }
    }

    replacements.push({
      pointer: pointer,
      value: finalValue,
      replaceKey: replaceKey,
    });
  }

  return replace(text, languageId, replacements);
}

function getPlaceholder(
  index: number,
  defaultValue: string,
  possibleValues: any[],
  cacheValues: any[]
): string {
  if (cacheValues && cacheValues.length > 0) {
    if (possibleValues) {
      possibleValues = cacheValues;
    } else {
      defaultValue = cacheValues[0];
    }
  }

  if (possibleValues) {
    // Escape comma symbols
    possibleValues = possibleValues.map((value: any) => {
      if (typeof value === "string") {
        return value.replace(new RegExp(",", "g"), "\\,");
      } else {
        return value;
      }
    });
  } else if (typeof defaultValue === "string") {
    // Escape $ and } inside placeholders (for example in regexp)
    defaultValue = defaultValue
      .replace(new RegExp("\\$", "g"), "\\$")
      .replace(new RegExp("}", "g"), "\\}");
  }

  return (
    "${" + index + (possibleValues ? "|" + possibleValues.join() + "|" : ":" + defaultValue) + "}"
  );
}

export function safeParse(text: string, languageId: string): Parsed {
  const [root, errors] = parse(text, languageId, parserOptions);
  if (errors.length) {
    throw new Error("Can't parse OpenAPI file");
  }
  return root;
}

function findInsertionAnchor(
  root: Parsed,
  element: string,
  tags: string[],
  prefix: string,
  after: boolean
): JsonNodeValue {
  if (after === false) {
    for (let position = tags.indexOf(element) + 1; position < tags.length; position++) {
      const anchor = findJsonNodeValue(root, `${prefix}/${tags[position]}`);
      if (anchor) {
        return anchor;
      }
    }
  } else {
    for (let position = tags.indexOf(element) - 1; position >= 0; position--) {
      const anchor = findJsonNodeValue(root, `${prefix}/${tags[position]}`);
      if (anchor) {
        return anchor;
      }
    }
  }
  return null;
}

function keepInsertionOrder(context: FixContext): boolean {
  const { version, target } = context;
  return (
    target.pointer === "" || (version === OpenApiVersion.V3 && target.pointer === "/components")
  );
}

function getAnchor(context: FixContext, after: boolean): JsonNodeValue {
  const { root, version, target, fix } = context;
  const keys = Object.keys(fix["fix"]);
  if (keys.length === 1) {
    const key = keys[0];
    if (target.pointer === "") {
      return findInsertionAnchor(root, key, topTags, "", after);
    } else if (version === OpenApiVersion.V3 && target.pointer === "/components") {
      return findInsertionAnchor(root, key, componentsTags, "/components", after);
    }
  }
  return null;
}
