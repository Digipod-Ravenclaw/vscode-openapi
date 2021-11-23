import * as vscode from "vscode";

import { PlatformStore } from "./stores/platform-store";
import { confirmed, getApiId } from "./util";
import { Cache } from "../cache";
import { stringify } from "@xliic/preserving-json-yaml-parser";

class ApiFile implements vscode.FileStat {
  type: vscode.FileType;
  ctime: number;
  mtime: number;
  size: number;

  constructor() {
    this.type = vscode.FileType.File;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
  }
}

export class PlatformFS implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  constructor(private cache: Cache, private store: PlatformStore) {}

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    return new vscode.Disposable(() => null);
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    return new ApiFile();
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const apiId = getApiId(uri);
    const api = await this.store.getApi(apiId);
    // parse and format json, TODO use preserving parser
    const buffer = Buffer.from(api.desc.specfile, "base64");
    const parsed = JSON.parse(buffer.toString("utf-8"));
    const text = JSON.stringify(parsed, null, 2);
    return Buffer.from(text, "utf-8");
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean }
  ): Promise<void> {
    if (!(await confirmed("Are you sure you want to update remote API?"))) {
      throw new Error("API Update has been cancelled.");
    }
    const apiId = getApiId(uri);
    const found = vscode.workspace.textDocuments.filter(
      (document) => document.uri.toString() === uri.toString()
    );

    if (found.length !== 1) {
      throw new Error("Can't find TextDocument to save.");
    }

    // TODO handle bundling errors
    const bundle = await this.cache.getDocumentBundle(found[0]);
    if (!bundle || "errors" in bundle) {
      throw new Error("Can't bundle() API definition.");
    }

    const json = stringify(bundle.value);

    await this.store.updateApi(apiId, Buffer.from(json));
  }

  delete(uri: vscode.Uri, options: { recursive: boolean }): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean }
  ): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  readDirectory(
    uri: vscode.Uri
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    throw new Error("Method not implemented.");
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }
}
