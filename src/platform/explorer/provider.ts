import * as vscode from "vscode";
import { ExplorerNode, RootNode } from "./nodes";
import { PlatformContext } from "../types";

export class CollectionsProvider implements vscode.TreeDataProvider<ExplorerNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  root: RootNode;

  constructor(private options: PlatformContext) {
    this.root = new RootNode(options);
  }

  getParent?(element: ExplorerNode): vscode.ProviderResult<ExplorerNode> {
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
