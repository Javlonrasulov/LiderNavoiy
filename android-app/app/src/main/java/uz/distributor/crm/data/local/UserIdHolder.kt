package uz.distributor.crm.data.local

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserIdHolder @Inject constructor() {
    @Volatile
    var userId: String? = null
}
