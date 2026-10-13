/** The platform provides these bindings; no Cloudflare account keys enter the app. */
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]>;
}
export interface ObjectStore {
  delete?(key: string): Promise<void>;
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
  // Optional. A new Site records its first signed-in account as the owner in the
  // database. When this value is set it decides the owner instead, which keeps
  // earlier installs working and lets the installer correct a wrong owner.
  // This is the Site-scoped authenticated user ID, not email or an account ID.
  WONBOARD_OWNER_ID?: string;
};
