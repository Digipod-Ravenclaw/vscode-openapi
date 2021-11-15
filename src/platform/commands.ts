import { stringify } from "@xliic/preserving-json-yaml-parser";
import { type } from "os";
import * as vscode from "vscode";

import { Cache } from "../cache";
import { AuditContext } from "../types";
import { createApi, createCollection, deleteApi, deleteCollection } from "./api";
import { Editor } from "./editor";
import { ApiNode, CollectionNode, FavoriteCollectionsNode } from "./explorer/nodes";
import { PlatformContext } from "./types";

export function registerCommands(
  context: vscode.ExtensionContext,
  platformContext: PlatformContext,
  auditContext: AuditContext,
  cache: Cache
): vscode.Disposable[] {
  const { explorer } = platformContext;

  vscode.commands.registerCommand("openapi.platform.editApi", (apiId) => {
    const editor = new Editor(apiId, context, auditContext, cache, platformContext);

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
    const collection = await createCollection(name, platformContext);
    const collectionNode = new CollectionNode(collection, platformContext);
    explorer.provider.refresh();
    explorer.tree.reveal(collectionNode, { focus: true });
  });

  vscode.commands.registerCommand(
    "openapi.platform.deleteCollection",
    async (collection: CollectionNode) => {
      const confirmation = await vscode.window.showInformationMessage(
        "Are you sure you want to delete selected Collection?",
        "Yes",
        "Cancel"
      );

      if (confirmation && confirmation === "Yes") {
        await deleteCollection(collection.getCollectionId(), platformContext);
        explorer.provider.refresh();
      }
    }
  );

  vscode.commands.registerCommand(
    "openapi.platform.collectionRemoveFromFavorite",
    async (collection: FavoriteCollectionsNode) => {
      const confirmation = await vscode.window.showInformationMessage(
        "Are you sure you want to remove selected collection from Favorite?",
        "Yes",
        "Cancel"
      );

      if (confirmation && confirmation === "Yes") {
        explorer.provider.refresh();
      }
    }
  );

  vscode.commands.registerCommand(
    "openapi.platform.collectionAddToFavorite",
    async (collection: CollectionNode) => {
      let favorite = platformContext.memento.get<string[]>("openapi.favorite");
      if (!favorite) {
        favorite = [];
      }
      favorite.push(collection.getCollectionId());
      platformContext.memento.update("openapi.favorite", favorite);
      explorer.provider.refresh();
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
          OpenAPI: ["json", "yaml", "yml"],
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
          platformContext
        );
        explorer.provider.refresh();
        // FIXME improve getParent() implementation in tree data provider
        //const apiNode = new ApiNode(api, options);
        //tree.reveal(apiNode, { focus: true });
      }
    }
  );

  vscode.commands.registerCommand("openapi.platform.deleteApi", async (api: ApiNode) => {
    const confirmation = await vscode.window.showInformationMessage(
      "Are you sure you want to delete selected API?",
      "Yes",
      "Cancel"
    );

    if (confirmation && confirmation === "Yes") {
      await deleteApi(api.getApiId(), platformContext);
      explorer.provider.refresh();
    }
  });

  vscode.commands.registerCommand("openapi.platform.filterCollections", async () => {
    const byName = "By Collection Name";
    const byOwner = "By Collection Owner";
    const types = await vscode.window.showQuickPick([byName, byOwner], {
      canPickMany: true,
    });
    console.log("types", types);

    if (types && types.includes(byOwner)) {
      const owner = await vscode.window.showQuickPick(["My Collections", "All Collections"]);
      if (owner[0] === "My Collections") {
        platformContext.foo.filter.owner = "OWNER";
      } else {
        platformContext.foo.filter.owner = "ALL";
      }
    } else {
      platformContext.foo.filter.owner = "ALL";
    }

    if (types && types.includes(byName)) {
      const name = await vscode.window.showInputBox({
        prompt: "Filter Collections by Name",
      });
      if (name && name !== "") {
        platformContext.foo.filter.name = name;
      } else {
        platformContext.foo.filter.name = undefined;
      }
    } else {
      platformContext.foo.filter.name = undefined;
    }

    explorer.provider.refresh();
  });

  vscode.commands.registerCommand("openapi.platform.refreshCollections", async () => {
    explorer.provider.refresh();
  });

  return [];
}
