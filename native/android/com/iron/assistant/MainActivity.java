package com.iron.assistant;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IronPhonePlugin.class);
        registerPlugin(IronCalendarPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            Intent service = new Intent(this, IronSmsRelayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(service);
            } else {
                startService(service);
            }
        } catch (Exception e) {
            android.util.Log.w("IRON", "SMS Relay Service konnte nicht starten", e);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().resumeTimers();
            }
        } catch (Exception ignored) {}
    }
}
