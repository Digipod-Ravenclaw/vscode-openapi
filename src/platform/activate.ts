/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { Cache } from "../cache";
import { configuration } from "../configuration";
import { CollectionsProvider } from "./explorer/provider";
import { PlatformContext } from "./types";
import { AuditContext } from "../types";
import { registerCommands } from "./commands";
import { PlatformStore } from "./stores/platform-store";
import { FavoritesStore } from "./stores/favorites-store";

export function activate(
  context: vscode.ExtensionContext,
  auditContext: AuditContext,
  cache: Cache
) {
  const platformContext: PlatformContext = {
    context,
    memento: context.workspaceState,
    explorer: {
      tree: undefined,
      provider: undefined,
    },
    foo: {
      filter: {
        name: undefined,
        owner: "ALL",
      },
    },
    connection: {
      platformUrl: configuration.get("platformUrl"),
      apiToken: configuration.get("platformApiToken"),
      userAgent: "foo",
      referer: "bar",
    },
    logger: {
      fatal: (message: string) => null,
      error: (message: string) => null,
      warning: (message: string) => null,
      info: (message: string) => null,
      debug: (message: string) => null,
    },
  };

  const store = new PlatformStore(platformContext);
  const favoritesStore = new FavoritesStore(context);

  platformContext.explorer.provider = new CollectionsProvider(store, favoritesStore);
  platformContext.explorer.tree = vscode.window.createTreeView("platformExplorer", {
    treeDataProvider: platformContext.explorer.provider,
  });

  /*
  vscode.commands.registerCommand("openapi.platform.editApi", (apiId) => {
    const editor = new Editor(apiId, context, auditContext, cache, platformContext);

    // unsubscribe?
    const disposable = vscode.workspace.onDidSaveTextDocument((document) => {
      editor.onDidSaveTextDocument(document);
    });

    editor.show();
  });
  */

  registerCommands(
    context,
    platformContext,
    auditContext,
    store,
    favoritesStore,
    platformContext.explorer.provider,
    cache
  );
}
