import { Capacitor } from "@capacitor/core";
import { Configuration } from "./configurationService.types";
// eslint-disable-next-line no-undef

const environment = process.env.ENVIRONMENT || "local";
const keriaIP = process.env.KERIA_IP;

class ConfigurationService {
  private static configurationEnv: Configuration;

  static readonly INVALID_ENVIRONMENT_FILE = "Configuration file is invalid: ";
  static readonly CANNOT_LOAD_ENVIRONMENT_FILE =
    "Can not load environment file";

  async start() {
    await new Promise((rs, rj) => {
      import(`../../../configs/${environment}.yaml`)
        .then((module) => {
          const data = module.default;

          const validyCheck = this.configurationValid(data);
          if (validyCheck.success) {
            ConfigurationService.configurationEnv = data as Configuration;
            this.setKeriaIp();
          } else {
            rj(
              new Error(
                ConfigurationService.INVALID_ENVIRONMENT_FILE +
                  validyCheck.reason
              )
            );
          }

          rs(true);
        })
        .catch((e) => {
          rj(
            new Error(ConfigurationService.CANNOT_LOAD_ENVIRONMENT_FILE, {
              cause: e,
            })
          );
        });
    });
  }

  static get env() {
    return this.configurationEnv;
  }

  private getKeriaHost(): string | undefined {
    // If KERIA_IP is explicitly set, use it
    if (keriaIP) {
      return keriaIP;
    }

    // Automatically use 10.0.2.2 for Android emulator
    // 10.0.2.2 is the special alias Android emulator uses to reach the host machine
    try {
      if (Capacitor.getPlatform() === "android") {
        return "10.0.2.2";
      }
    } catch {
      // If Capacitor is not available (e.g., in tests), fall back to undefined
    }

    return undefined;
  }

  private setKeriaIp() {
    const keriaHost = this.getKeriaHost();
    if (!keriaHost) {
      // No host override needed
      return;
    }

    const keriaUrl = ConfigurationService.configurationEnv.keri?.keria?.url;
    const keriaBootUrl =
      ConfigurationService.configurationEnv.keri?.keria?.bootUrl;

    if (keriaUrl && ConfigurationService.configurationEnv.keri?.keria) {
      ConfigurationService.configurationEnv.keri.keria.url = keriaUrl.replace(
        /\/\/[^:]+/,
        `//${keriaHost}`
      );
    }
    if (keriaBootUrl && ConfigurationService.configurationEnv.keri?.keria) {
      ConfigurationService.configurationEnv.keri.keria.bootUrl =
        keriaBootUrl.replace(/\/\/[^:]+/, `//${keriaHost}`);
    }
  }

  /**
   * Get the resolved Keria connect URL
   * This is the centralized method for getting the Keria connect URL
   * @returns The resolved Keria connect URL
   */
  static getKeriaConnectUrl(): string {
    const url = ConfigurationService.configurationEnv?.keri?.keria?.url;
    if (!url) {
      throw new Error("Keria connect URL is not configured");
    }
    return url;
  }

  /**
   * Get the resolved Keria boot URL
   * This is the centralized method for getting the Keria boot URL
   * @returns The resolved Keria boot URL
   */
  static getKeriaBootUrl(): string {
    const url = ConfigurationService.configurationEnv?.keri?.keria?.bootUrl;
    if (!url) {
      throw new Error("Keria boot URL is not configured");
    }
    return url;
  }

  /**
   * Get the Keria host (IP address) used for URL resolution
   * This is useful for replacing http://keria:3902 in OOBI URLs
   * @returns The Keria host IP (e.g., "10.0.2.2" for Android emulator, "127.0.0.1" for others)
   */
  static getKeriaHost(): string {
    const keriaHost = new ConfigurationService().getKeriaHost();
    return keriaHost || "127.0.0.1";
  }

  private configurationValid(
    data: Configuration
  ): { success: true } | { success: false; reason: string } {
    const keri = data.keri;
    if (typeof keri !== "object") {
      return this.invalid("Missing top-level KERI object");
    }

    const security = data.security;
    if (typeof security !== "object" || security === null) {
      return this.invalid("Missing top-level security object");
    }

    const rasp = security.rasp;
    if (typeof rasp !== "object" || rasp === null) {
      return this.invalid("Missing rasp object in security configuration");
    }

    if (typeof rasp.enabled !== "boolean") {
      return this.invalid("rasp.enabled must be a boolean value");
    }

    return { success: true };
  }

  private invalid(reason: string) {
    return { success: false, reason };
  }
}

export { ConfigurationService };
