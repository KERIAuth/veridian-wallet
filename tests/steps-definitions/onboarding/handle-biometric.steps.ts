import { Given } from "@wdio/cucumber-framework";
import BiometricScreen from "../../screen-objects/onboarding/biometric.screen";

Given(/^user skip Biometric popup if it exist$/, async function() {
  try {
    // Wait for biometric screen with longer timeout
    const biometricExists = await BiometricScreen.biometricTitleText.isExisting();
    
    if (biometricExists) {
      await BiometricScreen.loads();
      
      // Click "Set up later" button
      await BiometricScreen.setUpLaterButton.click();
      console.log('Clicked "Set up later" button');
      
      // Wait for cancellation alert popup to appear
      const cancelAlert = $('[data-testid="alert-cancel-biometry-confirm-button"]');
      await cancelAlert.waitForDisplayed({ timeout: 5000 });
      console.log('Alert popup appeared');
      
      // Click "Yes" button in alert to confirm skip
      await cancelAlert.click();
      console.log('Clicked "Yes" button in alert');
      
      // Wait for navigation to complete
      await browser.pause(2000);
    } else {
      console.log('Biometric screen not found - may already be skipped or on emulator');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("Skip biometric step - screen not available:", error.message);
    } else {
      console.log("Skip biometric step - screen not available:", error);
    }
  }
});