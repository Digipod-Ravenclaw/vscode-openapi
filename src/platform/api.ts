/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import got, { HTTPError, Method, OptionsOfJSONResponseBody } from "got";
import FormData from "form-data";
import {
  ApiStatus,
  ApiCollectionResponse,
  SharingType,
  ApiErrors,
  Api,
  Options,
  ApiResponse,
  CollectionResponse,
} from "./types";
import { ASSESSMENT_MAX_WAIT, ASSESSMENT_RETRY, SCAN_MAX_WAIT, SCAN_RETRY } from "./constants";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleHttpError(err: any, options: Options): ApiErrors {
  if (
    err instanceof HTTPError &&
    err?.response?.statusCode === 409 &&
    (<any>err?.response?.body)?.message === "limit reached"
  ) {
    return {
      errors: {
        remote: {
          statusCode: err.response.statusCode,
          error: err.response.body,
          description: `You have reached your maximum number of APIs. Please sign into ${options.platformUrl} and upgrade your account.`,
        },
      },
    };
  } else if (
    err instanceof HTTPError &&
    err?.response?.statusCode === 404 &&
    (<any>err?.response?.body)?.message === "no result" &&
    (<any>err?.response?.body)?.code === 5
  ) {
    return {
      errors: {
        remote: {
          statusCode: err.response.statusCode,
          error: err.response.body,
          description: `API does not exist, check that ID of your mapped API is correct.`,
        },
      },
    };
  }
  throw err;
}

function gotOptions(method: Method, options: Options): OptionsOfJSONResponseBody {
  const logRequest = (response: any, retryWithMergedOptions: Function) => {
    options.logger.debug(`${method} ${response.url} ${response.statusCode}`);
    return response;
  };

  return {
    method,
    prefixUrl: options.platformUrl,
    responseType: "json",
    headers: {
      Accept: "application/json",
      "X-API-KEY": options.apiToken,
      "User-Agent": options.userAgent,
      Referer: options.referer,
    },
    hooks: {
      afterResponse: [logRequest],
    },
  };
}

export async function listCollections(options: Options): Promise<CollectionResponse[]> {
  const { body } = await got(`api/v2/collections`, gotOptions("GET", options));
  return <CollectionResponse[]>body["list"];
}

export async function listApis(
  collectionId: string,
  options: Options
): Promise<ApiCollectionResponse> {
  const { body } = await got(`api/v1/collections/${collectionId}/apis`, gotOptions("GET", options));
  return <ApiCollectionResponse>body;
}

export async function deleteApi(apiId: string, options: Options) {
  const { body } = await got(`api/v1/apis/${apiId}`, gotOptions("DELETE", options));
  return body;
}

export async function createApi(
  collectionId: string,
  name: string,
  contents: Buffer,
  options: Options
): Promise<Api | ApiErrors> {
  const form = new FormData();
  form.append("specfile", contents.toString("utf-8"), {
    filename: "swagger.json",
    contentType: "application/json",
  });
  form.append("name", name);
  form.append("cid", collectionId);
  try {
    const { body } = <any>await got("api/v1/apis", {
      ...gotOptions("POST", options),
      body: form,
    });
    return {
      id: body.desc.id,
      previousStatus: {
        lastAssessment: new Date(0),
        isAssessmentProcessed: false,
        lastScan: new Date(0),
        isScanProcessed: false,
      },
    };
  } catch (err) {
    return handleHttpError(err, options);
  }
}

export async function createTechnicalApi(
  collectionId: string,
  filename: string,
  name: string,
  contents: Buffer,
  options: Options
): Promise<Api | ApiErrors> {
  try {
    const { body } = <any>await got("api/v2/apis", {
      ...gotOptions("POST", options),
      json: {
        cid: collectionId,
        name,
        technicalName: filename,
        specfile: contents.toString("base64"),
      },
    });
    return {
      id: body.desc.id,
      previousStatus: {
        lastAssessment: new Date(0),
        isAssessmentProcessed: false,
        lastScan: new Date(0),
        isScanProcessed: false,
      },
    };
  } catch (err) {
    return handleHttpError(err, options);
  }
}

export async function readApiStatus(apiId: string, options: Options): Promise<ApiStatus> {
  const { body } = <any>await got(`api/v1/apis/${apiId}`, gotOptions("GET", options));

  const lastAssessment = body?.assessment?.last ? new Date(body.assessment.last) : new Date(0);
  const isAssessmentProcessed = body.assessment.isProcessed;
  const lastScan = body?.scan?.last ? new Date(body.scan.last) : new Date(0);
  const isScanProcessed = body.scan.isProcessed;

  return {
    isAssessmentProcessed,
    lastAssessment,
    isScanProcessed,
    lastScan,
  };
}

export async function readApiStatus2(apiId: string, options: Options): Promise<any> {
  const { body } = <any>await got(`api/v1/apis/${apiId}`, gotOptions("GET", options));
  return body;
}

