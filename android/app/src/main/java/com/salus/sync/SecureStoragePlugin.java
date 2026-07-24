package com.salus.sync;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureStorage")
public class SecureStoragePlugin extends Plugin {

    private static final String PREFS_NAME = "salus_secure_prefs";
    private static final String KEY_SESSION = "secure_session";
    private static final String KEYSTORE_ALIAS = "salus_session_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String AES_GCM_NOPADDING = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // in bits

    private SecretKey getOrCreateKey() throws GeneralSecurityException {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (!keyStore.containsAlias(KEYSTORE_ALIAS)) {
                KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
                KeyGenParameterSpec keySpec = new KeyGenParameterSpec.Builder(
                        KEYSTORE_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .build();
                keyGenerator.init(keySpec);
                return keyGenerator.generateKey();
            }
            return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEYSTORE_ALIAS, null)).getSecretKey();
        } catch (Exception e) {
            throw new GeneralSecurityException("Failed to access Keystore", e);
        }
    }

    private String encrypt(String plaintext) throws GeneralSecurityException {
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance(AES_GCM_NOPADDING);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        String ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP);
        String ciphertextBase64 = Base64.encodeToString(ciphertext, Base64.NO_WRAP);
        return ivBase64 + ":" + ciphertextBase64;
    }

    private String decrypt(String encryptedData) throws GeneralSecurityException {
        String[] parts = encryptedData.split(":");
        if (parts.length != 2) {
            throw new GeneralSecurityException("Malformed ciphertext format");
        }
        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
        
        SecretKey key = getOrCreateKey();
        Cipher cipher = Cipher.getInstance(AES_GCM_NOPADDING);
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, key, spec);
        byte[] plaintext = cipher.doFinal(ciphertext);
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void getSession(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String encryptedSession = prefs.getString(KEY_SESSION, null);
            if (encryptedSession == null || encryptedSession.equals("INVALID") || encryptedSession.isEmpty()) {
                call.resolve(new JSObject()); // No session or invalidated session -> return empty object to indicate null/no session
                return;
            }
            
            try {
                String plaintext = decrypt(encryptedSession);
                JSObject ret = new JSObject();
                ret.put("value", plaintext);
                call.resolve(ret);
            } catch (GeneralSecurityException e) {
                // Malformed or undecryptable ciphertext -> delete and treat as logged out
                prefs.edit().remove(KEY_SESSION).apply();
                call.resolve(new JSObject());
            }
        } catch (Exception e) {
            call.reject("Failed to retrieve session", e);
        }
    }

    @PluginMethod
    public void setSession(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("Value must be provided");
            return;
        }

        try {
            String encrypted = encrypt(value);
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean success = prefs.edit().putString(KEY_SESSION, encrypted).commit();
            if (!success) {
                call.reject("Failed to commit to SharedPreferences");
                return;
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure storage unavailable", e);
        }
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean success = prefs.edit().remove(KEY_SESSION).commit();
        if (!success) {
            // Overwrite fallback if remove fails
            boolean overwriteSuccess = prefs.edit().putString(KEY_SESSION, "INVALID").commit();
            if (!overwriteSuccess) {
                call.reject("Device storage error during logout, please clear app data");
                return;
            }
        }
        call.resolve();
    }
}
