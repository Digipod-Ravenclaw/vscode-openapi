import * as vscode from "vscode";
import * as path from "path";

import { readApi } from "./api";
import { Options } from "./types";

export class Editor {
  constructor(
    private apiId: string,
    private context: vscode.ExtensionContext,
    private options: Options
  ) {}

  public async show(): Promise<void> {
    const data = await this.getData();
    const file = await this.createTemporaryFile(`${this.apiId}.json`, data);
    const document = await vscode.workspace.openTextDocument(file);
    const editor = await vscode.window.showTextDocument(document);
  }

  public async getData(): Promise<string> {
    const api = await readApi(this.apiId, this.options);
    const buf = Buffer.from(api.desc.specfile, "base64");
    const parsed = JSON.parse(buf.toString("utf-8"));
    return JSON.stringify(parsed, null, 2);
  }

  async createTemporaryFile(fileName: string, data: string): Promise<vscode.Uri> {
    // The extension globalStoragePath is a wellknown for vscode and will cleanup when extension gets uninstalled.
    const tempUri = this.context.globalStorageUri.with({
      path: path.join(this.context.globalStorageUri.path, "openapi"),
    });

    await vscode.workspace.fs.createDirectory(tempUri);

    const fileUri = tempUri.with({
      path: path.join(tempUri.path, fileName),
    });

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(data));

    return fileUri;
  }
}