export async function updateApi(
  apiId: string,
  contents: Buffer,
  options: Options
): Promise<Api | ApiErrors> {
  try {
    const previousStatus = await readApiStatus(apiId, options);

    const { body } = <any>await got(`api/v1/apis/${apiId}`, {
      ...gotOptions("PUT", options),
      json: { specfile: contents.toString("base64") },
    });

    return {
      id: body.desc.id,
      previousStatus,
    };
  } catch (err) {
    return handleHttpError(err, options);
  }
}

export async function readCollection(id: string, options: Options): Promise<any> {
  const response = await got(`api/v1/collections/${id}`, {
    ...gotOptions("GET", options),
  });
  return response.body;
}

export async function readTechnicalCollection(
  technicalName: string,
  options: Options
): Promise<any> {
  try {
    const response = await got(`api/v1/collections/technicalName`, {
      ...gotOptions("POST", options),
      json: { technicalName },
    });
    const body: { id: string } = <any>response.body;
    return body.id;
  } catch (err) {
    if (err instanceof HTTPError && err?.response?.statusCode === 404) {
      return null;
    }
    return handleHttpError(err, options);
  }
}

export async function deleteCollection(id: string, options: Options) {
  const { body } = <any>await got(`api/v1/collections/${id}`, {
    ...gotOptions("DELETE", options),
  });

  return body.id;
}

export async function createTechnicalCollection(
  technicalName: string,
  name: string,
  options: Options
): Promise<any> {
  //const sharing = {
  //  isShared:
  //    options.shareEveryone === SharingType.ReadOnly ||
  //    options.shareEveryone === SharingType.ReadWrite,
  //  isSharedWrite: options.shareEveryone === SharingType.ReadWrite,
  //};

  const { body } = <any>await got("api/v1/collections", {
    ...gotOptions("POST", options),
    json: {
      technicalName: technicalName,
      name: name,
      // source: options.cicdName,
      //...sharing,
    },
  });

  return body.desc.id;
}

export async function readAssessment(api: Api, options: Options): Promise<any> {
  const log = options.logger;

  log.debug(`Reading assessment report for API ID: ${api.id}`);

  const start = Date.now();
  let now = Date.now();
  while (now - start < ASSESSMENT_MAX_WAIT) {
    const status = await readApiStatus(api.id, options);
    const ready =
      status.isAssessmentProcessed &&
      status.lastAssessment.getTime() > api.previousStatus!.lastAssessment.getTime();
    if (ready) {
      const { body } = <any>(
        await got(`api/v1/apis/${api.id}/assessmentreport`, gotOptions("GET", options))
      );
      const report = JSON.parse(Buffer.from(body.data, "base64").toString("utf8"));
      return report;
    }
    log.debug(`Assessment report for API ID: ${api.id} is not ready, retrying.`);
    await delay(ASSESSMENT_RETRY);
    now = Date.now();
  }
  throw new Error(`Timed out while waiting for the assessment report for API ID: ${api.id}`);
}

export async function readScanReport(apiId: string, options: Options): Promise<[Date, any]> {
  const log = options.logger;
  log.debug(`Reading on-prem scan report for API ID: ${apiId}`);
  try {
    // TODO check if we can get scan report with no body, just the date?
    const { body } = <any>(
      await got(`api/v1/apis/${apiId}/scanreport?medium=2`, gotOptions("GET", options))
    );
    const report = JSON.parse(Buffer.from(body.data, "base64").toString("utf8"));
    return [new Date(body.date), report];
  } catch (err) {
    if (err instanceof HTTPError && err?.response?.statusCode === 404) {
      return [new Date(0), null];
    }
    throw err;
  }
}

export async function readScan(
  apiId: string,
  lastOnPremScan: Date,
  options: Options
): Promise<any> {
  const log = options.logger;

  log.debug(`Reading scan report for API ID: ${apiId}`);

  const start = Date.now();
  let now = Date.now();
  while (now - start < SCAN_MAX_WAIT) {
    const [reportDate, report] = await readScanReport(apiId, options);
    if (reportDate.getTime() > lastOnPremScan.getTime()) {
      return report;
    }
    log.debug(`Scan report for API ID: ${apiId} is not ready, retrying.`);
    await delay(SCAN_RETRY);
    now = Date.now();
  }
  throw new Error(`Timed out while waiting for the scan report for API ID: ${apiId}`);
}

export async function startScan(apiId: string, config: any, options: Options): Promise<any> {
  try {
    const base64 = Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
    const response = await got(`api/v1/apis/${apiId}/scan`, {
      ...gotOptions("POST", options),
      json: { config: base64 },
    });
    const body: { id: string; success: string } = <any>response.body;
    return body.id;
  } catch (err) {
    return handleHttpError(err, options);
  }
}

export async function readScanConfiguration(apiId: string, options: Options): Promise<any> {
  try {
    const { body } = <any>(
      await got(`api/v1/apis/${apiId}/scanConfigurations`, gotOptions("GET", options))
    );
    return body;
  } catch (err) {
    if (err instanceof HTTPError && err?.response?.statusCode === 404) {
      return null;
    }
    return handleHttpError(err, options);
  }
}
