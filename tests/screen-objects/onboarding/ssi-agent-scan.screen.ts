import { expect } from "expect-webdriverio";
import { browser } from "@wdio/globals";

export class SsiAgentScanScreen {
  get cancelButton() {
    // Cancel button is in PageHeader, need to find it via the page structure
    return $("[data-testid='ssi-agent-scan']").$("[data-testid='close-button']");
  }

  get enterManualButton() {
    return $("[data-testid='primary-button-ssi-agent-scan']");
  }

  get advancedSetupButton() {
    return $("[data-testid='tertiary-button-ssi-agent-scan']");
  }

  get scanContainer() {
    // Support both selectors - the page ID and the scan container
    // Step definitions use [data-testid="ssi-agent-scan-page"] for checking page existence
    return $("[data-testid='ssi-agent-scan-page']");
  }

  async isDisplayed(): Promise<boolean> {
    return await this.scanContainer.isDisplayed().catch(() => false);
  }

  async loads() {
    await expect(this.scanContainer).toBeDisplayed();
    await expect(this.enterManualButton).toBeDisplayed();
  }

  /**
   * Dismisses the camera mode dialog if it appears (Android emulator dialog)
   * Optimized for speed - checks and dismisses in one pass
   */
  async dismissCameraModeDialog(): Promise<void> {
    try {
      // Single execute call to check and dismiss dialog if present
      const result = await browser.execute(() => {
        // Quick check for dialog text
        const bodyText = document.body.textContent?.toLowerCase() || '';
        const hasDialog = bodyText.includes('entering camera mode') || bodyText.includes('camera mode');
        
        if (!hasDialog) {
          return { found: false };
        }

        // Find and click checkbox (if present)
        const checkbox = Array.from(document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).find(
          (el) => {
            const text = (el.textContent || '').toLowerCase();
            return text.includes("don't remind") || text.includes('dont remind');
          }
        ) as HTMLElement | undefined;

        if (checkbox) {
          checkbox.click();
        }

        // Find and click "Got It" button
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], ion-button'));
        const gotItButton = buttons.find((btn) => {
          const text = (btn.textContent || '').toLowerCase().trim();
          return text === 'got it' || text === 'gotit';
        }) as HTMLElement | undefined;

        if (gotItButton) {
          // Try shadow DOM for Ionic buttons
          if ((gotItButton as any).shadowRoot) {
            const shadowBtn = (gotItButton as any).shadowRoot.querySelector('button');
            if (shadowBtn) {
              shadowBtn.click();
              return { found: true, dismissed: true };
            }
          }
          gotItButton.click();
          return { found: true, dismissed: true };
        }

        return { found: true, dismissed: false };
      });

      if (result.found && result.dismissed) {
        console.log("[Camera Dialog] ✅ Dialog dismissed");
        // Quick wait for dialog to disappear (reduced from 500ms)
        await browser.pause(200);
      } else if (!result.found) {
        // Dialog not present - no action needed
      } else {
        console.log("[Camera Dialog] ⚠️ Dialog found but could not dismiss");
      }
    } catch (error) {
      // Non-blocking: if dialog handling fails, continue anyway
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes("timeout")) {
        console.log(`[Camera Dialog] Note: ${errorMsg}`);
      }
    }
  }
}

export default new SsiAgentScanScreen();
