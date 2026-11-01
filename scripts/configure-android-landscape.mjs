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
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      getWindow().setFlags(
        android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN,
        android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN
      );
      // Landscape display cutouts otherwise reserve a blank vertical strip.
      // Extend the background behind the cutout; CSS uses safe-area insets for controls.
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
        android.view.WindowManager.LayoutParams params = getWindow().getAttributes();
        params.layoutInDisplayCutoutMode =
          android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        getWindow().setAttributes(params);
      }
    }`,
)
await writeFile(activityPath, immersiveActivity, 'utf8')
console.log('Sintra Glass: Android fullscreen viewport enabled')
