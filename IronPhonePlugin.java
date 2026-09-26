package com.iron.assistant;

import android.Manifest;
import android.content.Intent;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.telephony.SmsManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import java.util.ArrayList;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
    name = "IronPhone",
    permissions = {
        @com.getcapacitor.annotation.Permission(
            alias = "contacts",
            strings = { android.Manifest.permission.READ_CONTACTS }
        ),
        @com.getcapacitor.annotation.Permission(
            alias = "sms",
            strings = { android.Manifest.permission.SEND_SMS }
        ),
        @com.getcapacitor.annotation.Permission(
            alias = "phoneState",
            strings = { android.Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class IronPhonePlugin extends Plugin {
    private static final int CALL_PERMISSION_REQUEST = 9412;

    @PluginMethod
    public void composeSms(PluginCall call) {
        String number = clean(call.getString("number", ""));
        String message = call.getString("message", "");
        if (number.isEmpty() || message.trim().isEmpty()) { call.reject("Nummer und SMS-Text fehlen."); return; }
        Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + number));
        intent.putExtra("sms_body", message);
        try { getActivity().startActivity(intent); call.resolve(); }
        catch (Exception ex) { call.reject("Keine SMS-App verfügbar.", ex); }
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String number = clean(call.getString("number", ""));
        String message = call.getString("message", "");
        int slot = call.getInt("slot", 1);
        if (number.isEmpty() || message.trim().isEmpty()) { call.reject("Nummer und SMS-Text fehlen."); return; }
        if (slot != 1 && slot != 2) { call.reject("SIM-Auswahl ungültig."); return; }
        if (androidx.core.content.ContextCompat.checkSelfPermission(getContext(), Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
            return;
        }
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED) { requestPermissionForAlias("phoneState", call, "phoneStatePermsCallback"); return; }
        deliverSms(call, number, message, slot);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (androidx.core.content.ContextCompat.checkSelfPermission(getContext(), Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) { call.reject("SMS-Berechtigung wurde nicht erteilt."); return; }
        sendSms(call);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void phoneStatePermsCallback(PluginCall call) {
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED) { call.reject("SIM-Berechtigung wurde nicht erteilt."); return; }
        sendSms(call);
    }

    private void deliverSms(PluginCall call, String number, String message, int slot) {
        try {
            SubscriptionManager subscriptions = (SubscriptionManager) getContext().getSystemService(android.content.Context.TELEPHONY_SUBSCRIPTION_SERVICE);
            java.util.List<SubscriptionInfo> active = subscriptions == null ? null : subscriptions.getActiveSubscriptionInfoList();
            SubscriptionInfo selected = null;
            if (active != null) for (SubscriptionInfo info : active) {
                if (info.getSimSlotIndex() == slot-1) { selected = info; break; }
            }
            if (selected == null) { call.reject("Die gewählte SIM ist nicht aktiv."); return; }
            SmsManager manager = SmsManager.getSmsManagerForSubscriptionId(selected.getSubscriptionId());
            ArrayList<String> parts = manager.divideMessage(message);
            if (parts.size() == 1) manager.sendTextMessage(number, null, message, null, null);
            else manager.sendMultipartTextMessage(number, null, parts, null, null);
            JSObject result = new JSObject();
            result.put("accepted", true);
            call.resolve(result);
        } catch (Exception ex) { call.reject("SMS konnte nicht an Android übergeben werden: " + ex.getMessage(), ex); }
    }

    private String clean(String number) {
        if (number == null) return "";
        return number.replaceAll("[^0-9+]", "");
    }

    @PluginMethod
    public void dial(PluginCall call) {
        String number = clean(call.getString("number", ""));
        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer angegeben.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + number));
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void call(PluginCall call) {
        String number = clean(call.getString("number", ""));
        if (number.isEmpty()) {
            call.reject("Keine Telefonnummer angegeben.");
            return;
        }

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{Manifest.permission.CALL_PHONE},
                    CALL_PERMISSION_REQUEST
            );
            JSObject ret = new JSObject();
            ret.put("permissionRequested", true);
            ret.put("message", "Telefon-Berechtigung wurde angefragt. Nach dem Erlauben bitte ANRUFEN erneut drücken.");
            call.resolve(ret);
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + number));
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void lookupContact(PluginCall call) {
        String wanted = call.getString("name", "").trim();
        if (wanted.isEmpty()) {
            call.reject("Kontaktname fehlt.");
            return;
        }

        if (androidx.core.content.ContextCompat.checkSelfPermission(
                getContext(), android.Manifest.permission.READ_CONTACTS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermsCallback");
            return;
        }

        resolveContact(call, wanted);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void contactsPermsCallback(PluginCall call) {
        if (androidx.core.content.ContextCompat.checkSelfPermission(
                getContext(), android.Manifest.permission.READ_CONTACTS)
                == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            resolveContact(call, call.getString("name", ""));
        } else {
            call.reject("Kontakte-Berechtigung wurde nicht erteilt.");
        }
    }

    private void resolveContact(PluginCall call, String wanted) {
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[] {
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                    },
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
                    new String[] { "%" + wanted + "%" },
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            );

            if (cursor != null && cursor.moveToFirst()) {
                JSObject ret = new JSObject();
                ret.put("name", cursor.getString(0));
                ret.put("number", cursor.getString(1));
                call.resolve(ret);
            } else {
                call.reject("Kontakt nicht gefunden: " + wanted);
            }
        } catch (Exception e) {
            call.reject("Kontakt konnte nicht gelesen werden: " + e.getMessage(), e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

}
