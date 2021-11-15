import * as vscode from "vscode";
import * as path from "path";

import { readApi, readAssessmentReport, updateApi } from "./api";
import { PlatformContext } from "./types";
import { Cache } from "../cache";
import { stringify } from "@xliic/preserving-json-yaml-parser";
import { parseAuditReport, updateAuditContext } from "../audit/audit";
import { setDecorations, updateDecorations } from "../audit/decoration";
import { updateDiagnostics } from "../audit/diagnostic";
import { ReportWebView } from "../audit/report";
import { AuditContext } from "../types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Editor {
  private document: vscode.TextDocument;

  constructor(
    private apiId: string,
    private context: vscode.ExtensionContext,
    private auditContext: AuditContext,
    private cache: Cache,
    private options: PlatformContext
  ) {}

  public async show(): Promise<void> {
    const data = await this.getData();

    const file = await this.createTemporaryFile(`${this.apiId}.json`, data);
    const document = await vscode.workspace.openTextDocument(file);
    const editor = await vscode.window.showTextDocument(document);

    // get audit report
    const uri = document.uri.toString();
    const report = await this.getAssessment();
    const audit = await parseAuditReport(this.cache, document, report, {
      value: { uri, hash: null },
      children: {},
    });

    if (audit) {
      updateAuditContext(this.auditContext, uri, audit);
      updateDecorations(this.auditContext.decorations, audit.summary.documentUri, audit.issues);
      updateDiagnostics(this.auditContext.diagnostics, audit.filename, audit.issues, editor);
      setDecorations(editor, this.auditContext);

      //ReportWebView.show(this.context.extensionPath, audit, this.cache);
    }

    this.document = document;
  }

  public async onDidSaveTextDocument(doc: vscode.TextDocument): Promise<void> {
    if (this.document === doc) {
      const confirmation = await vscode.window.showInformationMessage(
        "Update remote API?",
        "Ok",
        "Cancel"
      );

      if (confirmation !== "Ok") {
        return;
      }

      // TODO handle bundling errors
      const bundle = await this.cache.getDocumentBundle(doc);
      if (!bundle || "errors" in bundle) {
        return;
      }

      const json = stringify(bundle.value);
      const api = await updateApi(this.apiId, Buffer.from(json), this.options);

      await delay(2000);

      vscode.commands.executeCommand("openapi.platform.refreshCollections");

      // get audit report
      const uri = this.document.uri.toString();
      const report = await this.getAssessment();
      const audit = await parseAuditReport(this.cache, this.document, report, {
        value: { uri, hash: null },
        children: {},
      });

      if (audit) {
        updateAuditContext(this.auditContext, uri, audit);
        updateDecorations(this.auditContext.decorations, audit.summary.documentUri, audit.issues);
        if (vscode.window.activeTextEditor.document == this.document) {
          updateDiagnostics(
            this.auditContext.diagnostics,
            audit.filename,
            audit.issues,
            vscode.window.activeTextEditor
          );
          setDecorations(vscode.window.activeTextEditor, this.auditContext);
        }
      }
    }
  }

  public async getData(): Promise<string> {
    const api = await readApi(this.apiId, this.options);
    const buf = Buffer.from(api.desc.specfile, "base64");
    const parsed = JSON.parse(buf.toString("utf-8"));
    return JSON.stringify(parsed, null, 2);
  }

  public async getAssessment(): Promise<any> {
    const report = await readAssessmentReport(this.apiId, this.options);
    return report;
  }

  async createTemporaryFile(fileName: string, data: string): Promise<vscode.Uri> {
    const tempUri = this.context.globalStorageUri.with({
      path: path.join(this.context.globalStorageUri.path, "openapi"),
    });

    await vscode.workspace.fs.createDirectory(tempUri);

    const fileUri = tempUri.with({
      path: path.join(tempUri.path, fileName),
    });

    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(data));

    return fileUri;
  }
}
