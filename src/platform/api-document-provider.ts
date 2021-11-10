/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import * as vscode from "vscode";
import { configuration } from "../configuration";
import { Options } from "./types";

export class ApiDocumentProvider
  implements
    vscode.TextDocumentContentProvider,
    vscode.DocumentLinkProvider,
    vscode.HoverProvider,
    vscode.CodeLensProvider
{
  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const lens1 = new vscode.CodeLens(new vscode.Range(2, 0, 2, 10));
    lens1.command = {
      title: "Open API Specification for Editing",
      command: "vscode.open",
      arguments: [vscode.Uri.parse("file:/Users/anton/crunch/oas-samples/xkcd.json")],
    };

    const lens2 = new vscode.CodeLens(new vscode.Range(5, 0, 5, 10));
    lens2.command = {
      title: "View Security Audit report",
      command: "codelens-sample.codelensAction",
      arguments: ["Argument 1", false],
    };

    return [lens1, lens2];
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover> {
    const hover = new vscode.MarkdownString(
      "* This is an openapi document\nLink here: (http://www.yahoo.com)[here]"
    );
    return new vscode.Hover(hover);
  }
  async provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentLink[]> {
    const link = new vscode.DocumentLink(
      new vscode.Range(0, 0, 1, 10)
      //vscode.Uri.parse("http://www.yahoo.com")
    );
    //link.tooltip = "zzaazza";

    return [link];
  }

  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<string> {
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

    const api = null; // await readApiStatus2(uri.path, options);

    return `API Name: ${api.desc.name}
API ID: ${api.desc.id}

API Security Audit
  Grade: ${api.assessment.grade}
  
  `;
  }
}
