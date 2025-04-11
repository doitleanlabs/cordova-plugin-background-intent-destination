package com.darryncampbell.cordova.plugin.intent;

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Base64;
import android.util.Log;
import android.net.Uri;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

import java.io.File;

public class MyBackgroundService extends Service {

    private static final String TAG = "MyBackgroundService";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Background service started");

        try {
            // ✅ Start as a foreground service
            Notification notification = createNotification();
            startForeground(1, notification);

            // ✅ Action-based filter
            if (intent != null && "outsystems.dohle.FILO.GET_DB_FILE".equals(intent.getAction())) {

                File file = new File(getExternalFilesDir(null), "products/db/teste_100_produtos.db");

                if (file.exists()) {
                    Uri uri = FileProvider.getUriForFile(
                        this,
                        getPackageName() + ".darryncampbell.cordova.plugin.intent.fileprovider",
                        file
                    );
                
                    Log.d(TAG, "Generated file URI: " + uri.toString());
                
                    Intent resultIntent = new Intent("outsystems.dohle.FILO.RETURN_DB_FILE");
                    resultIntent.putExtra("fileFound", true);
                    resultIntent.putExtra("filename", file.getName());
                    resultIntent.putExtra("fileUri", uri);
                    resultIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); // necessary for AppB to access
                    sendBroadcast(resultIntent);
                } else {
                    Log.e(TAG, "File does not exist: " + file.getAbsolutePath());
                    sendError("File not found at: " + file.getAbsolutePath(), "fileFound", false);
                }
                
                /*
                FILE AS BASE64
                if (file.exists()) {
                    byte[] bytes = Files.readAllBytes(file.toPath());
                    Log.d(TAG, "Bytes read: " + bytes.length);
                    
                    String b64 = Base64.encodeToString(bytes, Base64.NO_WRAP);
                    Log.d(TAG, "Base64 length: " + b64.length());

                    Intent resultIntent = new Intent("outsystems.dohle.FILO.RETURN_DB_FILE");
                    resultIntent.putExtra("fileFound", true);
                    resultIntent.putExtra("filename", file.getName());
                    resultIntent.putExtra("base64", b64);
                    sendBroadcast(resultIntent);
                } else {
                    Log.e(TAG, "File does not exist: " + file.getAbsolutePath());
                    sendError("File not found at: " + file.getAbsolutePath(), "fileFound", false);
                }
                */

            } else {
                Log.w(TAG, "Received unknown or no action. Ignoring.");
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to read file", e);
            sendError("Error getting database file: " + e.getMessage());
        } finally {
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Background service stopped");
        super.onDestroy();
    }

    private Notification createNotification() {
        String channelId = "FILO_CHANNEL";
        String channelName = "FILO Background Tasks";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        return new NotificationCompat.Builder(this, channelId)
            .setContentTitle("FILO Background Service")
            .setContentText("Working in background...")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .build();
    }

    private void sendError(String message, Object... extras) {
        Intent errorIntent = new Intent("outsystems.dohle.FILO.RETURN_DB_FILE");
        errorIntent.putExtra("error", message);

        // Add optional extras (expects key-value pairs)
        if (extras != null && extras.length % 2 == 0) {
            for (int i = 0; i < extras.length; i += 2) {
                String key = String.valueOf(extras[i]);
                Object value = extras[i + 1];
                if (value instanceof Boolean) {
                    errorIntent.putExtra(key, (Boolean) value);
                } else if (value instanceof Integer) {
                    errorIntent.putExtra(key, (Integer) value);
                } else if (value instanceof Long) {
                    errorIntent.putExtra(key, (Long) value);
                } else if (value instanceof Float) {
                    errorIntent.putExtra(key, (Float) value);
                } else if (value instanceof Double) {
                    errorIntent.putExtra(key, (Double) value);
                } else {
                    errorIntent.putExtra(key, String.valueOf(value));
                }
            }
        }

        sendBroadcast(errorIntent);
    }
}
