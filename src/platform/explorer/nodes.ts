import * as vscode from "vscode";
import { FavoritesStore } from "../stores/favorites-store";

import { PlatformStore } from "../stores/platform-store";
import { Api, CollectionData } from "../types";

export interface ExplorerNode {
  getParent(): ExplorerNode | undefined;
  getChildren(): Promise<ExplorerNode[]>;
  getTreeItem(): vscode.TreeItem;
  getId(): string;
}

export class RootNode implements ExplorerNode {
  public readonly favorite: FavoriteCollectionsNode;
  public readonly collections: CollectionsNode;

  constructor(private store: PlatformStore, private favorites: FavoritesStore) {
    this.favorite = new FavoriteCollectionsNode(this.store, this, this.favorites);
    this.collections = new CollectionsNode(this.store, this);
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [this.favorite, this.collections];
  }

  getTreeItem(): vscode.TreeItem {
    return null;
  }

  getId(): string {
    return "";
  }

  getParent() {
    return undefined;
  }
}

export class CollectionsNode implements ExplorerNode {
  constructor(private store: PlatformStore, private parent: ExplorerNode) {}

  async getChildren(): Promise<ExplorerNode[]> {
    const collections = await this.store.getCollections();

    const children = collections
      //  .filter((collection) => (filter.name ? collection.desc.name.includes(filter.name) : true))
      .map((collection) => new CollectionNode(this.store, this, collection));

    return [...children /*new LoadMoreNode()*/];
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("API Collections", vscode.TreeItemCollapsibleState.Expanded);
    item.contextValue = "collections";
    item.id = this.getId();
    return item;
  }

  getId(): string {
    return `${this.parent.getId()}-collections`;
  }

  getParent() {
    return this.parent;
  }
}

export class FavoriteCollectionsNode implements ExplorerNode {
  constructor(
    private store: PlatformStore,
    private parent: ExplorerNode,
    private favoritesStore: FavoritesStore
  ) {}

  async getChildren(): Promise<ExplorerNode[]> {
    const favorites = this.favoritesStore.getFavoriteCollectionIds();

    const collections = await this.store.getCollections();
    const children = collections
      .filter((collection) => favorites.includes(collection.desc.id))
      .map((collection) => new FavoriteCollectionNode(this.store, this, collection));
    return children;
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      "My Favorite Collections",
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.contextValue = "favorite";
    item.id = this.getId();
    return item;
  }

  getId(): string {
    return `${this.parent.getId()}-favorite`;
  }

  getParent() {
    return this.parent;
  }
}

export class CollectionNode implements ExplorerNode {
  constructor(
    private store: PlatformStore,
    private parent: ExplorerNode,
    private collection: CollectionData
  ) {}

  public getCollectionId(): string {
    return this.collection.desc.id;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await this.store.getApis(this.getCollectionId());
    return apis.map((api) => new ApiNode(this.store, this, api));
  }

  getTreeItem(): vscode.TreeItem {
    const empty = this.collection.summary.apis === 0;

    const item = new vscode.TreeItem(
      this.collection.desc.name,
      empty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = "collection";
    item.iconPath = new vscode.ThemeIcon("file-directory");
    item.id = this.getId();

    return item;
  }

  getId(): string {
    return `${this.parent.getId()}-${this.getCollectionId()}`;
  }

  getParent() {
    return this.parent;
  }
}

export class FavoriteCollectionNode implements ExplorerNode {
  constructor(
    private store: PlatformStore,
    private parent: ExplorerNode,
    private collection: CollectionData
  ) {}

  public getCollectionId(): string {
    return this.collection.desc.id;
  }

  async getChildren(): Promise<ApiNode[]> {
    const apis = await this.store.getApis(this.getCollectionId());
    return apis.map((api) => new ApiNode(this.store, this, api));
  }

  getTreeItem(): vscode.TreeItem {
    const empty = this.collection.summary.apis === 0;

    const item = new vscode.TreeItem(
      this.collection.desc.name,
      empty ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = "favoriteCollection";
    item.iconPath = new vscode.ThemeIcon("file-directory");
    item.id = this.getId();

    return item;
  }

  getId(): string {
    return `${this.parent.getId()}-${this.getCollectionId()}`;
  }

  getParent() {
    return this.parent;
  }
}

export class ApiNode implements ExplorerNode {
  constructor(private store: PlatformStore, private parent: ExplorerNode, private api: Api) {}

  public getApiId(): string {
    return this.api.desc.id;
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(this.api.desc.name, vscode.TreeItemCollapsibleState.Collapsed);
    item.iconPath = new vscode.ThemeIcon("circuit-board");
    item.contextValue = "api";
    item.id = this.getId();
    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [new AuditNode(this.store, this, this.api), new OasNode(this.store, this, this.api)];
  }

  getId(): string {
    return `${this.parent.getId()}-${this.getApiId()}`;
  }

  getParent() {
    return this.parent;
  }
}

export class AuditNode implements ExplorerNode {
  constructor(private store: PlatformStore, private parent: ExplorerNode, private api: Api) {}

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
      `Security Audit Report: ${score(this.api.assessment.grade)}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = new vscode.ThemeIcon("verified");
    item.id = this.getId();
    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [];
  }

  getId(): string {
    return `${this.parent.getId()}-audit}`;
  }

  getParent() {
    return this.parent;
  }
}

export class OasNode implements ExplorerNode {
  constructor(private store: PlatformStore, private parent: ExplorerNode, private api: Api) {}

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem("OpenAPI definition", vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("code");
    item.command = {
      command: "openapi.platform.editApi",
      title: "",
      arguments: [this.api.desc.id],
    };
    item.id = this.getId();
    return item;
  }

  async getChildren(): Promise<ExplorerNode[]> {
    return [];
  }

  getId(): string {
    return `${this.parent.getId()}-spec}`;
  }

  getParent() {
    return this.parent;
  }
}

/*
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
*/
