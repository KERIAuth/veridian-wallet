import { Given, Then, When } from "@wdio/cucumber-framework";
import { expect } from "expect-webdriverio";
import AlertModal from "../../screen-objects/components/alert.modal.js";
import CreatePasswordScreen from "../../screen-objects/onboarding/create-password.screen.js";
import { returnPassword } from "../../helpers/generate.js";
import { CreatePassword } from "../../constants/text.constants.js";

Given(/^skip Create Password screen$/, async function () {
  await CreatePasswordScreen.setUpLaterButton.click();
  await AlertModal.clickConfirmButtonOf(CreatePasswordScreen.alertModal);
});

Given(/^user tap Skip button on Create Password screen$/, async function () {
  await CreatePasswordScreen.skipButton.click();
});

Given(
  /^user generated a password of (\d+) characters$/,
  async function (passwordLength: number) {
    (global as any).generatedPassword = await returnPassword(passwordLength);
  }
);

Given(/^user type in password on Create Password screen$/, async function () {
  await CreatePasswordScreen.createPasswordInput.addValue(
    (global as any).generatedPassword
  );
});

Given(
  /^user confirm type in password on Create Password screen$/,
  async function () {
    await CreatePasswordScreen.confirmPasswordInput.scrollIntoView();
    await CreatePasswordScreen.confirmPasswordInput.addValue(
      (global as any).generatedPassword
    );
  }
);

Given(
  /^user type in hint for the password on Create Password screen$/,
  async function () {
    await CreatePasswordScreen.hintInput.scrollIntoView();
    await CreatePasswordScreen.hintInput.addValue("test hint");
  }
);

Given(
  /^user type in password (.*) on Create Password screen$/,
  async function (password: string) {
    await CreatePasswordScreen.createPasswordInput.addValue(password);
    await CreatePasswordScreen.screenTitle.click();
  }
);

Given(
  /^all conditions are displayed as passed on Create Password screen$/,
  async function () {
    await expect(
      await CreatePasswordScreen.passwordAcceptCriteriaParagraph.getText()
    ).toMatch(CreatePassword.AcceptCriteria);
  }
);

When(
  /^user tap Create Password button on Create Password screen$/,
  async function () {
    await CreatePasswordScreen.createPasswordButton.scrollIntoView();
    await CreatePasswordScreen.createPasswordButton.waitForClickable();
    await CreatePasswordScreen.createPasswordButton.click();
  }
);

Then(/^user can see Create Password screen$/, async function () {
  await CreatePasswordScreen.loads();
});

Then(
  /^user can see (.*) on Create Password screen$/,
  async function (errorMessage: string) {
    await expect(await CreatePasswordScreen.errorMessageText.getText()).toMatch(
      errorMessage
    );
  }
);
Given(/^user tap on Add a password on Create a password screen$/, async function() {
  // Wait longer for navigation to complete after biometric
  await browser.pause(3000);
  
  // Debug: Print current URL and page source snippet
  const currentUrl = await browser.getUrl();
  console.log('Current URL after biometric:', currentUrl);
  
  // Check if we're on intro screen (step 0) 
  const pageInfo = CreatePasswordScreen.pageInforTitle;
  
  try {
    // Wait for intro screen with longer timeout
    await pageInfo.waitForDisplayed({ timeout: 10000 });
    
    console.log('Found intro screen - clicking Add password button');
    const addButton = CreatePasswordScreen.addPasswordButton;
    await addButton.waitForDisplayed({ timeout: 5000 });
    await addButton.waitForClickable();
    await addButton.click();
    
    // Wait for form to load
    await browser.pause(2000);
  } catch (error) {
    console.log('Intro screen not found, checking if already on form screen...');
    
    // Check if form screen is already displayed
    const formTitle = CreatePasswordScreen.screenTitle;
    const isFormScreen = await formTitle.isExisting();
    
    if (isFormScreen) {
      console.log('Already on form screen - skipping button click');
    } else {
      // Debug: Get page source to see what's on screen
      const pageSource = await browser.getPageSource();
      console.log('Page source length:', pageSource.length);
      console.log('First 500 chars:', pageSource.substring(0, 500));
      
      throw new Error('Neither intro screen nor form screen found - app may be on different screen. Check logs for current state.');
    }
  }
});