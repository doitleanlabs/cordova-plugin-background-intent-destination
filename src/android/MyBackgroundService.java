package com.darryncampbell.cordova.plugin.intent;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

public class MyBackgroundService extends Service {

    private static final String TAG = "MyBackgroundService";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Background service started");

        // Required for foreground service
        Notification notification = createNotification();
        startForeground(1, notification);
        // You can read extras from the intent if needed
        if (intent != null && intent.hasExtra("exampleData")) {
            String data = intent.getStringExtra("exampleData");
            Log.d(TAG, "Received data: " + data);
        }

        Intent broadcastIntent = new Intent();
        broadcastIntent.setAction("outsystems.dohle.FILO.RETURN_DB_FILE");
        broadcastIntent.putExtra("result", "Here's your data from service!");
        sendBroadcast(broadcastIntent);

        stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Background service stopped");
        super.onDestroy();
    }
}
