import * as vscode from "vscode";

import { listApis, listCollections } from "../api";
import { PlatformContext, Api, CollectionData } from "../types";

export interface ExplorerNode {
  getChildren(): Promise<ExplorerNode[]>;
  getTreeItem(): vscode.TreeItem;
}

export class RootNode implements ExplorerNode {
  constructor(private context: PlatformContext) {}

  async getChildren(): Promise<ExplorerNode[]> {
    return [new FavoriteCollectionsNode(this.context), new CollectionsNode(this.context)];
  }

  getTreeItem(): vscode.TreeItem {
    return null;
  }
}

export class CollectionsNode implements ExplorerNode {
  constructor(private context: PlatformContext) {}

  async getChildren(): Promise<ExplorerNode[]> {
    const collections = await listCollections(this.context);
    const f = collections.list.filter((collection) => collection.desc.name.includes("anton"));
    console.log("f", f);
    const filter = this.context.foo.filter;
    const children = collections.list
      .filter((collection) => (filter.name ? collection.desc.name.includes(filter.name) : true))
      .map((collection) => new CollectionNode(collection, this.context));
    return [...children, new LoadMoreNode()];
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("API Collections", vscode.TreeItemCollapsibleState.Expanded);
    item.contextValue = "collections";
    return item;
  }
}

export class FavoriteCollectionsNode implements ExplorerNode {
  constructor(private context: PlatformContext) {}

  async getChildren(): Promise<ExplorerNode[]> {
    let favorite = this.context.memento.get<string[]>("openapi.favorite");
    if (!favorite) {
      favorite = [];
    }

    const collections = await listCollections(this.context);
    const children = collections.list
      .filter((collection) => favorite.includes(collection.desc.id))
      .map((collection) => new FavoriteCollectionNode(collection, this.context));
    return children;
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      "My Favorite Collections",
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.contextValue = "favorite";
    return item;
  }
}

export class CollectionNode implements ExplorerNode {
  constructor(private data: CollectionData, private context: PlatformContext) {}

  public getCollectionId(): string {
    return this.data.desc.id;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await listApis(this.data.desc.id, this.context);
    return apis.list.map((api) => new ApiNode(api, this.context));
  }

  getTreeItem(): vscode.TreeItem {
    const empty = this.data.summary.apis === 0;

    const item = new vscode.TreeItem(
      this.data.desc.name,
      empty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = "collection";
    item.iconPath = new vscode.ThemeIcon("file-directory");

    return item;
  }
}

export class FavoriteCollectionNode implements ExplorerNode {
  constructor(private data: CollectionData, private context: PlatformContext) {}

  public getCollectionId(): string {
    return this.data.desc.id;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await listApis(this.data.desc.id, this.context);
    return apis.list.map((api) => new ApiNode(api, this.context));
  }

  getTreeItem(): vscode.TreeItem {
    const empty = this.data.summary.apis === 0;

    const item = new vscode.TreeItem(
      this.data.desc.name,
      empty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = "favoriteCollection";
    item.iconPath = new vscode.ThemeIcon("file-directory");

    return item;
  }
}

export class ApiNode implements ExplorerNode {
  constructor(private data: Api, private context: PlatformContext) {}

  public getApiId(): string {
    return this.data.desc.id;
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.data.desc.name,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    item.iconPath = new vscode.ThemeIcon("circuit-board");
    item.contextValue = "api";
    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [new AuditNode(this.data, this.context), new OasNode(this.data, this.context)];
  }
}

export class AuditNode implements ExplorerNode {
  constructor(private data: Api, private context: PlatformContext) {}

  getTreeItem(): vscode.TreeItem {
    function score(score: number): string {
      const rounded = Math.abs(Math.round(score));
      if (score === 0) {
        return "0";
      } else if (rounded >= 1) {
        return rounded.toString();
      }
      return "less than 1";
    }

    const item = new vscode.TreeItem(
      `Security Audit Report: ${score(this.data.assessment.grade)}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = new vscode.ThemeIcon("verified");

    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [];
  }
}

export class OasNode implements ExplorerNode {
  constructor(private data: Api, private context: PlatformContext) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("OpenAPI definition", vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("code");
    item.command = {
      command: "openapi.platform.editApi",
      title: "",
      arguments: [this.data.desc.id],
    };

    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [];
  }
}

export class LoadMoreNode implements ExplorerNode {
  constructor() {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("Load More...  ", vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("refresh");

    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [];
  }
}
