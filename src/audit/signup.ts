import { window, ProgressLocation } from "vscode";
import { requestToken } from "./client";

const FLOW_EMAIL = "Authenticate with email address";
const FLOW_PLATFORM = "Authenticate with existing 42Crunch account";

export interface PlatformToken {
  type: "platform";
  platform: string;
  token: string;
}

export interface EmailToken {
  type: "email";
  token: string;
}

type AuthToken = PlatformToken | EmailToken;

export async function promptForTokens(): Promise<AuthToken | undefined> {
  const flow = await window.showQuickPick([FLOW_EMAIL, FLOW_PLATFORM], {
    title:
      "Security Audit from 42Crunch runs ~200 checks for security best practices in your API. VS Code needs to authenticate to use the service. ",
  });

  if (flow === FLOW_EMAIL) {
    return requestEmailToken();
  } else if (flow === FLOW_PLATFORM) {
    requestPlatformToken();
  }
}

async function requestPlatformToken(): Promise<PlatformToken | undefined> {
  const platform = await window.showInputBox({
    prompt: "Enter platform",
    placeHolder: "platform",
  });

  if (platform === undefined) {
    return;
  }

  const token = await window.showInputBox({
    prompt: "Enter token",
    placeHolder: "token",
    ignoreFocusOut: true,
  });

  if (token === undefined) {
    return;
  }

  return { type: "platform", platform, token };
}

async function requestEmailToken(): Promise<EmailToken | undefined> {
  const email = await window.showInputBox({
    prompt: "Enter your email to receive the authentication token",
    placeHolder: "email address",
    validateInput: (value) =>
      value.indexOf("@") > 0 && value.indexOf("@") < value.length - 1
        ? null
        : "Please enter valid email address",
  });

  if (email === undefined) {
    return;
  }

  const tokenRequestResult = await window.withProgress(
    { location: ProgressLocation.Notification, title: "Requesting token" },
    async (progress, token) => {
      try {
        return await requestToken(email);
      } catch (e) {
        window.showErrorMessage("Unexpected error when trying to request token: " + e);
      }
    }
  );

  if (!tokenRequestResult || tokenRequestResult.status !== "success") {
    return;
  }

  const token = await window.showInputBox({
    prompt:
      "API token has been sent. If you don't get the mail within a couple minutes, check your spam folder and that the address is correct. Paste the token above.",
    ignoreFocusOut: true,
    placeHolder: "token",
  });

  if (token === undefined) {
    return;
  }

  return { type: "email", token };
}
