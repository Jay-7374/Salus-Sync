package com.salus.sync;

import androidx.health.connect.client.HealthConnectClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        int status = HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata");
        
        String statusStr;
        if (status == HealthConnectClient.SDK_AVAILABLE) {
            statusStr = "AVAILABLE";
        } else if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            statusStr = "PROVIDER_UPDATE_REQUIRED";
        } else {
            statusStr = "UNAVAILABLE";
        }
        
        JSObject ret = new JSObject();
        ret.put("status", statusStr);
        call.resolve(ret);
    }
}
