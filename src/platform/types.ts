/*
 Copyright (c) 42Crunch Ltd. All rights reserved.
 Licensed under the GNU Affero General Public License version 3. See LICENSE.txt in the project root for license information.
*/

export interface ListCollectionsResponse {
  list: CollectionData[];
}

export interface ListApisResponse {
  list: ApiData[];
}

export interface ApiData {
  desc: {
    id: string;
    name: string;
  };
}

export interface CollectionData {
  desc: {
    id: string;
    name: string;
    technicalName: string;
  };
  summary: {
    apis: number;
  };
}

// GOOD ABOVE

export interface ApiStatus {
  isAssessmentProcessed: boolean;
  lastAssessment: Date;
  isScanProcessed: boolean;
  lastScan: Date;
}

export interface ApiResponse {
  desc: {
    id: string;
    name: string;
    technicalName: string;
  };
}

export interface ApiCollectionResponse {
  list: ApiResponse[];
}

export interface JsonMapping {
  file: string;
  hash: string;
}

export interface MappingTreeNode {
  value: JsonMapping;
  children: {
    [key: string]: MappingTreeNode;
  };
}

export interface RemoteApiError {
  statusCode: number | null;
  error: any;
  description: string | null;
}

export interface ApiErrors {
  errors: {
    parsing?: string;
    bundling?: string;
    remote?: {
      statusCode: number | null;
      error: any;
      description: string | null;
    };
  };
}

export interface Api {
  id: string;
  previousStatus: ApiStatus;
  mapping?: MappingTreeNode;
}

export type FileMap = Map<string, Api | ApiErrors>;

export interface FileApiIdMap {
  [filename: string]: string;
}

export interface Issue {
  id: string;
  description: string;
  pointer: string;
  score: number;
  displayScore: string;
  criticality: number;
  file?: string;
  line?: number;
  severity: string;
}

export interface AuditApi extends Api {
  score: number;
  failures: string[];
  issues: Issue[];
}

export type FileAuditMap = Map<string, AuditApi | ApiErrors>;

export interface AuditResult {
  files: FileAuditMap;
  failures: number;
}

export type SeverityEnum = "critical" | "high" | "medium" | "low" | "info";

export interface Score {
  data?: number;
  security?: number;
  overall?: number;
}

export interface SeverityPerCategory {
  data?: SeverityEnum;
  security?: SeverityEnum;
}

export interface Mapping {
  [k: string]: string;
}

export interface Options {
  platformUrl: string;
  logger: Logger;
  apiToken: string;
  userAgent: string;
  referer: string;
}

export interface Logger {
  fatal(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}
