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
            // Start as a foreground service
            Notification notification = createNotification();
            startForeground(1, notification);

            // Action-based filter
            if (intent != null && "outsystems.dohle.FILO.GET_DB_FILE".equals(intent.getAction())) {
                String storeId = intent.getStringExtra("storeId");
                File baseDir = new File(getExternalFilesDir(null), "db");

                if (baseDir.exists() && baseDir.isDirectory()) {
                    File[] files = baseDir.listFiles((dir, name) -> name.endsWith(".db"));
                    if (files != null) {
                        File latestFile = null;
                        int maxVersion = -1;

                        for (File f : files) {
                            String name = f.getName();
                            if (name.matches("^" + storeId + "_[\\d\\-]+_(\\d+)\\.db$")) {
                                String[] parts = name.split("_|\\.");
                                int version = Integer.parseInt(parts[2]);

                                if (version > maxVersion) {
                                    maxVersion = version;
                                    latestFile = f;
                                }
                            }
                        }

                        if (latestFile != null) {
                            Uri uri = FileProvider.getUriForFile(
                                this,
                                getPackageName() + ".darryncampbell.cordova.plugin.intent.fileprovider",
                                latestFile
                            );

                            String targetPackage = intent.getStringExtra("targetPackage");
                            if (targetPackage == null || targetPackage.isEmpty()) {
                                Log.e(TAG, "❌ Missing targetPackage extra — cannot grant permission");
                                sendError("Missing targetPackage", "fileFound", false);
                                stopSelf();
                                return START_NOT_STICKY;
                            }

                            grantUriPermission(targetPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            Log.d(TAG, "Granted permission for appB");

                            Intent resultIntent = new Intent("outsystems.dohle.FILO.RETURN_DB_FILE");
                            resultIntent.putExtra("fileFound", true);
                            resultIntent.putExtra("filename", latestFile.getName());
                            resultIntent.putExtra("version", maxVersion);
                            resultIntent.putExtra("fileUri", uri);
                            resultIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            sendBroadcast(resultIntent);
                            Log.d(TAG, "Generated file URI: " + uri.toString());
                        } else {
                            sendError("No matching file found for identifier " + storeId, "fileFound", false);
                        }
                    }
                } else {
                    sendError("Base folder does not exist: " + baseDir.getAbsolutePath(), "fileFound", false);
                }

                /* 
                File file = new File(getExternalFilesDir(null), "products/db/teste_100_produtos.db");

                if (file.exists()) {
                    Uri uri = FileProvider.getUriForFile(
                        this,
                        getPackageName() + ".darryncampbell.cordova.plugin.intent.fileprovider",
                        file
                    );
                    
                    Log.d(TAG, "Generated file URI: " + uri.toString());
                    
                    String targetPackage = intent.getStringExtra("targetPackage");
                    if (targetPackage == null || targetPackage.isEmpty()) {
                        Log.e(TAG, "❌ Missing targetPackage extra — cannot grant permission");
                        sendError("Missing targetPackage", "fileFound", false);
                        stopSelf();
                        return START_NOT_STICKY;
                    }

                    // Explicitly grant URI permission
                    grantUriPermission(targetPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    Log.d(TAG, "Granted permission for appB");

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
