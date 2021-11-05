/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { Cache } from "../cache";
import { ApiDocumentProvider } from "./api-document-provider";
import { CollectionsProvider } from "./tree";

export function activate(context: vscode.ExtensionContext, cache: Cache) {
  const tree = vscode.window.createTreeView("collectionsExplorer", {
    treeDataProvider: new CollectionsProvider(),
  });

  const provider = new ApiDocumentProvider();
  vscode.workspace.registerTextDocumentContentProvider("42crunch-api", provider);
  //vscode.languages.registerDocumentLinkProvider({ scheme: "42crunch-api" }, provider);
  //vscode.languages.registerHoverProvider({ scheme: "42crunch-api" }, provider);
  vscode.languages.registerCodeLensProvider({ scheme: "42crunch-api" }, provider);
}
