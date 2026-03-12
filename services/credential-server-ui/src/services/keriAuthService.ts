import { createClient } from 'signify-polaris-web';
import type { ExtensionClient, AuthorizeResult } from 'signify-polaris-web';

/**
 * Service for managing KERI Auth extension interactions
 * Handles authorization, signing, and credential operations
 */
class KERIAuthService {
  private client: ExtensionClient | null = null;
  private authorizeResult: AuthorizeResult | null = null;
  private _extensionName: string = 'DIGN';

  /**
   * Initialize the KERI Auth extension client.
   * Also captures the extension display name from the discovery response
   * so callers can read it via getExtensionName() without sending a second message.
   * @returns Extension ID if installed, false otherwise
   */
  async initialize(): Promise<string | false> {
    console.log('[KERIAuth] Initializing...');

    // Listen for the signify-extension discovery reply BEFORE createClient()
    // fires the ping, so we don't miss it. polaris-web resolves the name in
    // event.data.data.name inside the same response it uses for extensionId.
    const nameCapture = new Promise<void>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        const name = event.data?.data?.name ?? event.data?.name;
        if (event.data?.type === 'signify-extension' && name) {
          this._extensionName = name;
          window.removeEventListener('message', handler);
          resolve();
        }
      };
      window.addEventListener('message', handler);
      // Give up after 4 s — keeps _extensionName at default 'DIGN'
      setTimeout(() => { window.removeEventListener('message', handler); resolve(); }, 4000);
    });

    this.client = createClient();
    const extensionId = await this.client.isExtensionInstalled();
    await nameCapture;

    if (extensionId) {
      console.log('[KERIAuth] Extension detected:', extensionId, '— name:', this._extensionName);
    } else {
      console.log('[KERIAuth] Extension not detected');
    }

    return extensionId;
  }

  /**
   * Request authorization from user via KERI Auth extension
   * @param message Optional custom message to display
   * @returns Authorization result containing AID and credentials
   */
  async authorize(message?: string): Promise<AuthorizeResult> {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    const result = await this.client.authorize({ 
      message: message || 'Do you approve this credential operation?' 
    });
    
    this.authorizeResult = result;
    
    return result;
  }

  /**
   * Open the extension's sign-data review UI, showing each item string to the user.
   * The `message` field accepts a JSON string to customise the UI labels
   * (requestTitleText, requestText, itemsLabel, buttonText).
   * Returns the AID that signed and per-item signatures.
   * Throws if the user cancels or the extension is not active.
   */
  async signData(payload: { message?: string; items: string[] }): Promise<{ aid: string; items: { data: string; signature: string }[] }> {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return await this.client.signData(payload);
  }

  /**
   * Generate signed headers for HTTP request
   * @param url Target URL to sign
   * @param method HTTP method (default: GET)
   * @returns Signed headers object
   */
  async signHeaders(url: string, method: string = 'GET'): Promise<Record<string, string>> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    if (!this.authorizeResult) {
      throw new Error('Must authorize first');
    }

    const result = await this.client.signRequest({ url, method });
    return result.headers;
  }

  /**
   * Create a data attestation credential
   * This will open the KERIAuth extension UI for credential preview and signing
   * @param params Credential data and schema SAID
   * @returns Signed credential with ACDC, issuance, anchoring, and operation details
   */
  async createDataAttestationCredential(params: {
    credData: any;
    schemaSaid: string;
  }) {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    if (!this.authorizeResult) {
      throw new Error('Must authorize before creating credentials. Call authorize() first.');
    }

    console.log('[KERIAuth] Creating data attestation credential...');
    console.log('[KERIAuth] Schema SAID:', params.schemaSaid);
    console.log('[KERIAuth] Credential data:', JSON.stringify(params.credData, null, 2));

    try {
      const result = await this.client.createDataAttestationCredential(params);
      
      console.log('[KERIAuth] Credential signed successfully!');
      console.log('[KERIAuth] Result:', {
        acdc: result.acdc ? 'Present' : 'Missing',
        iss: result.iss ? 'Present' : 'Missing',
        anc: result.anc ? 'Present' : 'Missing',
        op: result.op ? 'Present' : 'Missing',
      });
      console.log('[KERIAuth] Full result:', JSON.stringify(result, null, 2));

      return result;
    } catch (error: any) {
      console.error('[KERIAuth] Error creating credential:', error);
      console.error('[KERIAuth] Error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Retrieve a credential by its SAID
   * @param credentialSAID The credential's self-addressing identifier
   * @param includeCESR Include CESR-encoded format
   */
  async getCredential(credentialSAID: string, includeCESR: boolean = true) {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    return await this.client.getCredential(credentialSAID, includeCESR);
  }

  // Utility methods
  
  /**
   * Get the authorized AID prefix
   * @returns AID prefix or null if not authorized
   */
  getAuthorizedAID(): string | null {
    return this.authorizeResult?.identifier?.prefix || null;
  }

  /**
   * Check if user has authorized
   * @returns true if authorized, false otherwise
   */
  isAuthorized(): boolean {
    return !!this.authorizeResult;
  }

  /**
   * Get the full authorization result
   * @returns AuthorizeResult or null
   */
  getAuthorizeResult(): AuthorizeResult | null {
    return this.authorizeResult;
  }

  /**
   * Send a typed message to the KERIAuth extension via window.postMessage,
   * using the same protocol the polaris-web client uses internally.
   * This avoids depending on the internal sendMessage API of ExtensionClient.
   */
  private sendExtensionMessage<TResponse>(
    type: string,
    payload: Record<string, unknown>,
    timeoutMs = 90000
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      const requestId = crypto.randomUUID();

      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(
          new Error(
            'Extension did not respond. Ensure the KERIAuth extension is active on this page.'
          )
        );
      }, timeoutMs);

      const handler = (event: MessageEvent) => {
        if (event.source !== window) return;
        const data = event.data as Record<string, unknown> | null;
        if (!data || typeof data !== 'object') return;
        if (data['type'] !== '/signify/reply' || data['requestId'] !== requestId) return;

        clearTimeout(timer);
        window.removeEventListener('message', handler);

        if (data['error']) {
          reject(new Error(typeof data['error'] === 'string' ? data['error'] : 'Extension error'));
        } else if (!data['payload'] || typeof data['payload'] !== 'object') {
          reject(new Error('No payload received from extension'));
        } else {
          resolve(data['payload'] as TResponse);
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({ requestId, type, ...payload }, window.location.origin);
    });
  }

  /**
   * Return the extension display name captured during initialize().
   * Never sends a second message to the extension — that would cause DIGN to
   * respond with a mismatched format and break the polaris-web event handler.
   */
  getExtensionName(): string {
    return this._extensionName;
  }

  /**
   * Send the server's OOBI to the extension to initiate a mutual OOBI connection.
   * The extension will prompt the user to approve, then return its own reciprocal OOBI.
   * @param serverOobi The credential server's own OOBI URL
   * @returns The extension's reciprocal OOBI URL
   */
  async connectWithExtension(serverOobi: string): Promise<string> {
    const result = await this.sendExtensionMessage<{ oobi: string }>(
      '/KeriAuth/connection/invite',
      { payload: { oobi: serverOobi } }
    );
    return result.oobi;
  }

  /**
   * Notify the KERIAuth extension that the server has successfully resolved its OOBI,
   * completing the mutual connection handshake.
   * @param serverOobi The credential server's own OOBI URL (used as correlation key)
   */
  async confirmExtensionConnection(serverOobi: string): Promise<void> {
    await this.sendExtensionMessage<{ ok: boolean }>(
      '/KeriAuth/connection/confirm',
      { payload: { oobi: serverOobi } }
    );
  }

  /**
   * Reset authorization state
   */
  reset(): void {
    this.authorizeResult = null;
  }
}

export const keriAuthService = new KERIAuthService();
