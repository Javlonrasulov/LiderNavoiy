package uz.lider.client.security

import okhttp3.Dns
import java.net.InetAddress
import java.net.UnknownHostException

/**
 * Wi‑Fi router baʼzan lider-navoiy.uz uchun eski NXDOMAIN cache qaytaradi.
 * Tizim DNS ishlamasa VPS IP ga fallback qiladi (SNI/hostname saqlanadi).
 */
object ApiDns : Dns {
    private val hosts = setOf("lider-navoiy.uz", "www.lider-navoiy.uz")
    private val fallbackIp = byteArrayOf(89, 39, 95, 41)

    override fun lookup(hostname: String): List<InetAddress> {
        return try {
            Dns.SYSTEM.lookup(hostname)
        } catch (e: UnknownHostException) {
            if (hostname in hosts) {
                listOf(InetAddress.getByAddress(hostname, fallbackIp))
            } else {
                throw e
            }
        }
    }
}
