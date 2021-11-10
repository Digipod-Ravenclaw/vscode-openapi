import * as vscode from "vscode";
import { configuration } from "../configuration";
import { listApis, listCollections } from "./api";
import { Node, RootNode } from "./collection-node";
import { Options } from "./types";

export class CollectionsProvider implements vscode.TreeDataProvider<Node> {
  //onDidChangeTreeData?: vscode.Event<void | Node>;

  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

  root: RootNode;

  constructor(private options: Options) {
    this.root = new RootNode(options);
  }

  getParent?(element: Node): vscode.ProviderResult<Node> {
    return null;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element.getTreeItem();
  }

  async getChildren(node?: Node): Promise<Node[]> {
    if (node) {
      return node.getChildren();
    }
    return this.root.getChildren();
  }
}
