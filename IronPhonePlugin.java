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

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "IronPhone",
    permissions = {
        @com.getcapacitor.annotation.Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        ),
        @com.getcapacitor.annotation.Permission(
            alias = "sms",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_PHONE_NUMBERS
            }
        )
    }
)
public class IronPhonePlugin extends Plugin {
    private static final int CALL_PERMISSION_REQUEST = 9412;

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

        if (ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_CONTACTS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsPermsCallback");
            return;
        }

        resolveContact(call, wanted);
    }

    @PermissionCallback
    private void contactsPermsCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_CONTACTS)
                == PackageManager.PERMISSION_GRANTED) {
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

    private boolean smsPermitted() {
        return ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
        && ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
        && ContextCompat.checkSelfPermission(
                getContext(), Manifest.permission.READ_PHONE_NUMBERS
        ) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void getSims(PluginCall call) {
        if (!smsPermitted()) {
            requestPermissionForAlias("sms", call, "smsListPermsCallback");
            return;
        }
        doGetSims(call);
    }

    @PermissionCallback
    private void smsListPermsCallback(PluginCall call) {
        if (smsPermitted()) doGetSims(call);
        else call.reject("SMS-/SIM-Berechtigung wurde nicht erteilt.");
    }

    private void doGetSims(PluginCall call) {
        try {
            SubscriptionManager sm = SubscriptionManager.from(getContext());
            List<SubscriptionInfo> list = sm.getActiveSubscriptionInfoList();
            JSArray sims = new JSArray();

            if (list != null) {
                for (SubscriptionInfo info : list) {
                    JSObject x = new JSObject();
                    x.put("slot", info.getSimSlotIndex() + 1);
                    x.put("subscriptionId", info.getSubscriptionId());
                    x.put("carrier", String.valueOf(info.getCarrierName()));
                    x.put("displayName", String.valueOf(info.getDisplayName()));
                    try { x.put("number", String.valueOf(info.getNumber())); } catch (Exception ignored) {}
                    sims.put(x);
                }
            }

            JSObject ret = new JSObject();
            ret.put("sims", sims);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SIMs konnten nicht gelesen werden: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        if (!smsPermitted()) {
            requestPermissionForAlias("sms", call, "smsSendPermsCallback");
            return;
        }
        doSendSms(call);
    }

    @PermissionCallback
    private void smsSendPermsCallback(PluginCall call) {
        if (smsPermitted()) doSendSms(call);
        else call.reject("SMS-/SIM-Berechtigung wurde nicht erteilt.");
    }

    private void doSendSms(PluginCall call) {
        String number = clean(call.getString("number", ""));
        String message = call.getString("message", "");
        String requestedSender = clean(call.getString("senderNumber", ""));
        Integer requestedSlot = call.getInt("simSlot", 1);

        if (number.isEmpty()) {
            call.reject("Keine Zielnummer angegeben.");
            return;
        }
        if (message == null || message.trim().isEmpty()) {
            call.reject("SMS-Text ist leer.");
            return;
        }

        try {
            SubscriptionManager subManager = SubscriptionManager.from(getContext());
            List<SubscriptionInfo> infos = subManager.getActiveSubscriptionInfoList();

            int wantedSlot = Math.max(1, Math.min(2, requestedSlot == null ? 1 : requestedSlot));
            SubscriptionInfo selected = null;

            if (infos != null) {
                if (!requestedSender.isEmpty()) {
                    String wantedDigits = requestedSender.replaceAll("\\D", "");
                    for (SubscriptionInfo info : infos) {
                        try {
                            String simNumber = clean(info.getNumber());
                            String simDigits = simNumber.replaceAll("\\D", "");
                            if (!simDigits.isEmpty() && (
                                    simDigits.equals(wantedDigits)
                                    || simDigits.endsWith(wantedDigits)
                                    || wantedDigits.endsWith(simDigits))) {
                                selected = info;
                                break;
                            }
                        } catch (Exception ignored) {}
                    }
                }

                if (selected == null) {
                    for (SubscriptionInfo info : infos) {
                        if (info.getSimSlotIndex() + 1 == wantedSlot) {
                            selected = info;
                            break;
                        }
                    }
                }
                if (selected == null && infos.size() == 1) {
                    selected = infos.get(0);
                }
            }

            SmsManager sms;
            int actualSlot = wantedSlot;
            if (selected != null) {
                sms = SmsManager.getSmsManagerForSubscriptionId(selected.getSubscriptionId());
                actualSlot = selected.getSimSlotIndex() + 1;
            } else {
                sms = SmsManager.getDefault();
            }

            ArrayList<String> parts = sms.divideMessage(message);
            if (parts.size() > 1) {
                sms.sendMultipartTextMessage(number, null, parts, null, null);
            } else {
                sms.sendTextMessage(number, null, message, null, null);
            }

            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("number", number);
            ret.put("simSlot", actualSlot);
            if (selected != null) {
                try { ret.put("senderNumber", String.valueOf(selected.getNumber())); } catch (Exception ignored) {}
            }
            ret.put("parts", parts.size());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SMS konnte nicht gesendet werden: " + e.getMessage(), e);
        }
    }
}
