/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

import got, { HTTPError, Method, OptionsOfJSONResponseBody } from "got";
import FormData from "form-data";
import {
  ApiStatus,
  ApiErrors,
  Api,
  Options,
  ApiResponse,
  ListCollectionsResponse,
  ListApisResponse,
  CollectionData,
} from "./types";
import { ASSESSMENT_MAX_WAIT, ASSESSMENT_RETRY } from "./constants";

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

export async function listCollections(options: Options): Promise<ListCollectionsResponse> {
  const { body } = await got(
    `api/v2/collections?listOption=ALL&perPage=0`,
    gotOptions("GET", options)
  );
  return <ListCollectionsResponse>body;
}

export async function listApis(collectionId: string, options: Options): Promise<ListApisResponse> {
  const { body } = await got(`api/v1/collections/${collectionId}/apis`, gotOptions("GET", options));
  return <ListApisResponse>body;
}

export async function readApi(apiId: string, options: Options): Promise<Api> {
  const { body } = <any>await got(`api/v1/apis/${apiId}?specfile=true`, gotOptions("GET", options));
  return body;
}

export async function readAssessmentReport(apiId: string, options: Options): Promise<any> {
  const { body } = <any>(
    await got(`api/v1/apis/${apiId}/assessmentreport`, gotOptions("GET", options))
  );

  const text = Buffer.from(body.data, "base64").toString("utf-8");
  return JSON.parse(text);
}

export async function deleteApi(apiId: string, options: Options) {
  await got(`api/v1/apis/${apiId}`, gotOptions("DELETE", options));
}

export async function createApi(
  collectionId: string,
  name: string,
  contents: Buffer,
  options: Options
): Promise<Api> {
  const form = new FormData();
  form.append("specfile", contents.toString("utf-8"), {
    filename: "swagger.json",
    contentType: "application/json",
  });
  form.append("name", name);
  form.append("cid", collectionId);
  const { body } = <any>await got("api/v1/apis", {
    ...gotOptions("POST", options),
    body: form,
  });

  return body;
}

export async function createCollection(name: string, options: Options): Promise<CollectionData> {
  const { body } = <any>await got("api/v1/collections", {
    ...gotOptions("POST", options),
    json: {
      name: name,
    },
  });
  return body;
}

export async function deleteCollection(collectionId: string, options: Options) {
  await got(`api/v1/collections/${collectionId}`, gotOptions("DELETE", options));
}
