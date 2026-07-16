interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  /** Backend base URL. Defaults to http://localhost:8787. */
  readonly WXT_API_BASE_URL?: string;
  /** 'true' forces the mock API, 'false' forces HTTP. Default: mock in dev. */
  readonly WXT_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
