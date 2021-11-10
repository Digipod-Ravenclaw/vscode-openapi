import * as vscode from "vscode";
import { newItems } from "yaml-language-server-parser";

import { listApis, listCollections } from "./api";
import { Options, Api, CollectionData } from "./types";

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

  public getCollectionId(): string {
    return this.data.desc.id;
  }

  public hasChildren(): boolean {
    return this.data.summary.apis > 0;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await listApis(this.data.desc.id, this.options);
    return apis.list.map((api) => new ApiNode(api, this.options));
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.data.desc.name,
      this.hasChildren()
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    item.contextValue = "collection";
    return item;
  }
}

export class ApiNode implements Node {
  constructor(private data: Api, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.data.desc.name,
      this.hasChildren()
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.iconPath = vscode.ThemeIcon.File;
    item.contextValue = "api";
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
  constructor(private data: Api, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      `Audit score: ${this.data.assessment.grade}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = vscode.ThemeIcon.File;

    // item.command = {
    //   command: "openapi.platform.showAudit",
    //   title: "",
    //   arguments: [this.data.desc.id],
    // };

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
  constructor(private data: Api, private options: Options) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("OpenAPI definition", vscode.TreeItemCollapsibleState.None);
    item.iconPath = vscode.ThemeIcon.File;

    item.command = {
      command: "openapi.platform.editApi",
      title: "",
      arguments: [this.data.desc.id],
    };

    return item;
  }

  hasChildren(): boolean {
    return false;
  }

  async getChildren(): Promise<Node[]> {
    return [];
  }
}
