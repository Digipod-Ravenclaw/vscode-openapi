/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { Cache } from "../cache";
import { configuration } from "../configuration";
import { CollectionsProvider } from "./explorer/provider";
import { PlatformContext, platformUriScheme } from "./types";
import { AuditContext } from "../types";
import { registerCommands } from "./commands";
import { PlatformStore } from "./stores/platform-store";
import { FavoritesStore } from "./stores/favorites-store";
import { PlatformFS } from "./fs-provider";
import { getApiId, isPlatformUri } from "./util";
import { parseAuditReport, updateAuditContext } from "../audit/audit";
import { setDecorations, updateDecorations } from "../audit/decoration";
import { updateDiagnostics } from "../audit/diagnostic";

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

  // TODO unsubscribe?

  async function refreshAuditReport(document: vscode.TextDocument) {
    if (isPlatformUri(document.uri)) {
      const uri = document.uri.toString();
      const apiId = getApiId(document.uri);
      const report = await store.getAuditReport(apiId);

      const audit = await parseAuditReport(cache, document, report, {
        value: { uri, hash: null },
        children: {},
      });

      if (audit) {
        updateAuditContext(auditContext, uri, audit);
        updateDecorations(auditContext.decorations, audit.summary.documentUri, audit.issues);
        updateDiagnostics(auditContext.diagnostics, audit.filename, audit.issues);
      }
    }
  }

  const disposable1 = vscode.workspace.onDidSaveTextDocument(refreshAuditReport);
  const disposable2 = vscode.workspace.onDidOpenTextDocument(refreshAuditReport);
  const disposable3 = vscode.workspace.onDidSaveTextDocument((document) => {
    if (isPlatformUri(document.uri)) {
      // when API is saved, it's score might change so we need to refresh
      // explorer that shows API score
      vscode.commands.executeCommand("openapi.platform.refreshCollections");
    }
  });

  const platformFs = new PlatformFS(cache, store);

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(platformUriScheme, platformFs, {
      isCaseSensitive: true,
    })
  );

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
