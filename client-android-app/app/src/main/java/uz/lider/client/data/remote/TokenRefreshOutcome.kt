package uz.lider.client.data.remote

enum class TokenRefreshOutcome {
    /** Yangi access token tayyor */
    SUCCESS,
    /** Refresh token yaroqsiz — sessiya tozalandi */
    AUTH_EXPIRED,
    /** Tarmoq/vaqtinchalik xato — sessiya saqlanadi */
    NETWORK_ERROR,
    /** Token yo‘q / refresh kerak emas */
    NO_SESSION,
}
