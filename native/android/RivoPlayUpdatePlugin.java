package com.ribhlab.rivoscan;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import android.content.IntentSender;

/** Google Play controlled updates. Works only when Play provides an eligible update.
 *  Never downloads APKs from arbitrary URLs or deletes private user files.
 */
@CapacitorPlugin(name = "RivoPlayUpdate")
public class RivoPlayUpdatePlugin extends Plugin {
    private AppUpdateManager manager;
    private static final int REQUEST_PLAY_UPDATE=9413;

    @Override public void load() {
        manager=AppUpdateManagerFactory.create(getContext());
    }

    @PluginMethod public void requestOrganicReview(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                com.google.android.play.core.review.ReviewManager reviews =
                    com.google.android.play.core.review.ReviewManagerFactory.create(getContext());
                reviews.requestReviewFlow().addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) { call.resolve(); return; }
                    reviews.launchReviewFlow(getActivity(), task.getResult())
                        .addOnCompleteListener(ignored -> call.resolve());
                });
            } catch (RuntimeException error) { call.resolve(); }
        });
    }

    @PluginMethod public void openGrowthLink(PluginCall call) {
        String kind=call.getString("kind","");
        if (!"apps".equals(kind) && !"store".equals(kind)) { call.reject("Unsupported link"); return; }
        String url="apps".equals(kind)?"https://ribhlab.github.io/apps/":
            "https://play.google.com/store/apps/details?id=com.ribhlab.rivoscan";
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,
                    android.net.Uri.parse(url)));
                call.resolve();
            } catch (RuntimeException error) { call.reject("Unable to open link",error); }
        });
    }
    @PluginMethod public void check(PluginCall call) {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            final int state=info.updateAvailability();
            final boolean available=(state==UpdateAvailability.UPDATE_AVAILABLE ||
                state==UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
            JSObject result=new JSObject();
            result.put("available",available);
            result.put("inProgress",state==UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
            result.put("allowed",info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
            result.put("availableVersionCode",info.availableVersionCode());
            result.put("priority",info.updatePriority());
            call.resolve(result);
        }).addOnFailureListener(error -> {
            // Play Store missing, sideloads, offline devices: don't block existing documents.
            JSObject result=new JSObject();
            result.put("available",false);
            result.put("allowed",false);
            result.put("status","unavailable");
            call.resolve(result);
        });
    }

    @PluginMethod public void install(PluginCall call) {
        manager.getAppUpdateInfo().addOnSuccessListener(info -> {
            int availability=info.updateAvailability();
            if ((availability!=UpdateAvailability.UPDATE_AVAILABLE &&
                 availability!=UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) ||
                !info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                call.resolve(new JSObject().put("started",false));
                return;
            }
            try {
                boolean started=manager.startUpdateFlowForResult(
                    info,getActivity(),AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                    REQUEST_PLAY_UPDATE);
                call.resolve(new JSObject().put("started",started));
            } catch (IntentSender.SendIntentException | RuntimeException error) {
                call.reject("Google Play could not start the update",error);
            }
        }).addOnFailureListener(error -> call.reject("Google Play update check failed",error));
    }
}
