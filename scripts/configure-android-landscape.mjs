import { readFile, writeFile } from 'node:fs/promises'

const manifestPath = new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url)
const text = await readFile(manifestPath, 'utf8')
if (!text.includes('<activity')) throw new Error('Missing Android activity')
const changed = text.includes('android:screenOrientation=')
  ? text.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="landscape"')
  : text.replace('<activity', '<activity android:screenOrientation="landscape"')
if (!changed.includes('android:screenOrientation="landscape"')) throw new Error('Cannot set landscape mode')
await writeFile(manifestPath, changed, 'utf8')
console.log('Sintra Glass: Android landscape orientation set')

/* Use all available Android landscape height instead of reserving a status bar.
   Preserve the system gesture-navigation bar and the camera-cutout safe area. */
const activityPath = new URL('../android/app/src/main/java/pl/sintraglass/game/MainActivity.java', import.meta.url)
const activity = await readFile(activityPath, 'utf8')
if (!activity.includes('public class MainActivity extends BridgeActivity {')) {
  throw new Error('Unexpected Capacitor MainActivity structure; verify fullscreen integration')
}
const immersiveActivity = activity.replace(
  'public class MainActivity extends BridgeActivity {',
  `public class MainActivity extends BridgeActivity {
    private void applyImmersiveMode() {
      final android.view.Window window = getWindow();
      final android.view.View decor = window.getDecorView();
      // Treat the entire display as app space; cutouts are handled by CSS.
      window.setFlags(
        android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN,
        android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN
      );
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
        android.view.WindowManager.LayoutParams params = window.getAttributes();
        params.layoutInDisplayCutoutMode =
          android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R
            ? android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            : android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        window.setAttributes(params);
      }
      // Legacy immersive-sticky flags remain a fallback for older WebViews.
      decor.setSystemUiVisibility(
        android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
        | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
      );
      // On Android 11+, explicit insets control is needed: FLAG_FULLSCREEN
      // alone can leave transparent clock/status icons over the game.
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
        window.setDecorFitsSystemWindows(false);
        android.view.WindowInsetsController bars = window.getInsetsController();
        if (bars != null) {
          bars.setSystemBarsBehavior(
            android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
          );
          bars.hide(android.view.WindowInsets.Type.systemBars());
        }
      }
    }

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      applyImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
      super.onWindowFocusChanged(hasFocus);
      if (hasFocus) applyImmersiveMode();
    }

    @Override
    public void onResume() {
      super.onResume();
      applyImmersiveMode();
    }`,
)
await writeFile(activityPath, immersiveActivity, 'utf8')
console.log('Sintra Glass: Android fullscreen viewport enabled')
