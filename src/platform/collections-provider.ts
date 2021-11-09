import * as vscode from "vscode";
import { configuration } from "../configuration";
import { listApis, listCollections } from "./api";
import { Node, RootNode } from "./collection-node";
import { Options } from "./types";

export class CollectionsProvider implements vscode.TreeDataProvider<Node> {
  onDidChangeTreeData?: vscode.Event<void | Node>;
  root: RootNode;

  constructor() {
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
    this.root = new RootNode(options);
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
