package uz.lider.client.security

import okhttp3.CertificatePinner
import uz.lider.client.BuildConfig

object TlsPins {
    private const val HOST = "lider-navoiy.uz"
    private const val PIN_LEAF = "sha256/6N6Bv5vV7F5ofL7AwNA/AHoiY+XELtZUXkKu0THlOhw="
    private const val PIN_YE1 = "sha256/brzvtCELCIZUo4sD/qPX0ccRtPsd3DY6RfmxpOU9oB4="

    fun pinnerOrNull(): CertificatePinner? {
        if (BuildConfig.DEBUG) return null
        if (!BuildConfig.API_BASE_URL.contains(HOST)) return null
        return CertificatePinner.Builder()
            .add(HOST, PIN_LEAF, PIN_YE1)
            .add("www.$HOST", PIN_LEAF, PIN_YE1)
            .build()
    }
}
