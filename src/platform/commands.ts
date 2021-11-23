import * as vscode from "vscode";
import { stringify } from "@xliic/preserving-json-yaml-parser";

import { Cache } from "../cache";
import { AuditContext } from "../types";
import { ApiNode, CollectionNode, FavoriteCollectionNode } from "./explorer/nodes";
import { PlatformContext } from "./types";
import { PlatformStore } from "./stores/platform-store";
import { CollectionsProvider } from "./explorer/provider";
import { confirmed, makePlatformUri } from "./util";
import { FavoritesStore } from "./stores/favorites-store";

export function registerCommands(
  context: vscode.ExtensionContext,
  platformContext: PlatformContext,
  auditContext: AuditContext,
  store: PlatformStore,
  favoritesStore: FavoritesStore,
  provider: CollectionsProvider,
  cache: Cache
): vscode.Disposable[] {
  const { explorer } = platformContext;

  vscode.commands.registerCommand("openapi.platform.editApi", async (apiId) => {
    const uri = makePlatformUri(apiId);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  });

  vscode.commands.registerCommand("openapi.platform.createCollection", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "New Collection name",
    });
    const collection = await store.createCollection(name);
    const collectionNode = new CollectionNode(store, provider.root.collections, collection);
    explorer.provider.refresh();
    explorer.tree.reveal(collectionNode, { focus: true });
  });

  vscode.commands.registerCommand(
    "openapi.platform.deleteCollection",
    async (collection: CollectionNode) => {
      if (await confirmed("Are you sure you want to delete selected Collection?")) {
        await store.deleteCollection(collection.getCollectionId());
        explorer.provider.refresh();
      }
    }
  );

  vscode.commands.registerCommand(
    "openapi.platform.collectionRemoveFromFavorite",
    async (collection: FavoriteCollectionNode) => {
      if (await confirmed("Are you sure you want to remove selected collection from Favorite?")) {
        favoritesStore.removeFavoriteCollection(collection.getCollectionId());
        explorer.provider.refresh();
      }
    }
  );

  vscode.commands.registerCommand(
    "openapi.platform.collectionAddToFavorite",
    async (collection: CollectionNode) => {
      favoritesStore.addFavoriteCollection(collection.getCollectionId());
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

        const api = await store.createApi(collection.getCollectionId(), title, json);

        const apiNode = new ApiNode(store, collection, api);

        explorer.provider.refresh();
        explorer.tree.reveal(apiNode, { focus: true });
      }
    }
  );

  vscode.commands.registerCommand("openapi.platform.deleteApi", async (api: ApiNode) => {
    if (await confirmed("Are you sure you want to delete selected API")) {
      await store.deleteApi(api.getApiId());
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
    store.refresh();
    explorer.provider.refresh();
  });

  return [];
}
