import {config as sharedConfig} from "./wdio.appium.config.js";

export const config = {
  ...sharedConfig,
  capabilities: sharedConfig.capabilities.map((capability) => ({
    ...capability,
    platformName: "Android",
    "appium:deviceName": "emulator-5554",
    "appium:platformVersion": "16",
    "appium:automationName": "UiAutomator2",
    "appium:autoWebview": true, // Force enable for Capacitor/Ionic apps
  })),
};
