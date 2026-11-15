package br.fofo.minimundo;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // tela sempre ligada enquanto joga
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // desenha atrás das barras do sistema (tela cheia de verdade)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        hideBars();

        WebView wv = getBridge().getWebView();
        if (wv != null) {
            wv.setBackgroundColor(0xFFFFE8F0);
            // som e vídeo podem tocar sem gesto extra
            wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
    }

    private void hideBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (c != null) {
            c.hide(WindowInsetsCompat.Type.systemBars());
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }
}
