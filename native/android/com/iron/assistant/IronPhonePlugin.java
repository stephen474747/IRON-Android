package com.iron.assistant;

import android.Manifest;
import android.content.Intent;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.content.pm.PackageManager;
import android.net.Uri;

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