package com.iron.assistant;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "IronPhone")
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
}
