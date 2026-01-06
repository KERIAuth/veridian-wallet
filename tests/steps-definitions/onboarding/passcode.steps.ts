import { Given, Then, When } from "@wdio/cucumber-framework";
import PasscodeScreen from "../../screen-objects/onboarding/passcode.screen.js";
import { expect } from "expect-webdriverio";
import MenuPasscodeScreen from "../../screen-objects/menu/menu-passcode.screen.js";
import { Passcode } from "../../constants/text.constants";

Given(
  /^user enter a generated passcode on Passcode screen$/,
  async function () {
    this.passcode = await PasscodeScreen.createAndEnterRandomPasscode();
    if (await MenuPasscodeScreen.changePinTitle.isExisting()) {
      if (await MenuPasscodeScreen.changePinTitle.getText() != Passcode.TitleReEnterNewPasscode) {
        await PasscodeScreen.enterPasscode(this.passcode);
      }
    }
  }
);

Given(/^user generate passcode on Passcode screen$/, async function () {
  // Wait for Passcode screen to load first
  await PasscodeScreen.loads();
  
  // Generate and enter passcode (first time)
  this.passcode = await PasscodeScreen.createAndEnterRandomPasscode();
  
  // Wait for Re-enter screen to appear
  await PasscodeScreen.loadsReEnterScreen();
  
  // Re-enter the same passcode to confirm
  await PasscodeScreen.enterPasscode(this.passcode);
});

Given(/^user can see Re-enter your PIN screen$/, async function () {
  await PasscodeScreen.loadsReEnterScreen();
  // Debug: pause to allow visual verification of Re-enter PIN screen
  await browser.pause(2000);
});

When(/^user re-enter passcode on Passcode screen$/, async function () {
  await PasscodeScreen.enterPasscode(this.passcode);
});

When(
  /^user tap Can't remember button on Re-enter your PIN screen$/,
  async function () {
    // Debug: pause before tapping Can't remember to see the state
    await browser.pause(2000);
    await PasscodeScreen.cantRememberButton.click();
  }
);

Then(/^user can see PIN screen$/, async function () {
  await PasscodeScreen.loads();
  // Debug: pause to allow visual verification of PIN screen
  await browser.pause(2000);
});

Then(
  /^user can see (.*) on Passcode screen$/,
  async function (errorMessage: string) {
    await expect(await PasscodeScreen.errorMessageText.getText()).toMatch(
      errorMessage
    );
  }
);
