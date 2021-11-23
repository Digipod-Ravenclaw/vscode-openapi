import path from "path";
import * as vscode from "vscode";
import { platformUriScheme } from "./types";

export const uriScheme = "openapi";

export async function confirmed(prompt: string) {
  const confirmation = await vscode.window.showInformationMessage(prompt, "Yes", "Cancel");
  return confirmation && confirmation === "Yes";
}

export function isPlatformUri(uri: vscode.Uri) {
  return uri.scheme === platformUriScheme;
}

export function makePlatformUri(apiId: string) {
  return vscode.Uri.parse(`${platformUriScheme}://42crunch.com/apis/${apiId}.json`);
}

export function getApiId(uri: vscode.Uri): string {
  if (isPlatformUri(uri)) {
    const apiId = path.basename(uri.fsPath, ".json");
    return apiId;
  }
}
