import * as vscode from "vscode";

export async function confirmed(prompt: string) {
  const confirmation = await vscode.window.showInformationMessage(prompt, "Yes", "Cancel");
  return confirmation && confirmation === "Yes";
}
