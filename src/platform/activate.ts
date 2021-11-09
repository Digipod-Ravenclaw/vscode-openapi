/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { Cache } from "../cache";
import { CollectionsProvider } from "./collections-provider";

export function activate(context: vscode.ExtensionContext, cache: Cache) {
  const tree = vscode.window.createTreeView("collectionsExplorer", {
    treeDataProvider: new CollectionsProvider(),
  });
}
