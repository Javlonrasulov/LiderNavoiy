package uz.lider.manager;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Kontent system bar ostiga chiqadi — insetlarni CSS orqali hisoblaymiz
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

    getWindow().getDecorView().post(this::attachInsetListener);
  }

  private void attachInsetListener() {
    if (getBridge() == null || getBridge().getWebView() == null) {
      getWindow().getDecorView().postDelayed(this::attachInsetListener, 50);
      return;
    }

    WebView webView = getBridge().getWebView();
    // Debug/update da eski JS cache qolib ketmasin
    webView.clearCache(true);
    webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);

    ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
      Insets bars = windowInsets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
      );
      Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
      float d = getResources().getDisplayMetrics().density;
      float top = bars.top / d;
      float bottom = bars.bottom / d;
      float left = bars.left / d;
      float right = bars.right / d;
      // Klaviatura balandligi (edge-to-edge da WebView o'zi qisqarmaydi)
      float imeBottom = ime.bottom / d;

      // Pastki tizim navigatsiyasi (gestura / 3 tugma) — 0 bo'lsa ham minimal bo'shliq
      float safeBottom = bottom > 0f ? bottom : 24f;

      String js = String.format(
        Locale.US,
        "(function(){" +
          "var r=document.documentElement;" +
          "r.style.setProperty('--safe-top','%.2fpx');" +
          "r.style.setProperty('--safe-bottom','%.2fpx');" +
          "r.style.setProperty('--safe-left','%.2fpx');" +
          "r.style.setProperty('--safe-right','%.2fpx');" +
          "r.style.setProperty('--ime-bottom','%.2fpx');" +
          "r.setAttribute('data-native-insets','1');" +
          "r.setAttribute('data-keyboard-open', %.2f > 40 ? '1' : '0');" +
        "})();",
        top, safeBottom, left, right, imeBottom, imeBottom
      );
      webView.evaluateJavascript(js, null);
      return windowInsets;
    });
    ViewCompat.requestApplyInsets(webView);
  }
}
