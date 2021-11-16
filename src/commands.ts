/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { findNodeAtOffset, joinJsonPointer, simpleClone } from "@xliic/preserving-json-yaml-parser";
import * as snippets from "./generated/snippets.json";
import { Cache } from "./cache";
import { Fix, FixContext, FixType, OpenApiVersion } from "./types";
import { findJsonNodeValue } from "./json-utils";
import { fixInsert } from "./audit/quickfix";

const commands = {
  goToLine,
  copyJsonReference,
  createNewTwo,
  createNewThree,
  createNewTwoYaml,
  createNewThreeYaml,

  addPath,
  addOperation,
  addSecurity,
  addHost,
  addBasePath,
  addInfo,
  addSecurityDefinitionBasic,
  addSecurityDefinitionApiKey,
  addSecurityDefinitionOauth2Access,
  addDefinitionObject,
  addParameterBody,
  addParameterPath,
  addParameterOther,
  addResponse,

  v3addInfo,
  v3addComponentsResponse,
  v3addComponentsParameter,
  v3addComponentsSchema,
  v3addServer,
  v3addSecuritySchemeBasic,
  v3addSecuritySchemeApiKey,
  v3addSecuritySchemeJWT,
  v3addSecuritySchemeOauth2Access,

  copySelectedTwoPathOutlineJsonReference,
  copySelectedTwoParametersOutlineJsonReference,
  copySelectedTwoResponsesOutlineJsonReference,
  copySelectedTwoDefinitionOutlineJsonReference,
  copySelectedTwoSecurityOutlineJsonReference,
  copySelectedTwoSecurityDefinitionOutlineJsonReference,
  copySelectedThreePathOutlineJsonReference,
  copySelectedThreeServersOutlineJsonReference,
  copySelectedThreeComponentsOutlineJsonReference,
  copySelectedThreeSecurityOutlineJsonReference,
};

const registeredSnippetQuickFixes: { [key: string]: Fix } = {};

export function registerCommands(cache: Cache): vscode.Disposable[] {
  for (const fix of snippets.fixes) {
    registeredSnippetQuickFixes[fix.problem[0]] = fix as Fix;
  }
  return Object.keys(commands).map((name) => registerCommand(name, cache, commands[name]));
}

function registerCommand(name: string, cache: Cache, handler: Function): vscode.Disposable {
  const wrapped = async function (...args: any[]) {
    try {
      await handler(cache, ...args);
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to execute command: ${e.message}`);
    }
  };

  return vscode.commands.registerCommand(`openapi.${name}`, wrapped);
}

function goToLine(cache: Cache, range: vscode.Range) {
  const editor = vscode.window.activeTextEditor;
  editor.selection = new vscode.Selection(range.start, range.start);
  editor.revealRange(editor.selection, vscode.TextEditorRevealType.AtTop);
}

async function copyJsonReference(cache: Cache, range: vscode.Range) {
  const editor = vscode.window.activeTextEditor;
  const root = cache.getDocumentAst(editor.document);
  if (root) {
    const [node, path] = findNodeAtOffset(root, editor.document.offsetAt(editor.selection.active));
    const jsonPointer = joinJsonPointer(path);
    vscode.env.clipboard.writeText(`#${jsonPointer}`);
    const disposable = vscode.window.setStatusBarMessage(`Copied Reference: #${jsonPointer}`);
    setTimeout(() => disposable.dispose(), 1000);
  }
}

function copySelectedTwoPathOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoPathOutline");
}

function copySelectedTwoParametersOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoParametersOutline");
}

function copySelectedTwoResponsesOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoResponsesOutline");
}

function copySelectedTwoDefinitionOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoDefinitionOutline");
}

function copySelectedTwoSecurityOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoSecurityOutline");
}

function copySelectedTwoSecurityDefinitionOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiTwoSecurityDefinitionOutline");
}

function copySelectedThreePathOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiThreePathOutline");
}

function copySelectedThreeServersOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiThreeServersOutline");
}

function copySelectedThreeComponentsOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiThreeComponentsOutline");
}

function copySelectedThreeSecurityOutlineJsonReference(cache: Cache) {
  copySelectedJsonReference("openapiThreeSecurityOutline");
}

function copySelectedJsonReference(viewId: string) {
  // FIXME
  //copyNodeJsonReference(outlines[viewId].selection[0]);
}

async function createNew(snippet: string, language: string) {
  const document = await vscode.workspace.openTextDocument({
    language,
  });
  await vscode.window.showTextDocument(document);
  const editor = vscode.window.activeTextEditor;
  await editor.insertSnippet(new vscode.SnippetString(snippet), editor.document.positionAt(0));
}

async function createNewTwo(cache: Cache) {
  await createNew(snippets.newVersionTwo, "json");
}

async function createNewThree(cache: Cache) {
  await createNew(snippets.newVersionThree, "json");
}

async function createNewTwoYaml(cache: Cache) {
  await createNew(snippets.newVersionTwoYaml, "yaml");
}

async function createNewThreeYaml(cache: Cache) {
  await createNew(snippets.newVersionThreeYaml, "yaml");
}

async function addBasePath(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["basePath"], cache);
}

async function addHost(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["host"], cache);
}

async function addInfo(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["info"], cache);
}

async function v3addInfo(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["info"], cache);
}

async function addPath(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["path"], cache);
}

async function addSecurityDefinitionBasic(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["securityBasic"], cache);
}

async function addSecurityDefinitionOauth2Access(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["securityOauth2Access"], cache);
}

async function addSecurityDefinitionApiKey(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["securityApiKey"], cache);
}

async function addSecurity(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["security"], cache);
}

async function addDefinitionObject(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["definitionObject"], cache);
}

async function addParameterPath(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["parameterPath"], cache);
}

async function addParameterBody(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["parameterBody"], cache);
}

async function addParameterOther(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["parameterOther"], cache);
}

async function addResponse(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["response"], cache);
}

async function v3addComponentsResponse(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsResponse"], cache);
}

async function v3addComponentsParameter(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsParameter"], cache);
}

async function v3addComponentsSchema(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsSchema"], cache);
}

async function v3addSecuritySchemeBasic(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsSecurityBasic"], cache);
}

async function v3addSecuritySchemeApiKey(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsSecurityApiKey"], cache);
}

async function v3addSecuritySchemeJWT(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsSecurityJwt"], cache);
}

async function v3addSecuritySchemeOauth2Access(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["componentsSecurityOauth2Access"], cache);
}

async function v3addServer(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["server"], cache);
}

async function addOperation(cache: Cache) {
  await quickFixCommand(registeredSnippetQuickFixes["operation"], cache);
}

function noActiveOpenApiEditorGuard(cache: Cache) {
  if (
    cache.getDocumentVersion(vscode.window.activeTextEditor?.document) === OpenApiVersion.Unknown
  ) {
    vscode.window.showErrorMessage(`Can't run the command, no active editor with OpenAPI file`);
    return true;
  }
  return false;
}

async function quickFixCommand(fix: Fix, cache: Cache) {
  if (noActiveOpenApiEditorGuard(cache)) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const document = editor.document;
  const root = cache.getLastGoodDocumentAst(document);

  if (!root) {
    // FIXME display error message?
    return;
  }

  const bundle = await cache.getDocumentBundle(document);
  const version = cache.getDocumentVersion(document);
  const target = findJsonNodeValue(root, fix.pointer);

  const context: FixContext = {
    editor: editor,
    edit: null,
    issues: [],
    fix: simpleClone(fix),
    bulk: false,
    auditContext: null,
    version: version,
    bundle: bundle,
    root: root,
    target: target,
    document: document,
  };

  switch (fix.type) {
    case FixType.Insert:
      fixInsert(context);
  }

  if (context.snippetParameters) {
    const snippetParameters = context.snippetParameters;
    await editor.insertSnippet(snippetParameters.snippet, snippetParameters.location);
  }
}
