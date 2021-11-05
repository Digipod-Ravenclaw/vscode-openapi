import * as vscode from "vscode";
import { configuration } from "../configuration";
import { listApis, listCollections } from "./api";
import { Options } from "./types";

interface CollectionNode {
  type: "collection";
  id: string;
  name: string;
  apis: number;
}

interface ApiNode {
  type: "api";
  id: string;
  name: string;
}

type TreeNode = CollectionNode | ApiNode;

export class CollectionsProvider implements vscode.TreeDataProvider<TreeNode> {
  onDidChangeTreeData?: vscode.Event<void | TreeNode>;

  getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element.type === "collection") {
      const item = new vscode.TreeItem(
        element.name,
        element.apis > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.iconPath = vscode.ThemeIcon.Folder;
      return item;
    } else if (element.type === "api") {
      const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
      item.command = {
        command: "vscode.open",
        title: "",
        arguments: [vscode.Uri.parse(`42crunch-api:${element.id}`)],
      };
      item.iconPath = vscode.ThemeIcon.File;
      return item;
    }
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
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
    if (!element) {
      const collections = await listCollections(options);
      return collections.map((collection) => ({
        type: "collection",
        id: collection.desc.id,
        name: collection.desc.name,
        apis: collection.summary.apis,
      }));
    } else if (element.type === "collection") {
      const apis = await listApis(element.id, options);
      return apis.list.map((api) => ({ type: "api", name: api.desc.name, id: api.desc.id }));
    }
    throw new Error("Method not implemented.");
  }
  getParent?(element: TreeNode): vscode.ProviderResult<TreeNode> {
    return undefined;
  }
}
