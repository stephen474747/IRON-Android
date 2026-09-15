package com.iron.assistant;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IronPhonePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
