package uz.distributor.crm.localization

import uz.distributor.crm.presentation.components.NavTab

object AppStrings {
    fun navLabel(tab: NavTab, lang: AppLanguage): String = when (tab) {
        NavTab.HOME -> tr(lang, "Asosiy", "Асосий", "Главная")
        NavTab.DELIVERY -> tr(lang, "Dostavka", "Доставка", "Доставка")
        NavTab.LOCATION -> tr(lang, "Locatsiya", "Локация", "Локация")
        NavTab.PLAN -> tr(lang, "Plan", "Режа", "План")
        NavTab.MESSAGES -> tr(lang, "Xabarlar", "Хабарлар", "Сообщения")
    }

    fun totalSales(lang: AppLanguage) = tr(lang, "Jami sotish", "Жами сотиш", "Общие продажи")
    fun sumCurrency(lang: AppLanguage) = "сум"
    fun add(lang: AppLanguage) = tr(lang, "Qo'shish", "Қўшиш", "Добавить")
    fun refresh(lang: AppLanguage) = tr(lang, "Yangilash", "Янгилаш", "Обновить")
    fun details(lang: AppLanguage) = tr(lang, "Batafsil", "Батафсил", "Детали")
    fun more(lang: AppLanguage) = tr(lang, "Ko'proq", "Кўпроқ", "Ещё")
    fun clientsList(lang: AppLanguage) = tr(lang, "Klientlar ro'yxati", "Клиентлар рўйхати", "Список клиентов")
    fun visitCount(lang: AppLanguage) = tr(lang, "Vizitlar soni", "Ташрифлар сони", "Количество визитов")
    fun products(lang: AppLanguage) = tr(lang, "Mahsulotlar", "Маҳсулотлар", "Товары")
    fun returns(lang: AppLanguage) = tr(lang, "Jami qayt.olish", "Жами қайт.олиш", "Общий возврат")
    fun cashPayments(lang: AppLanguage) = tr(lang, "To'lovlar - naqd", "Тўловлар - нақд", "Платежи - наличные")
    fun clickPayments(lang: AppLanguage) = tr(lang, "To'lovlar - klik", "Тўловлар - клик", "Платежи - клик")
    fun terminalPayments(lang: AppLanguage) = tr(lang, "To'lovlar - terminal", "Тўловлар - терминал", "Платежи - терминал")
    fun bonusStickers(lang: AppLanguage) = tr(lang, "Bonus stikerlar", "Бонус стикерлар", "Бонус стикеры")
    fun showAll(lang: AppLanguage) = tr(lang, "Hammasini ko'rish", "Ҳаммасини кўриш", "Смотреть все")
    fun hide(lang: AppLanguage) = tr(lang, "Yashirish", "Яшириш", "Скрыть")
    fun items(lang: AppLanguage) = tr(lang, "mahsulot", "маҳсулот", "товар")
    fun clientsListTitle(lang: AppLanguage) = clientsList(lang)

    fun planTitle(lang: AppLanguage) = navLabel(NavTab.PLAN, lang)
    fun myPlan(lang: AppLanguage) = tr(lang, "Mening rejam", "Менинг режам", "Мой план")
    fun allAgents(lang: AppLanguage) = tr(lang, "Barcha agentlar", "Барча агентлар", "Все агенты")
    fun totalPlan(lang: AppLanguage) = tr(lang, "Umumiy plan", "Умумий режа", "Общий план")
    fun completed(lang: AppLanguage) = tr(lang, "Bajarildi", "Бажарилди", "Выполнено")
    fun remaining(lang: AppLanguage) = tr(lang, "Qoldi", "Қолди", "Осталось")
    fun planLabel(lang: AppLanguage) = tr(lang, "Reja", "Режа", "План")
    fun statistics(lang: AppLanguage) = tr(lang, "Statistika", "Статистика", "Статистика")
    fun dayPeriod(lang: AppLanguage) = tr(lang, "Kun", "Кун", "День")
    fun weekPeriod(lang: AppLanguage) = tr(lang, "Hafta", "Ҳафта", "Неделя")
    fun monthPeriod(lang: AppLanguage) = tr(lang, "Oy", "Ой", "Месяц")
    fun sales(lang: AppLanguage) = tr(lang, "Sotildi", "Сотилди", "Продано")
    fun messagesTitle(lang: AppLanguage) = navLabel(NavTab.MESSAGES, lang)
    fun search(lang: AppLanguage) = tr(lang, "Qidirish...", "Қидириш...", "Поиск...")
    fun noChats(lang: AppLanguage) = tr(lang, "Xabar yo'q", "Хабар йўқ", "Нет сообщений")
    fun chatPlaceholder(lang: AppLanguage) = tr(lang, "Xabar...", "Хабар...", "Сообщение...")
    fun attachPhoto(lang: AppLanguage) = tr(lang, "Rasm yoki video", "Расм ёки видео", "Фото или видео")
    fun attachDoc(lang: AppLanguage) = tr(lang, "Hujjat", "Хujjat", "Документ")
    fun previewImage(lang: AppLanguage) = tr(lang, "Rasm", "Расм", "Фото")
    fun previewFile(lang: AppLanguage) = tr(lang, "Fayl", "Файл", "Файл")
    fun msgLoading(lang: AppLanguage) = tr(lang, "Yuklanmoqda...", "Юкланмоқda...", "Загрузка...")
    fun msgDelete(lang: AppLanguage) = tr(lang, "O'chirish", "Ўчириш", "Удалить")
    fun msgForward(lang: AppLanguage) = tr(lang, "Yuborish", "Юбориш", "Переслать")
    fun msgCancel(lang: AppLanguage) = tr(lang, "Bekor qilish", "Бекор қilish", "Отмена")
    fun msgDeleteConfirm(lang: AppLanguage) = tr(lang, "Ushbu xabarni o'chirish?", "Ушбу хabarni ўчириш?", "Удалить это сообщение?")
    fun msgDeleteForAll(lang: AppLanguage, name: String) = when (lang) {
        AppLanguage.UZ_LATIN -> "Shuningdek $name uchun ham o'chirish"
        AppLanguage.UZ_CYRILLIC -> "Шунингdek $name учун ҳам ўчириш"
        AppLanguage.RUS -> "Также удалить для $name"
    }
    fun todayClients(lang: AppLanguage) = tr(lang, "Bugungi klientlar", "Бугунги клиентлар", "Сегодняшние клиенты")
    fun allClients(lang: AppLanguage) = tr(lang, "Barchasi", "Барчаси", "Все")
    fun debt(lang: AppLanguage) = tr(lang, "Qarz", "Қарз", "Долг")
    fun lastVisit(lang: AppLanguage) = tr(lang, "Oxirgi tashrif", "Охирги ташриф", "Последний визит")
    fun openNavigator(lang: AppLanguage) = tr(lang, "Navigator ochish", "Навигатор очиш", "Открыть навигатор")
    fun viewImage(lang: AppLanguage) = tr(lang, "Rasmi", "Расми", "Фото")

