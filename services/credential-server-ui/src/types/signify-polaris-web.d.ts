declare module 'signify-polaris-web' {
  export interface SessionArgs {
    oneTime?: boolean;
  }

  export interface AuthorizeArgs {
    message?: string;
    session?: SessionArgs;
  }

  export interface AuthorizeResultCredential {
    raw: unknown;
    cesr: string;
  }

  export interface AuthorizeResultIdentifier {
    prefix: string;
  }

  export interface AuthorizeResult {
    credential?: AuthorizeResultCredential;
    identifier?: AuthorizeResultIdentifier;
    headers?: Record<string, string>;
  }

  export interface SignDataArgs {
    message?: string;
    items: string[];
  }

  export interface SignDataResultItem {
    data: string;
    signature: string;
  }

  export interface SignDataResult {
    aid: string;
    items: SignDataResultItem[];
  }

  export interface SignRequestArgs {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  }

  export interface SignRequestResult {
    headers: Record<string, string>;
  }

  export interface CredentialResult {
    credential: any;
  }

  export interface CreateCredentialArgs {
    credData: any;
    schemaSaid: string;
  }

  export interface CreateCredentialResult {
    acdc: Record<string, any>;
    iss: Record<string, any>;
    anc: Record<string, any>;
    op: Record<string, any>;
  }

  export interface ConfigureVendorArgs {
    url: string;
  }

  export interface ExtensionClientOptions {
    targetOrigin?: string;
  }

  export interface ExtensionClient {
    isExtensionInstalled(timeout?: number): Promise<string | false>;
    signRequest(payload: SignRequestArgs): Promise<SignRequestResult>;
    signData(payload: SignDataArgs): Promise<SignDataResult>;
    authorize(payload?: AuthorizeArgs): Promise<AuthorizeResult>;
    authorizeAid(payload?: AuthorizeArgs): Promise<AuthorizeResult>;
    authorizeCred(payload?: AuthorizeArgs): Promise<AuthorizeResult>;
    getSessionInfo(payload?: AuthorizeArgs): Promise<AuthorizeResult>;
    clearSession(payload?: AuthorizeArgs): Promise<AuthorizeResult>;
    createDataAttestationCredential(payload: CreateCredentialArgs): Promise<CreateCredentialResult>;
    getCredential(said: string, includeCESR?: boolean): Promise<CredentialResult>;
    configureVendor(payload?: ConfigureVendorArgs): Promise<void>;
    sendMessage<TRequest, TResponse>(type: string, payload?: TRequest): Promise<TResponse>;
  }

  export function createClient(options?: ExtensionClientOptions): ExtensionClient;
}
