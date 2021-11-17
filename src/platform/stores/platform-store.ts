import {
  createApi,
  createCollection,
  deleteApi,
  deleteCollection,
  listApis,
  listCollections,
} from "../api";
import { Api, CollectionData, PlatformContext } from "../types";

export class PlatformStore {
  constructor(private context: PlatformContext) {}

  async getCollections(): Promise<CollectionData[]> {
    const response = await listCollections(
      this.context.foo.filter,
      this.context.connection,
      this.context.logger
    );

    return response.list;
  }

  async createCollection(name: string): Promise<CollectionData> {
    const collection = await createCollection(name, this.context.connection, this.context.logger);
    return collection;
  }

  async createApi(collectionId: string, name: string, json: string): Promise<Api> {
    const api = await createApi(
      collectionId,
      name,
      Buffer.from(json),
      this.context.connection,
      this.context.logger
    );
    return api;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await deleteCollection(collectionId, this.context.connection, this.context.logger);
  }

  async deleteApi(apiId: string): Promise<void> {
    await deleteApi(apiId, this.context.connection, this.context.logger);
  }

  async getApis(collectionId: string): Promise<Api[]> {
    const response = await listApis(collectionId, this.context.connection, this.context.logger);
    return response.list;
  }

  refresh(): void {}
}
