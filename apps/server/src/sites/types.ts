/** The platform provides these bindings; no Cloudflare account keys enter the app. */
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export interface ObjectStore {
  get(key: string): Promise<{ body: ReadableStream; size: number;
    httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer, options?: {
    httpMetadata?: { contentType: string };
  }): Promise<unknown>;
}
export type SitesEnv = {
  DB: Database;
  MEDIA: ObjectStore;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  // Set by the installer after verifying the owner in the private Site.
  // This is the Site-scoped authenticated user ID, not email or an account ID.
  WONBOARD_OWNER_ID?: string;
};
