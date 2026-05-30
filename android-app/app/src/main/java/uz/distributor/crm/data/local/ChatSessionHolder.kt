package uz.distributor.crm.data.local

/** Ochiq chat ekrani — shu yerda popup ko'rsatilmaydi */
object ChatSessionHolder {
    @Volatile
    var openConversationId: String? = null
}
