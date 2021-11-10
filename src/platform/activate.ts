/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { parseAuditReport } from "../audit/audit";
import { Cache } from "../cache";
import { configuration } from "../configuration";
import { createCollection, deleteCollection, readAssessmentReport } from "./api";
import { CollectionNode } from "./collection-node";
import { CollectionsProvider } from "./collections-provider";
import { Editor } from "./editor";
import { Options } from "./types";

export function activate(context: vscode.ExtensionContext, cache: Cache) {
  const options: Options = {
    platformUrl: configuration.get("platformUrl"),
    apiToken: configuration.get("platformApiToken"),
    userAgent: "foo",
    referer: "bar",
    logger: {
      fatal: (message: string) => null,
      error: (message: string) => null,
      warning: (message: string) => null,
      info: (message: string) => null,
      debug: (message: string) => null,
    },
  };

  const treeDataProvider = new CollectionsProvider(options);
  const tree = vscode.window.createTreeView("collectionsExplorer", {
    treeDataProvider,
  });

  vscode.commands.registerCommand("openapi.platform.editApi", (apiId) => {
    const editor = new Editor(apiId, context, options);
    editor.show();
  });

  vscode.commands.registerCommand("openapi.platform.createCollection", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "New Collection name",
    });
    const collection = await createCollection(name, options);
    const collectionNode = new CollectionNode(collection, options);
    treeDataProvider.refresh();
    tree.reveal(collectionNode, { focus: true });
  });

  vscode.commands.registerCommand(
    "openapi.platform.deleteCollection",
    async (collection: CollectionNode) => {
      await deleteCollection(collection.getCollectionId(), options);
      treeDataProvider.refresh();
    }
  );

  vscode.commands.registerCommand(
    "openapi.platform.createApi",
    async (collection: CollectionNode) => {
      const uri = await vscode.window.showOpenDialog({
        openLabel: "Import API",
        title: "title",
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        // TODO use language filter from extension.ts
        filters: {
          JSON: ["json"],
          YAML: ["yaml", "yml"],
        },
      });

      if (uri) {
        const document = vscode.workspace.openTextDocument(uri[0]);
      }
    }
  );
}
