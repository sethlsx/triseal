package com.triseal.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import javax.net.ssl.HttpsURLConnection;

/** A local-only WebView with separately downloaded, verified web content. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String FEED = "https://raw.githubusercontent.com/sethlsx/triseal/mobile-channel/mobile-update.json";
    private static final int SHELL_VERSION = 1;
    private static final long MAX_ZIP = 20L * 1024 * 1024;
    private static final long MAX_EXPANDED = 64L * 1024 * 1024;
    private static final long CHECK_INTERVAL = 15L * 60 * 1000;
    private static final Object UPDATE_LOCK = new Object();
    private static final ExecutorService UPDATES = Executors.newSingleThreadExecutor();
    private static long lastCheck;
    private static boolean checking;

    private WebView webView;
    private File contentRoot;
    private boolean destroyed;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        synchronized (UPDATE_LOCK) {
            activatePending(this);
            contentRoot = validStoredBundle(this, preferences(this).getString("active", ""));
        }
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 27, 35));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSafeBrowsingEnabled(true);
        webView.setWebViewClient(new LocalClient());
        setContentView(webView);
        immersive();
        webView.loadUrl(ORIGIN + "/index.html");
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
        }
        immersive();
        checkForUpdate();
    }

    @Override protected void onPause() {
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override protected void onDestroy() {
        destroyed = true;
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    private boolean chinese() {
        return getResources().getConfiguration().getLocales().get(0).getLanguage().equals("zh");
    }

    private String text(String en, String zh) { return chinese() ? zh : en; }

    @Override public void onBackPressed() {
        File pending;
        synchronized (UPDATE_LOCK) {
            pending = validStoredBundle(this, preferences(this).getString("pending", ""));
        }
        AlertDialog.Builder dialog = new AlertDialog.Builder(this);
        if (pending != null) {
            dialog.setTitle(text("New version ready", "新版本已就绪"))
                .setMessage(text("Restart to use the downloaded update. Your last completed action is saved.",
                    "重新进入即可使用已下载的更新。上一次完成操作后的进度已保存。"))
                .setPositiveButton(text("Restart game", "重新进入"), (d, which) -> recreate())
                .setNegativeButton(text("Later", "稍后"), (d, which) -> immersive())
                .setNeutralButton(text("Close game", "退出游戏"), (d, which) -> finish());
        } else {
            dialog.setTitle("Triseal")
                .setMessage(text("Your progress is saved after each completed action.", "每次完成操作后会自动保存进度。"))
                .setPositiveButton(text("Keep playing", "继续游戏"), (d, which) -> immersive())
                .setNegativeButton(text("Close game", "退出游戏"), (d, which) -> finish());
        }
        dialog.setOnDismissListener(d -> immersive()).show();
    }

    private final class LocalClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !isLocal(request.getUrl());
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !isLocal(Uri.parse(url));
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!isLocal(request.getUrl()) || !"GET".equals(request.getMethod())) return error(403, "Forbidden");
            String path = request.getUrl().getPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            if (!path.startsWith("/")) return error(403, "Forbidden");
            path = path.substring(1);
            if (!safeRelativePath(path)) return error(403, "Forbidden");
            try {
                InputStream input;
                if (contentRoot == null) {
                    input = getAssets().open("www/" + path);
                } else {
                    File file = new File(contentRoot, path);
                    if (!file.getCanonicalPath().startsWith(contentRoot.getCanonicalPath() + File.separator)
                        || !file.isFile()) return error(404, "Not Found");
                    input = new FileInputStream(file);
                }
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-store");
                headers.put("X-Content-Type-Options", "nosniff");
                headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; "
                    + "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; "
                    + "font-src 'self'; connect-src 'none'; worker-src 'none'; child-src 'none'; "
                    + "object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
                return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", headers, input);
            } catch (IOException ignored) { return error(404, "Not Found"); }
        }
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
            && uri.getPort() == -1 && uri.getUserInfo() == null;
    }

    private static WebResourceResponse error(int status, String message) {
        return new WebResourceResponse("text/plain", "UTF-8", status, message,
            Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".ogg")) return "audio/ogg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private void checkForUpdate() {
        synchronized (UPDATE_LOCK) {
            long now = android.os.SystemClock.elapsedRealtime();
            if (checking || (lastCheck != 0 && now - lastCheck < CHECK_INTERVAL)) return;
            checking = true;
            lastCheck = now;
        }
        final Context context = getApplicationContext();
        UPDATES.execute(() -> {
            boolean ready = false;
            try { ready = downloadUpdate(context); }
            catch (Exception ignored) { /* Offline play remains available; retry on a later foreground. */ }
            finally { synchronized (UPDATE_LOCK) { checking = false; } }
            if (ready) new Handler(Looper.getMainLooper()).post(() -> {
                if (!destroyed && !isFinishing()) Toast.makeText(MainActivity.this,
                    text("Update downloaded. Reopen Triseal to play it, or press Back to restart.",
                        "更新已下载，下次进入时生效。也可按返回键重新进入。"), Toast.LENGTH_LONG).show();
            });
        });
    }

    private static boolean downloadUpdate(Context context) throws Exception {
        JSONObject feed;
        HttpsURLConnection connection = connect(FEED);
        try (InputStream input = connection.getInputStream()) {
            feed = new JSONObject(new String(readLimited(input, 32 * 1024), StandardCharsets.UTF_8));
        } finally { connection.disconnect(); }
        if (feed.getInt("schema") != 1 || feed.getInt("minShellVersion") < 1
            || feed.getInt("minShellVersion") > SHELL_VERSION) return false;
        String version = feed.getString("version");
        long sequence = feed.getLong("sequence");
        String sha256 = feed.getString("sha256");
        long bytes = feed.getLong("bytes");
        String url = feed.getString("url");
        if (!version.matches("[0-9a-f]{7,40}") || sequence <= 0 || !sha256.matches("[0-9a-f]{64}")
            || bytes <= 0 || bytes > MAX_ZIP || !validUpdateUrl(url, version)) return false;
        synchronized (UPDATE_LOCK) {
            BundleInfo bundled = readBundle(context, null);
            BundleInfo active = readBundle(context, validStoredBundle(context, preferences(context).getString("active", "")));
            File pendingRoot = validStoredBundle(context, preferences(context).getString("pending", ""));
            BundleInfo pending = pendingRoot == null ? null : readBundle(context, pendingRoot);
            if (notNewer(version, sequence, bundled) || notNewer(version, sequence, active)
                || notNewer(version, sequence, pending)) return false;
        }
        File updates = updateDirectory(context);
        File archive = new File(updates, "download.zip");
        File staging = new File(updates, "staging");
        deleteTree(staging);
        if (!staging.mkdirs()) throw new IOException("Could not create update staging directory");
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            connection = connect(url);
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(archive)) {
                long advertised = connection.getContentLengthLong();
                if (advertised > MAX_ZIP || (advertised >= 0 && advertised != bytes)) throw new IOException("Bundle length mismatch");
                byte[] buffer = new byte[16384];
                long total = 0;
                int count;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > bytes || total > MAX_ZIP) throw new IOException("Bundle too large");
                    digest.update(buffer, 0, count);
                    output.write(buffer, 0, count);
                }
                if (total != bytes) throw new IOException("Truncated bundle");
                output.getFD().sync();
            } finally { connection.disconnect(); }
            if (!hex(digest.digest()).equals(sha256)) throw new IOException("Bundle digest mismatch");
            extract(archive, staging);
            BundleInfo extracted = readBundle(context, staging);
            if (extracted == null || !version.equals(extracted.version) || sequence != extracted.sequence
                || feed.getInt("minShellVersion") != extracted.minShellVersion
                || !new File(staging, "index.html").isFile()) throw new IOException("Invalid bundle metadata");
            synchronized (UPDATE_LOCK) {
                String name = "bundle-" + version + "-" + sequence;
                File destination = new File(updates, name);
                if (destination.exists()) throw new IOException("Bundle directory already exists");
                if (!staging.renameTo(destination)) throw new IOException("Could not finalize update");
                if (!preferences(context).edit().putString("pending", name).commit()) {
                    deleteTree(destination);
                    throw new IOException("Could not save update selection");
                }
                prune(context);
            }
            return true;
        } finally {
            archive.delete();
            deleteTree(staging);
        }
    }

    private static boolean notNewer(String version, long sequence, BundleInfo info) {
        return info != null && (version.equals(info.version) || sequence <= info.sequence);
    }

    private static boolean validUpdateUrl(String url, String version) {
        Uri uri = Uri.parse(url);
        String path = uri.getPath();
        return "https".equals(uri.getScheme()) && "raw.githubusercontent.com".equals(uri.getHost())
            && uri.getPort() == -1 && uri.getUserInfo() == null && uri.getQuery() == null
            && uri.getFragment() == null && path != null
            && path.matches("/sethlsx/triseal/mobile-channel/updates/triseal-[0-9a-f]{40}\\.zip")
            && path.substring("/sethlsx/triseal/mobile-channel/updates/triseal-".length()).startsWith(version);
    }

    private static HttpsURLConnection connect(String url) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(url).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(12000);
        connection.setUseCaches(false);
        connection.setRequestProperty("User-Agent", "Triseal-Android/0.1.0");
        connection.setRequestProperty("Accept-Encoding", "identity");
        try {
            if (connection.getResponseCode() != 200) throw new IOException("Update endpoint unavailable");
            return connection;
        } catch (IOException failure) {
            connection.disconnect();
            throw failure;
        }
    }

    private static void extract(File archive, File destination) throws IOException {
        Set<String> paths = new HashSet<>();
        long total = 0;
        int files = 0;
        String root = destination.getCanonicalPath() + File.separator;
        try (ZipFile zip = new ZipFile(archive)) {
            Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String name = entry.getName();
                if (entry.isDirectory() && name.endsWith("/")) name = name.substring(0, name.length() - 1);
                if (!safeRelativePath(name) || !paths.add(name) || ++files > 500) throw new IOException("Unsafe bundle path");
                File output = new File(destination, name);
                if (!output.getCanonicalPath().startsWith(root)) throw new IOException("Bundle path escapes root");
                if (entry.isDirectory()) {
                    if (!output.isDirectory() && !output.mkdirs()) throw new IOException("Could not extract directory");
                    continue;
                }
                if (entry.getSize() > MAX_EXPANDED) throw new IOException("Bundle file too large");
                File parent = output.getParentFile();
                if (!parent.isDirectory() && !parent.mkdirs()) throw new IOException("Could not extract parent directory");
                // Zip attributes are never applied: even a symlink entry becomes a regular private file.
                try (InputStream input = zip.getInputStream(entry); FileOutputStream stream = new FileOutputStream(output)) {
                    byte[] buffer = new byte[16384];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_EXPANDED) throw new IOException("Expanded bundle too large");
                        stream.write(buffer, 0, count);
                    }
                    stream.getFD().sync();
                }
            }
        }
    }

    private static boolean safeRelativePath(String path) {
        if (path.isEmpty() || path.startsWith("/") || path.contains("\\") || path.contains("\u0000")
            || path.contains(":")) return false;
        for (String part : path.split("/", -1)) if (part.isEmpty() || part.equals(".") || part.equals("..")) return false;
        return true;
    }

    private static byte[] readLimited(InputStream input, int limit) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) {
            if (output.size() + count > limit) throw new IOException("Metadata too large");
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }

    private static String hex(byte[] bytes) {
        StringBuilder value = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) value.append(String.format(Locale.ROOT, "%02x", b & 255));
        return value.toString();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("content-updates", Context.MODE_PRIVATE);
    }

    private static File updateDirectory(Context context) {
        File directory = new File(context.getFilesDir(), "content-updates");
        directory.mkdirs();
        return directory;
    }

    private static File validStoredBundle(Context context, String name) {
        if (!name.matches("bundle-[0-9a-f]{7,40}-[0-9]+")) return null;
        File directory = new File(updateDirectory(context), name);
        return directory.isDirectory() && new File(directory, "index.html").isFile()
            && readBundle(context, directory) != null ? directory : null;
    }

    private static BundleInfo readBundle(Context context, File directory) {
        try (InputStream input = directory == null ? context.getAssets().open("www/bundle-version.json")
            : new FileInputStream(new File(directory, "bundle-version.json"))) {
            JSONObject json = new JSONObject(new String(readLimited(input, 32 * 1024), StandardCharsets.UTF_8));
            String version = json.getString("version");
            long sequence = json.getLong("sequence");
            int minShellVersion = json.getInt("minShellVersion");
            if (json.getInt("schema") != 1 || !version.matches("[0-9a-f]{7,40}") || sequence <= 0
                || minShellVersion < 1 || minShellVersion > SHELL_VERSION) return null;
            return new BundleInfo(version, sequence, minShellVersion);
        } catch (Exception ignored) { return null; }
    }

    private static void activatePending(Context context) {
        SharedPreferences prefs = preferences(context);
        String activeName = prefs.getString("active", "");
        File active = validStoredBundle(context, activeName);
        if (active == null && !activeName.isEmpty()) {
            String previous = prefs.getString("previous", "");
            active = validStoredBundle(context, previous);
            activeName = active == null ? "" : previous;
            prefs.edit().putString("active", activeName).remove("previous").commit();
        }
        String pendingName = prefs.getString("pending", "");
        File pending = validStoredBundle(context, pendingName);
        BundleInfo bundledInfo = readBundle(context, null);
        BundleInfo activeInfo = active == null ? null : readBundle(context, active);
        if (bundledInfo != null && activeInfo != null && bundledInfo.sequence > activeInfo.sequence) {
            activeName = "";
            activeInfo = bundledInfo;
            prefs.edit().remove("active").putString("previous", active.getName()).commit();
        }
        if (pending != null) {
            BundleInfo info = readBundle(context, pending);
            if (info != null && !notNewer(info.version, info.sequence, activeInfo)
                && !notNewer(info.version, info.sequence, bundledInfo)) {
                prefs.edit().putString("previous", activeName).putString("active", pendingName).remove("pending").commit();
            } else prefs.edit().remove("pending").commit();
        } else if (!pendingName.isEmpty()) prefs.edit().remove("pending").commit();
        prune(context);
    }

    private static void prune(Context context) {
        SharedPreferences prefs = preferences(context);
        Set<String> keep = new HashSet<>();
        keep.add(prefs.getString("active", ""));
        keep.add(prefs.getString("previous", ""));
        keep.add(prefs.getString("pending", ""));
        File[] entries = updateDirectory(context).listFiles();
        if (entries != null) for (File entry : entries) {
            if (entry.getName().startsWith("bundle-") && !keep.contains(entry.getName())) deleteTree(entry);
        }
    }

    private static void deleteTree(File entry) {
        File[] children = entry.listFiles();
        if (children != null) for (File child : children) deleteTree(child);
        entry.delete();
    }

    private static final class BundleInfo {
        final String version;
        final long sequence;
        final int minShellVersion;
        BundleInfo(String version, long sequence, int minShellVersion) {
            this.version = version;
            this.sequence = sequence;
            this.minShellVersion = minShellVersion;
        }
    }
}
