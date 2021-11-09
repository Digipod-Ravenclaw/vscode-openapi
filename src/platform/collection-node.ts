import * as vscode from "vscode";

import { listApis, listCollections } from "./api";
import { Options, ApiData, CollectionData } from "./types";

export interface Node {
  hasChildren(): boolean;
  getChildren(): Promise<Node[]>;
  getTreeItem(): vscode.TreeItem;
}

export class RootNode implements Node {
  constructor(private options: Options) {}

  public hasChildren(): boolean {
    return true;
  }

  async getChildren(): Promise<CollectionNode[]> {
    const collections = await listCollections(this.options);
    return collections.list.map((collection) => new CollectionNode(collection, this.options));
  }

  getTreeItem(): vscode.TreeItem {
    return null;
  }
}

export class CollectionNode implements Node {
  constructor(private data: CollectionData, private options: Options) {}

  public hasChildren(): boolean {
    return this.data.summary.apis > 0;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await listApis(this.data.desc.id, this.options);
    return apis.list.map((api) => new ApiNode(api, this.options));
  }

  getTreeItem(): vscode.TreeItem {
    return new vscode.TreeItem(
      this.data.desc.name,
      this.hasChildren()
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
  }
}

export class ApiNode implements Node {
  constructor(private data: ApiData, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.data.desc.name,
      this.hasChildren()
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.iconPath = vscode.ThemeIcon.File;
    return item;

    /*
      item.command = {
        command: "vscode.open",
        title: "",
        arguments: [vscode.Uri.parse(`42crunch-api:${element.id}`)],
      };
	  */
  }

  hasChildren(): boolean {
    return true;
  }

  async getChildren(): Promise<Node[]> {
    return [new AuditNode(this.data, this.options), new OasNode(this.data, this.options)];
  }
}

export class AuditNode implements Node {
  constructor(private data: ApiData, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("Security audit report", vscode.TreeItemCollapsibleState.None);
    item.iconPath = vscode.ThemeIcon.File;
    return item;
  }

  hasChildren(): boolean {
    return false;
  }

  async getChildren(): Promise<Node[]> {
    return [];
  }
}

export class OasNode implements Node {
  constructor(private data: ApiData, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("OpenAPI definition", vscode.TreeItemCollapsibleState.None);
    item.iconPath = vscode.ThemeIcon.File;
    return item;
  }

  hasChildren(): boolean {
    return false;
  }

  async getChildren(): Promise<Node[]> {
    return [];
  }
}
