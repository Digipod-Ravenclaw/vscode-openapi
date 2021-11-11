/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { stringify } from "@xliic/preserving-json-yaml-parser";
import { Cache } from "../cache";
import { configuration } from "../configuration";
import { createApi, createCollection, deleteApi, deleteCollection } from "./api";
import { ApiNode, CollectionNode } from "./collection-node";
import { CollectionsProvider } from "./collections-provider";
import { Editor } from "./editor";
import { Options } from "./types";
import { AuditContext } from "../types";

export function activate(
  context: vscode.ExtensionContext,
  auditContext: AuditContext,
  cache: Cache
) {
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
  const tree = vscode.window.createTreeView("platformExplorer", {
    treeDataProvider,
  });

  vscode.commands.registerCommand("openapi.platform.editApi", (apiId) => {
    const editor = new Editor(apiId, context, auditContext, cache, options);

    // unsubscribe?
    const disposable = vscode.workspace.onDidSaveTextDocument((document) => {
      editor.onDidSaveTextDocument(document);
    });

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
        const document = await vscode.workspace.openTextDocument(uri[0]);

        // TODO handle bundling errors
        const bundle = await cache.getDocumentBundle(document);
        if (!bundle || "errors" in bundle) {
          return;
        }

        const title = bundle.value.info.title;

        const json = stringify(bundle.value);
        const api = await createApi(
          collection.getCollectionId(),
          title,
          Buffer.from(json),
          options
        );
        treeDataProvider.refresh();
        // FIXME improve getParent() implementation in tree data provider
        //const apiNode = new ApiNode(api, options);
        //tree.reveal(apiNode, { focus: true });
      }
    }
  );

  vscode.commands.registerCommand("openapi.platform.deleteApi", async (api: ApiNode) => {
    await deleteApi(api.getApiId(), options);
    treeDataProvider.refresh();
  });

  vscode.commands.registerCommand("openapi.platform.filterCollections", async () => {
    const filter = await vscode.window.showInputBox({
      prompt: "Filter",
    });

    treeDataProvider.setFilter(filter);
    treeDataProvider.refresh();
  });

  vscode.commands.registerCommand("openapi.platform.refreshCollections", async () => {
    treeDataProvider.setFilter(undefined);
    treeDataProvider.refresh();
  });
}
