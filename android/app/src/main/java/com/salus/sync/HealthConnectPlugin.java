package com.salus.sync;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.HeartRateRecord;
import androidx.health.connect.client.records.OxygenSaturationRecord;
import androidx.health.connect.client.records.SleepSessionRecord;
import androidx.health.connect.client.records.StepsRecord;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

import kotlin.coroutines.Continuation;
import kotlin.coroutines.CoroutineContext;
import kotlin.coroutines.EmptyCoroutineContext;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.JvmClassMappingKt;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {

    private Set<String> getRequiredPermissions() {
        Set<String> perms = new HashSet<>();
        perms.add(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(HeartRateRecord.class)));
        perms.add(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(StepsRecord.class)));
        perms.add(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(OxygenSaturationRecord.class)));
        perms.add(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(SleepSessionRecord.class)));
        return perms;
    }

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

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available");
            return;
        }

        queryAndResolvePermissions(call);
    }

    private void queryAndResolvePermissions(PluginCall call) {
        HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
        
        Continuation<Set<String>> cont = new Continuation<Set<String>>() {
            @Override
            public CoroutineContext getContext() {
                return EmptyCoroutineContext.INSTANCE;
            }

            @Override
            public void resumeWith(Object res) {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "queryAndResolvePermissions resumeWith called. res class: " + (res != null ? res.getClass().getName() : "null"));
                android.util.Log.d("SALUS_HEALTH_CONNECT", "resumeWith res toString: " + res);
                handlePermissionsResult(call, res);
            }
        };

        try {
            Object ret = client.getPermissionController().getGrantedPermissions(cont);
            
            if (ret == IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "getGrantedPermissions returned COROUTINE_SUSPENDED. Waiting for resumeWith.");
            } else {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "getGrantedPermissions completed synchronously. ret class: " + (ret != null ? ret.getClass().getName() : "null"));
                handlePermissionsResult(call, ret);
            }
        } catch (Exception e) {
            android.util.Log.e("SALUS_HEALTH_CONNECT", "Exception calling getGrantedPermissions: " + e.getMessage());
            call.reject("Exception calling getGrantedPermissions: " + e.getMessage());
        }
    }

    private void handlePermissionsResult(PluginCall call, Object res) {
        try {
            if (res != null && res.getClass().getName().contains("Result$Failure")) {
                android.util.Log.e("SALUS_HEALTH_CONNECT", "Kotlin Result.Failure received: " + res);
                call.reject("Kotlin Result.Failure from getGrantedPermissions: " + res);
                return;
            }

            Set<String> grantedPermissions = null;
            if (res instanceof Set) {
                grantedPermissions = (Set<String>) res;
            } else {
                android.util.Log.e("SALUS_HEALTH_CONNECT", "Unexpected result type: " + (res != null ? res.getClass().getName() : "null"));
                call.reject("Unexpected result type from getGrantedPermissions: " + (res != null ? res.getClass().getName() : "null"));
                return;
            }
            resolvePermissions(call, grantedPermissions);
        } catch (Exception e) {
            android.util.Log.e("SALUS_HEALTH_CONNECT", "Error parsing permissions: " + e.getMessage());
            call.reject("Error parsing permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available");
            return;
        }

        HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
        Set<String> perms = getRequiredPermissions();
        
        Intent intent = PermissionController.createRequestPermissionResultContract().createIntent(getContext(), perms);
        
        android.util.Log.d("SALUS_HEALTH_CONNECT", "==================================================");
        android.util.Log.d("SALUS_HEALTH_CONNECT", "SDK_INT: " + android.os.Build.VERSION.SDK_INT);
        android.util.Log.d("SALUS_HEALTH_CONNECT", "HC SDK status: " + HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata"));
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Intent action: " + intent.getAction());
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Intent package: " + intent.getPackage());
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Intent component: " + (intent.getComponent() != null ? intent.getComponent().flattenToString() : "null"));
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Intent data: " + intent.getData());
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Intent categories: " + intent.getCategories());
        
        android.content.ComponentName resolvedComponent = intent.resolveActivity(getContext().getPackageManager());
        android.util.Log.d("SALUS_HEALTH_CONNECT", "resolveActivity: " + (resolvedComponent != null ? resolvedComponent.flattenToString() : "null"));
        
        java.util.List<android.content.pm.ResolveInfo> activities = getContext().getPackageManager().queryIntentActivities(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
        android.util.Log.d("SALUS_HEALTH_CONNECT", "queryIntentActivities count: " + (activities != null ? activities.size() : 0));
        if (activities != null && !activities.isEmpty()) {
            for (android.content.pm.ResolveInfo info : activities) {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Found activity: " + info.activityInfo.packageName + "/" + info.activityInfo.name);
            }
        }
        android.util.Log.d("SALUS_HEALTH_CONNECT", "==================================================");
        
        // Removed the strict reject guard as per instructions to test if ActivityNotFoundException is thrown
        
        try {
            android.util.Log.d("SALUS_HEALTH_CONNECT", "Starting activity for result: permissionsResult");
            startActivityForResult(call, intent, "permissionsResult");
        } catch (android.content.ActivityNotFoundException e) {
            android.util.Log.e("SALUS_HEALTH_CONNECT", "ActivityNotFoundException caught: " + e.getMessage());
            call.reject("ActivityNotFoundException: " + e.getMessage());
        } catch (Exception e) {
            android.util.Log.e("SALUS_HEALTH_CONNECT", "Exception starting activity: " + e.getMessage());
            call.reject("Exception starting activity: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void permissionsResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect is not available");
            return;
        }

        HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
        
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Activity result returned. ResultCode: " + result.getResultCode());
        
        // Re-query the actual granted permissions using our shared robust handler
        queryAndResolvePermissions(call);
    }

    private void resolvePermissions(PluginCall call, Set<String> grantedPermissions) {
        Set<String> required = getRequiredPermissions();
        
        android.util.Log.d("SALUS_HEALTH_CONNECT", "Granted permission count: " + grantedPermissions.size());
        for (String p : grantedPermissions) {
            android.util.Log.d("SALUS_HEALTH_CONNECT", "RAW GRANTED PERMISSION: " + p);
        }
        
        for (String r : required) {
            android.util.Log.d("SALUS_HEALTH_CONNECT", "EXPECTED REQUIRED PERMISSION: " + r);
        }

        boolean heartRateMatch = grantedPermissions.contains(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(HeartRateRecord.class)));
        boolean stepsMatch = grantedPermissions.contains(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(StepsRecord.class)));
        boolean spo2Match = grantedPermissions.contains(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(OxygenSaturationRecord.class)));
        boolean sleepMatch = grantedPermissions.contains(HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(SleepSessionRecord.class)));
        
        android.util.Log.d("SALUS_HEALTH_CONNECT", "heartRate match = " + heartRateMatch);
        android.util.Log.d("SALUS_HEALTH_CONNECT", "steps match = " + stepsMatch);
        android.util.Log.d("SALUS_HEALTH_CONNECT", "spo2 match = " + spo2Match);
        android.util.Log.d("SALUS_HEALTH_CONNECT", "sleep match = " + sleepMatch);
        
        boolean allGranted = heartRateMatch && stepsMatch && spo2Match && sleepMatch;
        
        JSObject permissionsObj = new JSObject();
        permissionsObj.put("heartRate", heartRateMatch);
        permissionsObj.put("steps", stepsMatch);
        permissionsObj.put("spo2", spo2Match);
        permissionsObj.put("sleep", sleepMatch);
        
        JSObject expectedObj = new JSObject();
        expectedObj.put("heartRate", HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(HeartRateRecord.class)));
        expectedObj.put("steps", HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(StepsRecord.class)));
        expectedObj.put("spo2", HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(OxygenSaturationRecord.class)));
        expectedObj.put("sleep", HealthPermission.getReadPermission(JvmClassMappingKt.getKotlinClass(SleepSessionRecord.class)));
        
        com.getcapacitor.JSArray rawPerms = new com.getcapacitor.JSArray();
        for(String p : grantedPermissions) {
            rawPerms.put(p);
        }
        
        JSObject ret = new JSObject();
        ret.put("granted", allGranted);
        ret.put("permissions", permissionsObj);
        ret.put("grantedPermissionCount", grantedPermissions.size());
        ret.put("rawGrantedPermissions", rawPerms);
        ret.put("expectedPermissions", expectedObj);
        
        call.resolve(ret);
    }
}
