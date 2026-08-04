package uz.lider.client.security

import okhttp3.Dns
import java.net.InetAddress
import java.net.UnknownHostException

/**
 * Wi‑Fi router baʼzan lider-navoiy.uz uchun eski NXDOMAIN / noto‘g‘ri IP qaytaradi.
 * VPS IP ni birinchi qilib qo‘yamiz — API va rasmlar bir xil hostga boradi.
 */
object ApiDns : Dns {
    private val hosts = setOf("lider-navoiy.uz", "www.lider-navoiy.uz")
    private val fallbackIp = byteArrayOf(89, 39, 95, 41)

    override fun lookup(hostname: String): List<InetAddress> {
        if (hostname !in hosts) {
            return Dns.SYSTEM.lookup(hostname)
        }
        val fallback = InetAddress.getByAddress(hostname, fallbackIp)
        return try {
            val system = Dns.SYSTEM.lookup(hostname)
            val rest = system.filterNot { it.hostAddress == fallback.hostAddress }
            listOf(fallback) + rest
        } catch (_: UnknownHostException) {
            listOf(fallback)
        }
    }
}
