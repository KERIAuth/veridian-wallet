import { Given, Then } from "@wdio/cucumber-framework";
import { expect } from "expect-webdriverio";

Given(/^user accept Terms and Privacy Policy$/, async function () {
  // PageFooter without pageId prop uses data-testid="primary-button"
  const primaryButton = $('[data-testid="primary-button"]');
  
  await primaryButton.waitForDisplayed({ timeout: 15000 });
  await primaryButton.waitForClickable();
  await primaryButton.click();
});

Then(/^user can see Terms and Privacy screen$/, async function () {
  // Verify Terms and Privacy screen is displayed
  const segment = $('[data-testid="term-n-privacy-segment"]');
  const primaryButton = $('[data-testid="primary-button"]');
  
  await segment.waitForDisplayed({ timeout: 10000 });
  await expect(segment).toBeDisplayed();
  await expect(primaryButton).toBeDisplayed();
});

