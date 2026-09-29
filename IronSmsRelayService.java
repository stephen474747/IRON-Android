package com.iron.assistant;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.util.Base64;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class IronSmsRelayService extends Service {
    static final String PREF = "iron_sms_background";
    static final String CLOUD = "https://starter-function-4j4o.fra.appwrite.run";
    static final String SENT_ACTION = "com.iron.assistant.SMS_SENT";
    private static final String CHANNEL = "iron_sms_relay";
    private ScheduledExecutorService worker;

    public static boolean enabled(Context context) {
        return !context.getSharedPreferences(PREF, MODE_PRIVATE).getString("token", "").isEmpty();
    }

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL, "IRON SMS-Verbindung",
                    NotificationManager.IMPORTANCE_LOW));
        }
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent content = PendingIntent.getActivity(this, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        Notification notification = builder.setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle("IRON SMS ist aktiv")
                .setContentText("Nachrichten werden über dieses Telefon gesendet")
                .setContentIntent(content).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(206, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
        } else startForeground(206, notification);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (!enabled(this)) { stopSelf(); return START_NOT_STICKY; }
        if (worker == null || worker.isShutdown()) {
            worker = Executors.newSingleThreadScheduledExecutor();
            worker.scheduleWithFixedDelay(this::tick, 0, 15, TimeUnit.SECONDS);
        }
        return START_STICKY;
    }

    @Override public void onDestroy() {
        if (worker != null) worker.shutdownNow();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    private String token() { return getSharedPreferences(PREF, MODE_PRIVATE).getString("token", ""); }

    private JSONObject api(String path, JSONObject payload) throws Exception {
        HttpURLConnection conn = (HttpURLConnection)new URL(CLOUD + path).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(7000);conn.setReadTimeout(12000);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("X-IRON-Device-Token", token());
            conn.setDoOutput(true);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            if (code == 401) { stopSelf(); throw new IllegalStateException("Geräteanmeldung abgelaufen; IRON-App erneut öffnen."); }
            BufferedReader in = new BufferedReader(new InputStreamReader(
                    code >= 400 ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder body = new StringBuilder();String line;
            while ((line = in.readLine()) != null) body.append(line);
            JSONObject result = new JSONObject(body.toString());
            if (code >= 400 || !result.optBoolean("ok"))
                throw new IllegalStateException("Cloud " + code + ": " + result.optString("error"));
            return result;
        } finally { conn.disconnect(); }
    }

    private void tick() {
        try {
            if (!enabled(this)) { stopSelf(); return; }
            flushAcks();
            if (checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED ||
                    checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return;
            JSONArray jobs = api("/api/sms/device-pending", new JSONObject()).optJSONArray("items");
            if (jobs == null) return;
            for (int i = 0; i < jobs.length(); i++) {
                JSONObject job = jobs.getJSONObject(i);
                String id = job.getString("id"), command = job.getString("command");
                try { api("/api/sms/device-claim", new JSONObject().put("id", id)); }
                catch (Exception taken) { continue; }
                try { sendClaimed(id, command); }
                catch (Exception failure) { IronSmsSentReceiver.recordAck(this, id, false, failure.getMessage()); }
            }
        } catch (Exception error) { Log.w("IRON SMS", "Background poll: " + error.getMessage()); }
    }

    private void flushAcks() throws Exception {
        JSONObject acks = IronSmsSentReceiver.acks(this);
        JSONArray keys = acks.names();
        if (keys == null) return;
        for (int i = 0; i < keys.length(); i++) {
            String id = keys.getString(i);
            JSONObject ack = acks.getJSONObject(id);
            api("/api/sms/device-ack", new JSONObject().put("id", id)
                    .put("sent", ack.optBoolean("sent"))
                    .put("error", ack.optString("error", "")));
            IronSmsSentReceiver.removeAck(this, id);
        }
    }

    private void sendClaimed(String id, String command) throws Exception {
        String[] parts = command.split("::", 4);
        if (parts.length != 4 || !"SMS".equals(parts[0]) ||
                !parts[2].matches("\\+?[0-9]{5,18}")) throw new IllegalArgumentException("SMS-Auftrag ungültig");
        String message = new String(Base64.decode(parts[3], Base64.URL_SAFE | Base64.NO_WRAP), StandardCharsets.UTF_8);
        if (message.isEmpty()) throw new IllegalArgumentException("SMS-Text leer");
        int slot = "2".equals(parts[1]) ? 2 : 1;
        SubscriptionManager manager = getSystemService(SubscriptionManager.class);
        List<SubscriptionInfo> sims = manager.getActiveSubscriptionInfoList();
        SubscriptionInfo selected = null;
        if (sims != null) for (SubscriptionInfo info : sims)
            if (info.getSimSlotIndex() + 1 == slot) selected = info;
        if (selected == null && sims != null && sims.size() == 1) selected = sims.get(0);
        if (selected == null) throw new IllegalStateException("Gewählte SIM nicht verfügbar");
        SmsManager sms = SmsManager.getSmsManagerForSubscriptionId(selected.getSubscriptionId());
        ArrayList<String> messages = sms.divideMessage(message);
        IronSmsSentReceiver.track(this, id, messages.size());
        ArrayList<PendingIntent> intents = new ArrayList<>();
        for (int i = 0; i < messages.size(); i++) {
            Intent event = new Intent(this, IronSmsSentReceiver.class).setAction(SENT_ACTION)
                    .putExtra("id", id).putExtra("part", i);
            intents.add(PendingIntent.getBroadcast(this, (id + i).hashCode(), event,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        if (messages.size() == 1) sms.sendTextMessage(parts[2], null, message, intents.get(0), null);
        else sms.sendMultipartTextMessage(parts[2], null, messages, intents, null);
        // Ack happens only when Android reports a result for every part.
    }
}
