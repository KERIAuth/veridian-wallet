package org.cardanofoundation.idw;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Allow mixed content (HTTP from HTTPS) for Android emulator to reach Keria
        // This is necessary because the app loads over HTTPS but needs to connect to HTTP Keria
        WebSettings webSettings = this.bridge.getWebView().getSettings();
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
