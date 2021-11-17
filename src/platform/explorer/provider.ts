import * as vscode from "vscode";
import { ExplorerNode, RootNode } from "./nodes";
import { PlatformStore } from "../stores/platform-store";
import { FavoritesStore } from "../stores/favorites-store";

export class CollectionsProvider implements vscode.TreeDataProvider<ExplorerNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  public readonly root: RootNode;

  constructor(store: PlatformStore, favoritesStore: FavoritesStore) {
    this.root = new RootNode(store, favoritesStore);
  }

  getParent?(element: ExplorerNode): vscode.ProviderResult<ExplorerNode> {
    if (element) {
      return element.getParent();
    }
    return null;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ExplorerNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element.getTreeItem();
  }

  async getChildren(node?: ExplorerNode): Promise<ExplorerNode[]> {
    if (node) {
      return node.getChildren();
    }
    return this.root.getChildren();
  }
}
