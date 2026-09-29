package com.iron.assistant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

public class IronSmsBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!IronSmsRelayService.enabled(context)) return;
        try { ContextCompat.startForegroundService(context,
                new Intent(context, IronSmsRelayService.class)); }
        catch (RuntimeException ignored) { /* The app can be opened to restart the relay. */ }
    }
}
