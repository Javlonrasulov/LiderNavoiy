package uz.lider.client.data.local

/** Ochiq chat ekrani — shu suhbat uchun push bildirishnoma ko‘rsatilmaydi. */
object ChatSessionHolder {
    @Volatile
    var openConversationId: String? = null
}