    fun loginTitle(lang: AppLanguage) = "Lider Navoiy"
    fun loginSubtitle(lang: AppLanguage) = tr(lang, "Agent kirish", "Агент кириш", "Вход агента")
    fun loginField(lang: AppLanguage) = "Login"
    fun password(lang: AppLanguage) = tr(lang, "Parol", "Парол", "Пароль")
    fun showPassword(lang: AppLanguage) = tr(lang, "Parolni ko'rish", "Паролни кўриш", "Показать пароль")
    fun loginButton(lang: AppLanguage) = tr(lang, "Kirish", "Кириш", "Войти")
    fun loginError(lang: AppLanguage) = tr(lang, "Kirish xatosi", "Кириш хатоси", "Ошибка входа")
    fun clientTitle(lang: AppLanguage) = tr(lang, "Klient", "Клиент", "Клиент")
    fun balance(lang: AppLanguage) = tr(lang, "Balans", "Баланс", "Баланс")
    fun startVisit(lang: AppLanguage) = tr(lang, "Vizit boshlash", "Ташриф бошлаш", "Начать визит")
    fun clientNotFound(lang: AppLanguage) = tr(lang, "Klient topilmadi", "Клиент топилмади", "Клиент не найден")
    fun visitProducts(lang: AppLanguage) = tr(lang, "Vizit — Mahsulotlar", "Ташриф — Маҳсулотлар", "Визит — Товары")
    fun reload(lang: AppLanguage) = tr(lang, "Qayta yuklash", "Қайта юклаш", "Перезагрузить")
    fun noProductsInCategory(lang: AppLanguage) = tr(lang, "Bu kategoriyada mahsulot yo'q", "Бу категорияда маҳсулот йўқ", "В этой категории нет товаров")
    fun order(lang: AppLanguage) = tr(lang, "Buyurtma", "Буюртма", "Заказ")
    fun confirm(lang: AppLanguage) = tr(lang, "Tasdiqlash", "Тасдиқлаш", "Подтвердить")
    fun total(lang: AppLanguage) = tr(lang, "Jami", "Жами", "Итого")
    fun orderSent(lang: AppLanguage) = tr(lang, "Buyurtma yuborildi!", "Буюртма юборилди!", "Заказ отправлен!")
    fun backToHome(lang: AppLanguage) = tr(lang, "Asosiy sahifaga", "Асосий саҳифага", "На главную")
    fun logout(lang: AppLanguage) = tr(lang, "Chiqish", "Чиқиш", "Выйти")
    fun todaySales(lang: AppLanguage) = tr(lang, "Bugungi savdo", "Бугунги савдо", "Продажи за день")
    fun weekSales(lang: AppLanguage) = tr(lang, "Haftalik savdo", "Ҳафталик савдо", "Продажи за неделю")
    fun monthSales(lang: AppLanguage) = tr(lang, "Oylik savdo", "Ойлик савдо", "Продажи за месяц")

    fun dayName(dayOfWeek: Int, lang: AppLanguage): String {
        val names = when (lang) {
            AppLanguage.RUS -> arrayOf("Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота")
            AppLanguage.UZ_CYRILLIC -> arrayOf("Якшанба", "Душанба", "Сешанба", "Чоршанба", "Пайшанба", "Жума", "Шанба")
            AppLanguage.UZ_LATIN -> arrayOf("Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba")
        }
        return names[dayOfWeek % 7]
    }

    private fun tr(lang: AppLanguage, latin: String, cyrillic: String, russian: String): String =
        when (lang) {
            AppLanguage.UZ_LATIN -> latin
            AppLanguage.UZ_CYRILLIC -> cyrillic
            AppLanguage.RUS -> russian
        }
}
