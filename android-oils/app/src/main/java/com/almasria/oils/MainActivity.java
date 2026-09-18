package com.almasria.oils;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String OILS_START_PATH = "/oils";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Launcher opens have no deep-link data. Force the oils route from the
        // native layer even if a stale/malformed packaged config is encountered.
        // Deep links keep their original callback target.
        if (bridge != null && (getIntent() == null || getIntent().getData() == null)) {
            String currentUrl = bridge.getWebView().getUrl();
            if (currentUrl == null || !currentUrl.contains(OILS_START_PATH)) {
                bridge.getWebView().loadUrl(bridge.getLocalUrl() + OILS_START_PATH);
            }
        }
    }
}
