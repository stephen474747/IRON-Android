package com.iron.assistant;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONObject;

public class IronSmsSentReceiver extends BroadcastReceiver {
    private static final Object LOCK = new Object();

    private static JSONObject read(Context context, String key) {
        try { return new JSONObject(context.getSharedPreferences(IronSmsRelayService.PREF, Context.MODE_PRIVATE)
                .getString(key, "{}")); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    static void track(Context context, String id, int parts) throws Exception {
        synchronized (LOCK) {
            JSONObject inflight = read(context, "inflight");
            inflight.put(id, new JSONObject().put("remaining", parts).put("failed", false));
            context.getSharedPreferences(IronSmsRelayService.PREF, Context.MODE_PRIVATE)
                    .edit().putString("inflight", inflight.toString()).commit();
        }
    }

    static void recordAck(Context context, String id, boolean sent, String error) {
        synchronized (LOCK) {
            try {
                SharedPreferences pref = context.getSharedPreferences(IronSmsRelayService.PREF, Context.MODE_PRIVATE);
                JSONObject inflight = read(context, "inflight"), acks = read(context, "pending_acks");
                inflight.remove(id);
                acks.put(id, new JSONObject().put("sent", sent).put("error", error == null ? "" : error));
                pref.edit().putString("inflight", inflight.toString()).putString("pending_acks", acks.toString()).commit();
            } catch (Exception ignored) { }
        }
    }

    static JSONObject acks(Context context) { synchronized (LOCK) { return read(context, "pending_acks"); } }

    static void removeAck(Context context, String id) {
        synchronized (LOCK) {
            JSONObject acks = read(context, "pending_acks");acks.remove(id);
            context.getSharedPreferences(IronSmsRelayService.PREF, Context.MODE_PRIVATE)
                    .edit().putString("pending_acks", acks.toString()).commit();
        }
    }

    @Override public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra("id");
        if (id == null || !id.matches("sms_[a-f0-9]{32}")) return;
        synchronized (LOCK) {
            try {
                JSONObject inflight = read(context, "inflight");
                JSONObject state = inflight.optJSONObject(id);
                if (state == null) return;
                int remaining = Math.max(0, state.optInt("remaining") - 1);
                boolean failed = state.optBoolean("failed") || getResultCode() != Activity.RESULT_OK;
                state.put("remaining", remaining).put("failed", failed);
                context.getSharedPreferences(IronSmsRelayService.PREF, Context.MODE_PRIVATE)
                        .edit().putString("inflight", inflight.toString()).commit();
                if (remaining == 0) recordAck(context, id, !failed,
                        failed ? "Android meldete SMS-Versandfehler (Code " + getResultCode() + ")" : "");
            } catch (Exception ignored) { }
        }
    }
}
