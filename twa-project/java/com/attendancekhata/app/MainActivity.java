package com.attendancekhata.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.Window;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;
    private ProgressBar progressBar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        RelativeLayout layout = new RelativeLayout(this);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setId(1);
        progressBar.setMax(100);
        progressBar.setBackgroundColor(Color.parseColor("#2563eb"));
        RelativeLayout.LayoutParams pp = new RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT, 8);
        pp.addRule(RelativeLayout.ALIGN_PARENT_TOP);
        layout.addView(progressBar, pp);

        webView = new WebView(this);
        RelativeLayout.LayoutParams wp = new RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT,
            RelativeLayout.LayoutParams.MATCH_PARENT);
        wp.addRule(RelativeLayout.BELOW, progressBar.getId());
        layout.addView(webView, wp);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setDatabaseEnabled(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.setWebViewClient(new MyWebViewClient());
        webView.setWebChromeClient(new MyWebChromeClient(progressBar));

        webView.loadUrl("https://my-project-alpha-bice.vercel.app");
        setContentView(layout);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    static class MyWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String host = request.getUrl().getHost();
            if (host != null && (
                host.contains("vercel.app") ||
                host.contains("nominatim.openstreetmap.org") ||
                host.contains("ip-api.com") ||
                host.contains("ipapi.co") ||
                host.contains("openstreetmap.org")
            )) {
                return false;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, request.getUrl());
            view.getContext().startActivity(intent);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
        }
    }

    static class MyWebChromeClient extends WebChromeClient {
        private ProgressBar progressBar;

        MyWebChromeClient(ProgressBar pb) {
            this.progressBar = pb;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (progressBar != null) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(ProgressBar.GONE);
                }
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, true, false);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.grant(request.getResources());
        }
    }
}