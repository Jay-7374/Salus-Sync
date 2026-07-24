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

import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.time.TimeRangeFilter;
import androidx.health.connect.client.response.ReadRecordsResponse;
import androidx.health.connect.client.records.Record;
import androidx.health.connect.client.records.metadata.Metadata;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;
import androidx.health.connect.client.request.AggregateRequest;
import androidx.health.connect.client.aggregate.AggregationResult;
import androidx.health.connect.client.aggregate.AggregateMetric;

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

    private interface ReadRecordsCallback<T extends Record> {
        void onSuccess(List<T> records);
        void onError(Exception e);
    }

    private <T extends Record> void performReadRecords(PluginCall call, ReadRecordsRequest<T> request, ReadRecordsCallback<T> callback) {
        HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());

        Continuation<ReadRecordsResponse<T>> cont = new Continuation<ReadRecordsResponse<T>>() {
            @Override
            public CoroutineContext getContext() {
                return EmptyCoroutineContext.INSTANCE;
            }

            @Override
            public void resumeWith(Object res) {
                try {
                    if (res != null && res.getClass().getName().contains("Result$Failure")) {
                        android.util.Log.e("SALUS_HEALTH_CONNECT", "Kotlin Result.Failure received from readRecords: " + res);
                        callback.onError(new Exception("Kotlin Result.Failure: " + res.toString()));
                        return;
                    }

                    if (res instanceof ReadRecordsResponse) {
                        ReadRecordsResponse<T> response = (ReadRecordsResponse<T>) res;
                        callback.onSuccess(response.getRecords());
                    } else {
                        callback.onError(new Exception("Unexpected result type from readRecords: " + (res != null ? res.getClass().getName() : "null")));
                    }
                } catch (Exception e) {
                    callback.onError(e);
                }
            }
        };

        try {
            Object ret = client.readRecords(request, cont);

            if (ret == IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "readRecords returned COROUTINE_SUSPENDED. Waiting for resumeWith.");
            } else {
                android.util.Log.d("SALUS_HEALTH_CONNECT", "readRecords completed synchronously. ret class: " + (ret != null ? ret.getClass().getName() : "null"));
                if (ret instanceof ReadRecordsResponse) {
                    ReadRecordsResponse<T> response = (ReadRecordsResponse<T>) ret;
                    callback.onSuccess(response.getRecords());
                } else {
                    callback.onError(new Exception("Unexpected synchronous result type from readRecords: " + (ret != null ? ret.getClass().getName() : "null")));
                }
            }
        } catch (Exception e) {
            android.util.Log.e("SALUS_HEALTH_CONNECT", "Exception calling readRecords: " + e.getMessage());
            callback.onError(e);
        }
    }

    private JSObject createUnavailableResult() {
        JSObject ret = new JSObject();
        ret.put("available", false);
        ret.put("hasPermission", false);
        ret.put("hasData", false);
        return ret;
    }

    private JSObject createNoPermissionResult() {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("hasPermission", false);
        ret.put("hasData", false);
        return ret;
    }

    private JSObject createEmptyDataResult() {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("hasPermission", true);
        ret.put("hasData", false);
        return ret;
    }

    @PluginMethod
    public void getLatestHeartRate(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(createUnavailableResult());
            return;
        }

        Instant now = Instant.now();
        Instant start = now.minus(7, ChronoUnit.DAYS);
        TimeRangeFilter filter = TimeRangeFilter.between(start, now);
        
        ReadRecordsRequest<HeartRateRecord> req = new ReadRecordsRequest<>(
            JvmClassMappingKt.getKotlinClass(HeartRateRecord.class),
            filter,
            java.util.Collections.emptySet(),
            false, // descending to get latest first
            100, // Fetch up to 100 records to ensure we get the absolute latest sample across overlapping records
            null
        );

        performReadRecords(call, req, new ReadRecordsCallback<HeartRateRecord>() {
            @Override
            public void onSuccess(List<HeartRateRecord> records) {
                if (records.isEmpty()) {
                    call.resolve(createEmptyDataResult());
                    return;
                }
                
                // TASK 3: Heart-rate verification diagnostics
                android.util.Log.d("SALUS_HEALTH_CONNECT", "=== B2.4 HEART RATE DIAGNOSTICS ===");
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Total HR records returned: " + records.size());
                
                HeartRateRecord.Sample globalLatestSample = null;
                HeartRateRecord sourceRecord = null;

                for (HeartRateRecord r : records) {
                    android.util.Log.d("SALUS_HEALTH_CONNECT", "Record Start: " + r.getStartTime() + " End: " + r.getEndTime() + 
                                       " Origin: " + (r.getMetadata().getDataOrigin() != null ? r.getMetadata().getDataOrigin().getPackageName() : "null"));
                    
                    for (HeartRateRecord.Sample s : r.getSamples()) {
                        if (globalLatestSample == null || s.getTime().isAfter(globalLatestSample.getTime())) {
                            globalLatestSample = s;
                            sourceRecord = r;
                        }
                    }
                }
                
                if (globalLatestSample == null) {
                    call.resolve(createEmptyDataResult());
                    return;
                }
                
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Selected Sample Time: " + globalLatestSample.getTime());
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Selected Sample BPM: " + globalLatestSample.getBeatsPerMinute());
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Selected Data Origin: " + (sourceRecord.getMetadata().getDataOrigin() != null ? sourceRecord.getMetadata().getDataOrigin().getPackageName() : "null"));
                android.util.Log.d("SALUS_HEALTH_CONNECT", "===================================");

                JSObject ret = new JSObject();
                ret.put("available", true);
                ret.put("hasPermission", true);
                ret.put("hasData", true);
                ret.put("value", globalLatestSample.getBeatsPerMinute());
                ret.put("unit", "bpm");
                ret.put("startTime", globalLatestSample.getTime().toString());
                ret.put("endTime", globalLatestSample.getTime().toString());
                
                Metadata m = sourceRecord.getMetadata();
                if (m.getDataOrigin() != null) {
                    ret.put("source", m.getDataOrigin().getPackageName());
                }
                if (m.getDevice() != null) {
                    String deviceName = m.getDevice().getManufacturer() + " " + m.getDevice().getModel();
                    ret.put("deviceName", deviceName.trim());
                }
                
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Heart Rate result: " + ret.toString());
                call.resolve(ret);
            }

            @Override
            public void onError(Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("SecurityException")) {
                    call.resolve(createNoPermissionResult());
                } else {
                    call.reject("Error reading Heart Rate: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(createUnavailableResult());
            return;
        }
        
        ZonedDateTime nowZ = ZonedDateTime.now(ZoneId.systemDefault());
        Instant now = nowZ.toInstant();
        Instant start = nowZ.toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant();
        TimeRangeFilter filter = TimeRangeFilter.between(start, now);
        
        ReadRecordsRequest<StepsRecord> req = new ReadRecordsRequest<>(
            JvmClassMappingKt.getKotlinClass(StepsRecord.class),
            filter,
            java.util.Collections.emptySet(),
            true, // ascending
            1000,
            null
        );

        performReadRecords(call, req, new ReadRecordsCallback<StepsRecord>() {
            @Override
            public void onSuccess(List<StepsRecord> records) {
                if (records.isEmpty()) {
                    call.resolve(createEmptyDataResult());
                    return;
                }
                
                // TASK 1: Diagnose incorrect step total
                android.util.Log.d("SALUS_HEALTH_CONNECT", "=== B2.4 STEPS DIAGNOSTICS ===");
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Number of records returned: " + records.size());
                
                long manualSum = 0;
                Set<String> distinctOrigins = new HashSet<>();
                
                for (StepsRecord r : records) {
                    String origin = r.getMetadata().getDataOrigin() != null ? r.getMetadata().getDataOrigin().getPackageName() : "null";
                    distinctOrigins.add(origin);
                    manualSum += r.getCount();
                    android.util.Log.d("SALUS_HEALTH_CONNECT", "Record -> Count: " + r.getCount() + 
                                       ", Start: " + r.getStartTime() + 
                                       ", End: " + r.getEndTime() + 
                                       ", Origin: " + origin);
                }
                
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Raw manual sum: " + manualSum);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Distinct data origins: " + distinctOrigins);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "==============================");

                // TASK 2: Use Health Connect aggregation semantics
                Set<AggregateMetric<Long>> metrics = new HashSet<>();
                metrics.add(StepsRecord.COUNT_TOTAL);
                AggregateRequest aggregateRequest = new AggregateRequest(metrics, filter, java.util.Collections.emptySet());

                Continuation<AggregationResult> aggregateCont = new Continuation<AggregationResult>() {
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }
                    @Override
                    public void resumeWith(Object res) {
                        try {
                            if (res != null && res.getClass().getName().contains("Result$Failure")) {
                                android.util.Log.e("SALUS_HEALTH_CONNECT", "Aggregate Failure: " + res);
                                call.reject("Error aggregating steps: " + res);
                                return;
                            }
                            if (res instanceof AggregationResult) {
                                AggregationResult aggRes = (AggregationResult) res;
                                Long totalSteps = aggRes.get(StepsRecord.COUNT_TOTAL);
                                
                                JSObject ret = new JSObject();
                                ret.put("available", true);
                                ret.put("hasPermission", true);
                                ret.put("hasData", totalSteps != null);
                                ret.put("value", totalSteps != null ? totalSteps : 0);
                                ret.put("unit", "steps");
                                Instant endOfDay = nowZ.plusDays(1).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant();
                                ret.put("startTime", start.toString());
                                ret.put("endTime", endOfDay.toString());
                                ret.put("source", "Health Connect Aggregated");
                                
                                android.util.Log.d("SALUS_HEALTH_CONNECT", "Aggregated Steps result: " + ret.toString());
                                call.resolve(ret);
                            } else {
                                call.reject("Unexpected result from aggregate: " + (res != null ? res.getClass().getName() : "null"));
                            }
                        } catch (Exception e) {
                            call.reject("Exception in aggregate: " + e.getMessage());
                        }
                    }
                };

                try {
                    HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
                    Object aggRet = client.aggregate(aggregateRequest, aggregateCont);
                    if (aggRet != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                        aggregateCont.resumeWith(aggRet);
                    }
                } catch (Exception e) {
                    call.reject("Error launching aggregate request: " + e.getMessage());
                }
            }

            @Override
            public void onError(Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("SecurityException")) {
                    call.resolve(createNoPermissionResult());
                } else {
                    call.reject("Error reading Steps: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void getLatestSpO2(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(createUnavailableResult());
            return;
        }

        Instant now = Instant.now();
        Instant start = now.minus(7, ChronoUnit.DAYS);
        TimeRangeFilter filter = TimeRangeFilter.between(start, now);
        
        ReadRecordsRequest<OxygenSaturationRecord> req = new ReadRecordsRequest<>(
            JvmClassMappingKt.getKotlinClass(OxygenSaturationRecord.class),
            filter,
            java.util.Collections.emptySet(),
            false, // descending to get latest first
            1,
            null
        );

        performReadRecords(call, req, new ReadRecordsCallback<OxygenSaturationRecord>() {
            @Override
            public void onSuccess(List<OxygenSaturationRecord> records) {
                if (records.isEmpty()) {
                    call.resolve(createEmptyDataResult());
                    return;
                }
                
                OxygenSaturationRecord record = records.get(0);
                double percentage = record.getPercentage().getValue();
                
                JSObject ret = new JSObject();
                ret.put("available", true);
                ret.put("hasPermission", true);
                ret.put("hasData", true);
                ret.put("value", percentage);
                ret.put("unit", "%");
                ret.put("startTime", record.getTime().toString());
                ret.put("endTime", record.getTime().toString());
                
                Metadata m = record.getMetadata();
                if (m.getDataOrigin() != null) {
                    ret.put("source", m.getDataOrigin().getPackageName());
                }
                if (m.getDevice() != null) {
                    String deviceName = m.getDevice().getManufacturer() + " " + m.getDevice().getModel();
                    ret.put("deviceName", deviceName.trim());
                }
                
                android.util.Log.d("SALUS_HEALTH_CONNECT", "SpO2 result: " + ret.toString());
                call.resolve(ret);
            }

            @Override
            public void onError(Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("SecurityException")) {
                    call.resolve(createNoPermissionResult());
                } else {
                    call.reject("Error reading SpO2: " + e.getMessage());
                }
            }
        });
    }

    @PluginMethod
    public void getSleepDuration(PluginCall call) {
        if (HealthConnectClient.getSdkStatus(getContext(), "com.google.android.apps.healthdata") != HealthConnectClient.SDK_AVAILABLE) {
            call.resolve(createUnavailableResult());
            return;
        }

        ZonedDateTime nowZ = ZonedDateTime.now(ZoneId.systemDefault());
        Instant now = nowZ.toInstant();

        ZonedDateTime sleepDayStart;
        ZonedDateTime nominalSleepDayEnd;
        Instant queryEnd;
        String calcType;

        if (nowZ.getHour() < 12) {
            // Before 12:00 PM: Active overnight sleep day
            sleepDayStart = nowZ.minusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0);
            nominalSleepDayEnd = nowZ.withHour(12).withMinute(0).withSecond(0).withNano(0);
            queryEnd = now; // Query up to current time
            calcType = "active_noon_to_now";
        } else {
            // At or after 12:00 PM: Display previous completed sleep day
            sleepDayStart = nowZ.minusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0);
            nominalSleepDayEnd = nowZ.withHour(12).withMinute(0).withSecond(0).withNano(0);
            queryEnd = nominalSleepDayEnd.toInstant(); // Query exactly up to today's noon
            calcType = "completed_noon_to_noon";
        }

        Instant queryStart = sleepDayStart.toInstant();

        TimeRangeFilter filter = TimeRangeFilter.between(queryStart, queryEnd);
        
        // 1. Diagnostic phase: Query raw SleepSessionRecords to log
        ReadRecordsRequest<SleepSessionRecord> req = new ReadRecordsRequest<>(
            JvmClassMappingKt.getKotlinClass(SleepSessionRecord.class),
            filter,
            java.util.Collections.emptySet(),
            true, // ascending
            100,
            null
        );

        performReadRecords(call, req, new ReadRecordsCallback<SleepSessionRecord>() {
            @Override
            public void onSuccess(List<SleepSessionRecord> records) {
                // TASK: Diagnostic logging of all sessions
                android.util.Log.d("SALUS_HEALTH_CONNECT", "=== B2.4 SLEEP DIAGNOSTICS ===");
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Dynamic sleep window start: " + sleepDayStart);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Nominal sleep window end: " + nominalSleepDayEnd);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Actual query end (now): " + nowZ);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Number of sleep records returned: " + records.size());
                
                long rawSumMinutes = 0;
                Set<String> distinctOrigins = new HashSet<>();
                
                for (SleepSessionRecord r : records) {
                    long durationMinutes = ChronoUnit.MINUTES.between(r.getStartTime(), r.getEndTime());
                    rawSumMinutes += durationMinutes;
                    String origin = r.getMetadata().getDataOrigin() != null ? r.getMetadata().getDataOrigin().getPackageName() : "null";
                    distinctOrigins.add(origin);
                    
                    android.util.Log.d("SALUS_HEALTH_CONNECT", "Sleep Record -> Duration: " + durationMinutes + "m" +
                                       ", Start: " + r.getStartTime() + 
                                       ", End: " + r.getEndTime() + 
                                       ", Origin: " + origin);
                }
                
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Naive raw duration sum: " + rawSumMinutes + "m");
                android.util.Log.d("SALUS_HEALTH_CONNECT", "Distinct data origins: " + distinctOrigins);
                android.util.Log.d("SALUS_HEALTH_CONNECT", "==============================");
                
                if (records.isEmpty()) {
                    call.resolve(createEmptyDataResult());
                    return;
                }

                // 2. Perform official aggregation
                Set<AggregateMetric<java.time.Duration>> metrics = new HashSet<>();
                metrics.add(SleepSessionRecord.SLEEP_DURATION_TOTAL);
                AggregateRequest aggregateRequest = new AggregateRequest(metrics, filter, java.util.Collections.emptySet());
                
                Continuation<AggregationResult> aggregateCont = new Continuation<AggregationResult>() {
                    @Override
                    public CoroutineContext getContext() {
                        return EmptyCoroutineContext.INSTANCE;
                    }
                    @Override
                    public void resumeWith(Object res) {
                        try {
                            if (res != null && res.getClass().getName().contains("Result$Failure")) {
                                android.util.Log.e("SALUS_HEALTH_CONNECT", "Aggregate Sleep Failure: " + res);
                                call.reject("Error aggregating sleep: " + res);
                                return;
                            }
                            if (res instanceof AggregationResult) {
                                AggregationResult aggRes = (AggregationResult) res;
                                java.time.Duration totalSleepDuration = aggRes.get(SleepSessionRecord.SLEEP_DURATION_TOTAL);
                                
                                long finalDurationMinutes = 0;
                                if (totalSleepDuration != null) {
                                    finalDurationMinutes = totalSleepDuration.toMinutes();
                                }
                                
                                JSObject ret = new JSObject();
                                ret.put("available", true);
                                ret.put("hasPermission", true);
                                ret.put("hasData", totalSleepDuration != null);
                                ret.put("value", finalDurationMinutes);
                                ret.put("unit", "minutes");
                                ret.put("sleepDayStart", queryStart.toString());
                                ret.put("nominalSleepDayEnd", nominalSleepDayEnd.toInstant().toString());
                                ret.put("queryEnd", queryEnd.toString());
                                ret.put("startTime", sleepDayStart.toInstant().toString());
                                ret.put("endTime", nominalSleepDayEnd.toInstant().toString());
                                ret.put("sessionCount", records.size());
                                ret.put("calculationType", calcType);
                                ret.put("usedFallbackWindow", false); // Not falling back, explicitly using completed day
                                ret.put("source", "Health Connect Aggregated Sleep");
                                
                                android.util.Log.d("SALUS_HEALTH_CONNECT", "Aggregated Sleep result: " + ret.toString());
                                call.resolve(ret);
                            } else {
                                call.reject("Unexpected result from sleep aggregate: " + (res != null ? res.getClass().getName() : "null"));
                            }
                        } catch (Exception e) {
                            call.reject("Exception in sleep aggregate: " + e.getMessage());
                        }
                    }
                };
                
                try {
                    HealthConnectClient client = HealthConnectClient.getOrCreate(getContext());
                    Object aggRet = client.aggregate(aggregateRequest, aggregateCont);
                    if (aggRet != IntrinsicsKt.getCOROUTINE_SUSPENDED()) {
                        aggregateCont.resumeWith(aggRet);
                    }
                } catch (Exception e) {
                    call.reject("Error launching sleep aggregate request: " + e.getMessage());
                }
            }

            @Override
            public void onError(Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("SecurityException")) {
                    call.resolve(createNoPermissionResult());
                } else {
                    call.reject("Error reading Sleep: " + e.getMessage());
                }
            }
        });
    }
}
