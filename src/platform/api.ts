/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import got, { HTTPError, Method, OptionsOfJSONResponseBody } from "got";
import FormData from "form-data";
import {
  ApiErrors,
  Api,
  ListCollectionsResponse,
  ListApisResponse,
  CollectionData,
  PlatformConnection,
  Logger,
  CollectionFilter,
} from "./types";
import { ASSESSMENT_MAX_WAIT, ASSESSMENT_RETRY } from "./constants";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleHttpError(err: any, options: PlatformConnection): ApiErrors {
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

function gotOptions(
  method: Method,
  options: PlatformConnection,
  logger: Logger
): OptionsOfJSONResponseBody {
  const logRequest = (response: any, retryWithMergedOptions: Function) => {
    logger.debug(`${method} ${response.url} ${response.statusCode}`);
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

export async function listCollections(
  filter: CollectionFilter,
  options: PlatformConnection,
  logger: Logger
): Promise<ListCollectionsResponse> {
  const listOption = filter.owner;
  const { body } = await got(
    `api/v2/collections?listOption=${listOption}&perPage=0`,
    gotOptions("GET", options, logger)
  );
  return <ListCollectionsResponse>body;
}

export async function listApis(
  collectionId: string,
  options: PlatformConnection,
  logger: Logger
): Promise<ListApisResponse> {
  const { body } = await got(
    `api/v1/collections/${collectionId}/apis`,
    gotOptions("GET", options, logger)
  );
  return <ListApisResponse>body;
}

export async function readApi(
  apiId: string,
  options: PlatformConnection,
  logger: Logger
): Promise<Api> {
  const { body } = <any>(
    await got(`api/v1/apis/${apiId}?specfile=true`, gotOptions("GET", options, logger))
  );
  return body;
}

export async function readAssessmentReport(
  apiId: string,
  options: PlatformConnection,
  logger: Logger
): Promise<any> {
  const { body } = <any>(
    await got(`api/v1/apis/${apiId}/assessmentreport`, gotOptions("GET", options, logger))
  );

  const text = Buffer.from(body.data, "base64").toString("utf-8");
  return JSON.parse(text);
}

export async function deleteApi(apiId: string, options: PlatformConnection, logger: Logger) {
  await got(`api/v1/apis/${apiId}`, gotOptions("DELETE", options, logger));
}

export async function createApi(
  collectionId: string,
  name: string,
  contents: Buffer,
  options: PlatformConnection,
  logger: Logger
): Promise<Api> {
  const form = new FormData();
  form.append("specfile", contents.toString("utf-8"), {
    filename: "swagger.json",
    contentType: "application/json",
  });
  form.append("name", name);
  form.append("cid", collectionId);
  const { body } = <any>await got("api/v1/apis", {
    ...gotOptions("POST", options, logger),
    body: form,
  });

  return body;
}

export async function updateApi(
  apiId: string,
  contents: Buffer,
  options: PlatformConnection,
  logger: Logger
): Promise<void> {
  const { body } = <any>await got(`api/v1/apis/${apiId}`, {
    ...gotOptions("PUT", options, logger),
    json: { specfile: contents.toString("base64") },
  });

  return body;
}

export async function createCollection(
  name: string,
  options: PlatformConnection,
  logger: Logger
): Promise<CollectionData> {
  const { body } = <any>await got("api/v1/collections", {
    ...gotOptions("POST", options, logger),
    json: {
      name: name,
    },
  });
  return body;
}

export async function deleteCollection(
  collectionId: string,
  options: PlatformConnection,
  logger: Logger
) {
  await got(`api/v1/collections/${collectionId}`, gotOptions("DELETE", options, logger));
}
