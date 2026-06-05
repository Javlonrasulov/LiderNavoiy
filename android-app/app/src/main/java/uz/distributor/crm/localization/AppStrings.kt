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
    fun refreshDone(lang: AppLanguage) = tr(lang, "Yangilandi", "Янгиланди", "Обновлено")
    fun refreshUpdatesTitle(lang: AppLanguage) = tr(lang, "Yangilanish natijasi", "Янгиланиш натижаси", "Результат обновления")
    fun refreshFirstDone(lang: AppLanguage) = tr(
        lang,
        "Ma'lumotlar muvaffaqiyatli yangilandi",
        "Маълумотлар муваффақиятли янгиланди",
        "Данные успешно обновлены",
    )
    fun noNewUpdates(lang: AppLanguage) = tr(
        lang,
        "Yangi o'zgarishlar yo'q — hamma narsa dolzarb",
        "Янги ўзгаришлар йўқ — ҳамма нарса долзарб",
        "Новых изменений нет — всё актуально",
    )
    fun newClientsAdded(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "Sizga $count ta yangi mijoz qo'shildi"
        AppLanguage.UZ_CYRILLIC -> "Сизга $count та янги мижоз қўшилди"
        AppLanguage.RUS -> "Вам добавлено клиентов: $count"
    }
    fun newProductsInWarehouse(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "Omborga $count ta yangi mahsulot kirim bo'ldi"
        AppLanguage.UZ_CYRILLIC -> "Омборга $count та янги маҳсулот кирим бўлди"
        AppLanguage.RUS -> "На склад поступило новых товаров: $count"
    }
    fun productsStockIncreased(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta mahsulot qoldig'i oshdi"
        AppLanguage.UZ_CYRILLIC -> "$count та маҳсулот қолдиғи ошди"
        AppLanguage.RUS -> "У $count товаров увеличился остаток"
    }
    fun newMessagesReceived(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta yangi xabar bor"
        AppLanguage.UZ_CYRILLIC -> "$count та янги хабар бор"
        AppLanguage.RUS -> "Новых сообщений: $count"
    }
    fun newNotificationsReceived(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta yangi bildirishnoma"
        AppLanguage.UZ_CYRILLIC -> "$count та янги билдиришнома"
        AppLanguage.RUS -> "Новых уведомлений: $count"
    }
    fun visitsUpdated(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta yangi vizit qayd etildi"
        AppLanguage.UZ_CYRILLIC -> "$count та янги визит қайд етилди"
        AppLanguage.RUS -> "Зафиксировано новых визитов: $count"
    }
    fun salesUpdated(lang: AppLanguage) = tr(lang, "Sotuvlar yangilandi", "Сотувлар янгиланди", "Продажи обновлены")
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
    fun msgLoadError(lang: AppLanguage) = tr(lang, "Serverga ulanib bo'lmadi", "Серверга уланиб бўлмади", "Не удалось подключиться к серверу")
    fun startChat(lang: AppLanguage) = tr(lang, "Suhbat boshlash", "Суҳбат бошлаш", "Начать чат")
    fun selectContact(lang: AppLanguage) = tr(lang, "Kontaktni tanlang", "Контактни танланг", "Выберите контакт")
    fun chatsTab(lang: AppLanguage) = tr(lang, "Suhbatlar", "Суҳбатлар", "Чаты")
    fun contactsTab(lang: AppLanguage) = tr(lang, "Kontaktlar", "Контактлар", "Контакты")
    fun noContacts(lang: AppLanguage) = tr(lang, "Kontakt topilmadi", "Контакт топилмади", "Контакты не найдены")
    fun searchContacts(lang: AppLanguage) = tr(lang, "Kontaktlarni qidirish", "Контактларни қидириш", "Поиск контактов")
    fun contactsCount(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta kontakt"
        AppLanguage.UZ_CYRILLIC -> "$count та контакт"
        AppLanguage.RUS -> if (count % 10 == 1 && count % 100 != 11) "$count контакт"
        else if (count % 10 in 2..4 && count % 100 !in 12..14) "$count контакта"
        else "$count контактов"
    }
    fun userRoleLabel(lang: AppLanguage, role: String) = when (role.lowercase()) {
        "admin" -> tr(lang, "Admin", "Админ", "Админ")
        "manager" -> tr(lang, "Menejer", "Менежер", "Менеджер")
        "distributor" -> tr(lang, "Agent", "Агент", "Агент")
        else -> role
    }
    fun serverHint(lang: AppLanguage, host: String) = when (lang) {
        AppLanguage.UZ_LATIN -> "Server: $host — telefonda local.properties da api.host=kompyuter IP"
        AppLanguage.UZ_CYRILLIC -> "Сервер: $host — телефонда api.host=компьютер IP"
        AppLanguage.RUS -> "Сервер: $host — на телефоне укажите api.host=IP компьютера"
    }
    fun chatPlaceholder(lang: AppLanguage) = tr(lang, "Xabar...", "Хабар...", "Сообщение...")
    fun attachPhoto(lang: AppLanguage) = tr(lang, "Rasm yoki video", "Расм ёки видео", "Фото или видео")
    fun attachDoc(lang: AppLanguage) = tr(lang, "Hujjat", "Ҳужжат", "Документ")
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

    fun addClientTitle(lang: AppLanguage) = tr(lang, "Yangi mijoz", "Янги мижоз", "Новый клиент")
    fun clientName(lang: AppLanguage) = tr(lang, "Ism (do'kon nomi)", "Исм (до'кон номи)", "Название")
    fun clientInn(lang: AppLanguage) = tr(lang, "INN", "ИНН", "ИНН")
    fun clientPhone(lang: AppLanguage) = tr(lang, "Telefon raqami", "Телефон рақами", "Номер телефона")
    fun clientLocation(lang: AppLanguage) = tr(lang, "Xaritada joyi", "Харитада жойи", "Место на карте")
    fun clientPhoto(lang: AppLanguage) = tr(lang, "Do'kon rasmi", "Дo'кон расми", "Фото магазина")
    fun useMyLocation(lang: AppLanguage) = tr(lang, "Mening joyim", "Менинг жойим", "Моё местоположение")
    fun tapMapHint(lang: AppLanguage) = tr(lang, "Xaritada bosing yoki pinni suring", "Харитада бosing ёки pinni suring", "Нажмите на карту или перетащите метку")
    fun selectPhoto(lang: AppLanguage) = tr(lang, "Rasm tanlash", "Расм танлаш", "Выбрать фото")
    fun takePhoto(lang: AppLanguage) = tr(lang, "Kamera", "Камера", "Камера")
    fun chooseFromGallery(lang: AppLanguage) = tr(lang, "Galereya", "Галерея", "Галерея")
    fun fullScreenMap(lang: AppLanguage) = tr(lang, "To'liq ekran", "Тўлиқ экран", "Полный экран")
    fun done(lang: AppLanguage) = tr(lang, "Tayyor", "Тайёр", "Готово")
    fun saveClient(lang: AppLanguage) = tr(lang, "Saqlash", "Сақлаш", "Сохранить")

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
