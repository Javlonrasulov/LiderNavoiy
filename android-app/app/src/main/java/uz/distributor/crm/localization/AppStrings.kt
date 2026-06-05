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
        "Yangi o'zgarishlar yo'q",
        "Янги ўзгаришлар йўқ",
        "Новых изменений нет",
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

    fun productsAddedNames(lang: AppLanguage, names: List<String>) = when (lang) {
        AppLanguage.UZ_LATIN -> "Yangi mahsulotlar qo'shildi: ${formatProductNames(names)}"
        AppLanguage.UZ_CYRILLIC -> "Янги маҳсулотлар қўшилди: ${formatProductNames(names)}"
        AppLanguage.RUS -> "Добавлены товары: ${formatProductNames(names)}"
    }

    fun productsRemovedNames(lang: AppLanguage, names: List<String>) = when (lang) {
        AppLanguage.UZ_LATIN -> "Mahsulotlar kamaydi: ${formatProductNames(names)}"
        AppLanguage.UZ_CYRILLIC -> "Маҳсулотлар камайди: ${formatProductNames(names)}"
        AppLanguage.RUS -> "Товары убраны: ${formatProductNames(names)}"
    }

    fun productsStockIncreasedNames(lang: AppLanguage, names: List<String>) = when (lang) {
        AppLanguage.UZ_LATIN -> "Qoldiq oshdi: ${formatProductNames(names)}"
        AppLanguage.UZ_CYRILLIC -> "Қолдиқ ошди: ${formatProductNames(names)}"
        AppLanguage.RUS -> "Остаток увеличился: ${formatProductNames(names)}"
    }

    fun productsStockDecreasedNames(lang: AppLanguage, names: List<String>) = when (lang) {
        AppLanguage.UZ_LATIN -> "Qoldiq kamaydi: ${formatProductNames(names)}"
        AppLanguage.UZ_CYRILLIC -> "Қолдиқ камайди: ${formatProductNames(names)}"
        AppLanguage.RUS -> "Остаток уменьшился: ${formatProductNames(names)}"
    }

    private fun formatProductNames(names: List<String>, max: Int = 5): String {
        if (names.isEmpty()) return ""
        val head = names.take(max).joinToString(", ")
        return if (names.size > max) "$head, +${names.size - max}" else head
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
    fun tabSchedule(lang: AppLanguage) = tr(lang, "Grafik", "График", "График")
    fun tabRouteDrops(lang: AppLanguage) = tr(lang, "Graf tashlari", "Граф ташлари", "Граф точки")
    fun tabSearchClients(lang: AppLanguage) = tr(lang, "Qidiruv", "Қидирув", "Поиск")
    fun searchClientHint(lang: AppLanguage) = tr(
        lang,
        "Klient nomi yoki kodi...",
        "Клиент номи ёки kodi...",
        "Имя или код клиента...",
    )

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
    fun allProducts(lang: AppLanguage) = tr(lang, "Barchasi", "Барчаси", "Все")
    fun productsTotalCount(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta mahsulot"
        AppLanguage.UZ_CYRILLIC -> "$count та маҳсулот"
        AppLanguage.RUS -> if (count % 10 == 1 && count % 100 != 11) "$count товар"
        else if (count % 10 in 2..4 && count % 100 !in 12..14) "$count товара"
        else "$count товаров"
    }
    fun productAvailable(lang: AppLanguage) = tr(lang, "Mavjud", "Mavjud", "В наличии")
    fun productColCode(lang: AppLanguage) = tr(lang, "Kod", "Kod", "Код")
    fun productColName(lang: AppLanguage) = tr(lang, "Mahsulot", "Mahsulot", "Товар")
    fun productColBrand(lang: AppLanguage) = tr(lang, "Brend", "Brend", "Бренд")
    fun productColPrice(lang: AppLanguage) = tr(lang, "Narx", "Narx", "Цена")
    fun productColUnit(lang: AppLanguage) = tr(lang, "O'lchov", "O'lchov", "Ед.")
    fun productUnitsPerPack(lang: AppLanguage) = tr(lang, "sht. up", "шт.уп", "шт.уп")
    fun productNetto(lang: AppLanguage) = "Netto"
    fun productBrutto(lang: AppLanguage) = "Brutto"
    fun productStockBalance(lang: AppLanguage) = tr(lang, "Qoldiq", "Қолдиқ", "Остаток")
    fun productSomShort(lang: AppLanguage) = tr(lang, "so'm", "сўм", "сум")
    fun debt(lang: AppLanguage) = tr(lang, "Qarz", "Қарз", "Долг")
    fun lastVisit(lang: AppLanguage) = tr(lang, "Oxirgi tashrif", "Охирги ташриф", "Последний визит")
    fun lastOrder(lang: AppLanguage) = tr(lang, "Oxirgi buyurtma", "Охирги буюртма", "Последний заказ")
    fun openNavigator(lang: AppLanguage) = tr(lang, "Navigator ochish", "Навигатор очиш", "Открыть навигатор")
    fun viewImage(lang: AppLanguage) = tr(lang, "Rasmi", "Расми", "Фото")

    fun loginTitle(lang: AppLanguage) = "Lider Navoiy"
    fun loginSubtitle(lang: AppLanguage) = tr(lang, "Agent kirish", "Агент кириш", "Вход агента")
    fun loginField(lang: AppLanguage) = "Login"
    fun password(lang: AppLanguage) = tr(lang, "Parol", "Парол", "Пароль")
    fun showPassword(lang: AppLanguage) = tr(lang, "Parolni ko'rish", "Паролни кўриш", "Показать пароль")
    fun loginButton(lang: AppLanguage) = tr(lang, "Kirish", "Кириш", "Войти")
    fun loginError(lang: AppLanguage) = tr(lang, "Kirish xatosi", "Кириш хатоси", "Ошибка входа")
    fun errorInvalidCredentials(lang: AppLanguage) = tr(
        lang,
        "Login yoki parol noto'g'ri",
        "Логин ёки парол нотўғри",
        "Неверный логин или пароль",
    )
    fun errorCredentialsRequired(lang: AppLanguage) = tr(
        lang,
        "Login va parolni kiriting",
        "Логин ва паролни киритинг",
        "Введите логин и пароль",
    )
    fun errorProductsLoadFailed(lang: AppLanguage) = tr(
        lang,
        "Mahsulotlar yuklanmadi. Internet yoki serverni tekshiring",
        "Маҳсулотлар юкланмади. Инternet ёки серверни текширинг",
        "Не удалось загрузить товары. Проверьте интернет или сервер",
    )
    fun errorProductsNotFound(lang: AppLanguage) = tr(
        lang,
        "Mahsulotlar topilmadi",
        "Маҳсулотлар топилмади",
        "Товары не найдены",
    )

    fun apiError(lang: AppLanguage, key: String): String = when (key) {
        "invalid_credentials" -> errorInvalidCredentials(lang)
        "credentials_required" -> errorCredentialsRequired(lang)
        "invalid_current_password" -> errorInvalidCurrentPassword(lang)
        "password_mismatch" -> errorPasswordMismatch(lang)
        "password_too_short" -> errorPasswordTooShort(lang)
        "current_password_required" -> errorCurrentPasswordRequired(lang)
        "network_error" -> msgLoadError(lang)
        "server_error" -> errorServer(lang)
        "unauthorized" -> errorUnauthorized(lang)
        "location_failed" -> errorLocationFailed(lang)
        "save_failed" -> errorSaveFailed(lang)
        "inn_client_exists" -> errorInnClientExists(lang)
        "inn_request_exists" -> errorInnRequestExists(lang)
        "lines_load_failed" -> errorLinesLoadFailed(lang)
        "products_load_failed" -> errorProductsLoadFailed(lang)
        "products_not_found" -> errorProductsNotFound(lang)
        else -> errorSaveFailed(lang)
    }

    fun profileError(lang: AppLanguage, key: String): String = apiError(lang, key)
    fun clientTitle(lang: AppLanguage) = tr(lang, "Klient", "Клиент", "Клиент")
    fun balance(lang: AppLanguage) = tr(lang, "Balans", "Баланс", "Баланс")
    fun startVisit(lang: AppLanguage) = tr(lang, "Vizit boshlash", "Ташриф бошлаш", "Начать визит")
    fun visitShort(lang: AppLanguage) = tr(lang, "Vizit", "Ташриф", "Визит")
    fun reconciliation(lang: AppLanguage) = tr(lang, "Sverka", "Сверка", "Сверка")
    fun reconciliationDocTitle(lang: AppLanguage) = tr(
        lang,
        "Hisoblashuv dalolatnomasi",
        "Ҳisoblashuv dalolatnomasi",
        "Акт сверки",
    )
    fun periodLabel(lang: AppLanguage) = tr(lang, "Davr", "Davr", "Период")
    fun colDate(lang: AppLanguage) = tr(lang, "Sana", "Sana", "Дата")
    fun colOperation(lang: AppLanguage) = tr(lang, "Operatsiya", "Operatsiya", "Операция")
    fun colDebit(lang: AppLanguage) = tr(lang, "Debet", "Debet", "Дебет")
    fun colCredit(lang: AppLanguage) = tr(lang, "Kredit", "Kredit", "Кредит")
    fun totalTurnover(lang: AppLanguage) = tr(lang, "Jami oborot", "Jami oborot", "Итого оборот")
    fun debtAmount(lang: AppLanguage, amount: String) = when (lang) {
        AppLanguage.UZ_LATIN -> "Qarz $amount sum"
        AppLanguage.UZ_CYRILLIC -> "Қarz $amount sum"
        AppLanguage.RUS -> "Долг $amount сум"
    }
    fun selectDateRange(lang: AppLanguage) = tr(lang, "Davrni tanlang", "Davrni tanlang", "Выберите период")
    fun applyDateRange(lang: AppLanguage) = tr(lang, "Tanlash", "Tanlash", "Выбрать")
    fun payment(lang: AppLanguage) = tr(lang, "To'lov", "Тўлов", "Оплата")
    fun phoneLabel(lang: AppLanguage) = tr(lang, "Telefon", "Телефон", "Телефон")
    fun addressLabel(lang: AppLanguage) = tr(lang, "Manzil", "Мanzil", "Адрес")
    fun landmarkLabel(lang: AppLanguage) = tr(lang, "Orientr", "Ориентр", "Ориентир")
    fun categoryLabel(lang: AppLanguage) = tr(lang, "Kategoriya", "Категория", "Категория")
    fun agentLabel(lang: AppLanguage) = tr(lang, "Agent", "Агент", "Агент")
    fun selectPaymentType(lang: AppLanguage) = tr(lang, "To'lov turini tanlang", "Тўлов turini tanlang", "Выберите тип оплаты")
    fun paymentCash(lang: AppLanguage) = tr(lang, "Naxt", "Нaqd", "Наличные")
    fun paymentCashDesc(lang: AppLanguage) = tr(lang, "Naqd pul", "Нaqd pul", "Наличные")
    fun paymentCard(lang: AppLanguage) = tr(lang, "Bank karta", "Банк карта", "Банковская карта")
    fun paymentCardDesc(lang: AppLanguage) = tr(lang, "Terminal orqali", "Terminal orqali", "Через терминал")
    fun paymentTransfer(lang: AppLanguage) = tr(lang, "Pul ko'chirish", "Пул кўчириш", "Перевод")
    fun paymentTransferDesc(lang: AppLanguage) = tr(lang, "Bank hisobi orqali", "Bank hisobi orqali", "Через банковский счёт")
    fun enterAmount(lang: AppLanguage) = tr(lang, "Summani kiriting", "Summani kiriting", "Введите сумму")
    fun selectTerminal(lang: AppLanguage) = tr(lang, "Terminalni tanlang", "Terminalni tanlang", "Выберите терминал")
    fun paymentAccepted(lang: AppLanguage) = tr(lang, "To'lov qabul qilindi", "Тўлов qabul qilindi", "Оплата принята")
    fun comingSoon(lang: AppLanguage) = tr(lang, "Tez orada qo'shiladi", "Tez orada qo'shiladi", "Скоро будет доступно")
    fun paymentTransferSoon(lang: AppLanguage) = tr(
        lang,
        "Pul ko'chirish tez orada ishga tushadi",
        "Пул кўчириш tez orada ishga tushadi",
        "Перевод скоро будет доступен",
    )
    fun clientNotFound(lang: AppLanguage) = tr(lang, "Klient topilmadi", "Клиент топилмади", "Клиент не найден")
    fun visitProducts(lang: AppLanguage) = tr(lang, "Vizit — Mahsulotlar", "Ташриф — Маҳсулотлар", "Визит — Товары")
    fun visitTabProduct(lang: AppLanguage) = tr(lang, "Mahsulot", "Маҳсулот", "Товар")
    fun visitTabPromotion(lang: AppLanguage) = tr(lang, "Aksiya", "Акция", "Акция")
    fun visitTabAddons(lang: AppLanguage) = tr(lang, "Qo'shimchalar", "Қўшимчалар", "Дополнения")
    fun visitTabCart(lang: AppLanguage) = tr(lang, "Savatcha", "Саватча", "Корзина")
    fun allGoods(lang: AppLanguage) = tr(lang, "Barcha tovarlar", "Барча товарлар", "Все товары")
    fun seeAllGoods(lang: AppLanguage) = tr(lang, "Hammasini ko'rish", "Ҳаммасини кўриш", "Смотреть все")
    fun productsCount(lang: AppLanguage, shown: Int, total: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$shown / $total mahsulot"
        AppLanguage.UZ_CYRILLIC -> "$shown / $total маҳсулот"
        AppLanguage.RUS -> "$shown / $total товаров"
    }
    fun reload(lang: AppLanguage) = tr(lang, "Qayta yuklash", "Қайта юклаш", "Перезагрузить")
    fun noProductsInCategory(lang: AppLanguage) = tr(lang, "Bu kategoriyada mahsulot yo'q", "Бу категорияда маҳсулот йўқ", "В этой категории нет товаров")
    fun stock(lang: AppLanguage) = tr(lang, "Sklad", "Склад", "Склад")
    fun priceLabel(lang: AppLanguage) = tr(lang, "Narx", "Нarx", "Цена")
    fun quantityLabel(lang: AppLanguage) = tr(lang, "Miqdor", "Мiqdor", "Количество")
    fun commentPlaceholder(lang: AppLanguage) = tr(lang, "Izoh...", "Izoh...", "Комментарий...")
    fun addToCart(lang: AppLanguage) = tr(lang, "Savatga qo'shish", "Саватга қўшиш", "В корзину")
    fun addedToCart(lang: AppLanguage) = tr(lang, "Savatga qo'shildi", "Саватга қўшилди", "Добавлено в корзину")
    fun cartPreviewTitle(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "Savatcha · $count ta"
        AppLanguage.UZ_CYRILLIC -> "Саватча · $count ta"
        AppLanguage.RUS -> "Корзина · $count шт."
    }
    fun cartEmpty(lang: AppLanguage) = tr(lang, "Savatcha bo'sh", "Саватча бўш", "Корзина пуста")
    fun selectedProducts(lang: AppLanguage) = tr(lang, "Tanlanganlar", "Танланганлар", "Выбранные")
    fun selectedCount(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta"
        AppLanguage.UZ_CYRILLIC -> "$count ta"
        AppLanguage.RUS -> "$count шт."
    }
    fun allGoodsCount(lang: AppLanguage, count: Int) = when (lang) {
        AppLanguage.UZ_LATIN -> "$count ta"
        AppLanguage.UZ_CYRILLIC -> "$count ta"
        AppLanguage.RUS -> "$count шт."
    }
    fun pricePerUnit(lang: AppLanguage, unit: String) = when (lang) {
        AppLanguage.UZ_LATIN -> "so'm/$unit"
        AppLanguage.UZ_CYRILLIC -> "so'm/$unit"
        AppLanguage.RUS -> "сум/$unit"
    }
    fun productPosition(lang: AppLanguage, current: Int, total: Int) = "$current / $total"
    fun order(lang: AppLanguage) = tr(lang, "Buyurtma", "Буюртма", "Заказ")
    fun currentOrder(lang: AppLanguage) = tr(lang, "Joriy buyurtma", "Жорiy buyurtma", "Текущий заказ")
    fun sentOrders(lang: AppLanguage) = tr(lang, "Yuborilgan buyurtmalar", "Юборилган buyurtmalar", "Отправленные заказы")
    fun noSentOrdersToday(lang: AppLanguage) = tr(
        lang,
        "Bugun yuborilgan buyurtmalar yo'q",
        "Бугун юборилган buyurtmalar йўқ",
        "Сегодня отправленных заказов нет",
    )
    fun sendOrder(lang: AppLanguage) = tr(lang, "Yuborish", "Юбориш", "Отправить")
    fun confirm(lang: AppLanguage) = tr(lang, "Tasdiqlash", "Тасдиқлаш", "Подтвердить")
    fun total(lang: AppLanguage) = tr(lang, "Jami", "Жами", "Итого")
    fun orderSent(lang: AppLanguage) = tr(lang, "Buyurtma yuborildi!", "Буюртма юборилди!", "Заказ отправлен!")
    fun cartEmptyHint(lang: AppLanguage) = tr(
        lang,
        "Savatcha bo'sh — vizitdan mahsulot qo'shing",
        "Саватча бўш — визитdan mahsulot qo'shing",
        "Корзина пуста — добавьте товары из визита",
    )
    fun backToHome(lang: AppLanguage) = tr(lang, "Asosiy sahifaga", "Асосий саҳифага", "На главную")
    fun logout(lang: AppLanguage) = tr(lang, "Chiqish", "Чиқиш", "Выйти")
    fun profileTitle(lang: AppLanguage) = tr(lang, "Profil", "Профил", "Профиль")
    fun profileInfoSection(lang: AppLanguage) = tr(lang, "MA'LUMOTLAR", "МАЪЛУМОТЛАР", "ДАННЫЕ")
    fun firstName(lang: AppLanguage) = tr(lang, "Ism", "Исм", "Имя")
    fun lastName(lang: AppLanguage) = tr(lang, "Familiya", "Фамилия", "Фамилия")
    fun position(lang: AppLanguage) = tr(lang, "Lavozim", "Лавозим", "Должность")
    fun company(lang: AppLanguage) = tr(lang, "Kompaniya", "Компания", "Компания")
    fun salesAgentPosition(lang: AppLanguage) = tr(lang, "Sotuv agenti", "Сотув агенти", "Торговый агент")
    fun changePassword(lang: AppLanguage) = tr(lang, "Parolni o'zgartirish", "Паролни ўзгартириш", "Изменить пароль")
    fun currentPassword(lang: AppLanguage) = tr(lang, "Joriy parol", "Жорий парол", "Текущий пароль")
    fun newPassword(lang: AppLanguage) = tr(lang, "Yangi parol", "Янги парол", "Новый пароль")
    fun confirmPassword(lang: AppLanguage) = tr(lang, "Tasdiqlash", "Тасдиқлаш", "Подтверждение")
    fun errorInvalidCurrentPassword(lang: AppLanguage) = tr(
        lang,
        "Joriy parol noto'g'ri",
        "Жорий парол нотўғри",
        "Неверный текущий пароль",
    )
    fun errorPasswordMismatch(lang: AppLanguage) = tr(
        lang,
        "Yangi parollar mos kelmadi",
        "Янги пароллар мос келмади",
        "Новые пароли не совпадают",
    )
    fun errorPasswordTooShort(lang: AppLanguage) = tr(
        lang,
        "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
        "Парол камида 6 та белгидан иборат бўлиши керак",
        "Пароль должен содержать минимум 6 символов",
    )
    fun errorCurrentPasswordRequired(lang: AppLanguage) = tr(
        lang,
        "Joriy parolni kiriting",
        "Жорий паролни киритинг",
        "Введите текущий пароль",
    )

    fun todaySales(lang: AppLanguage) = tr(lang, "Bugungi savdo", "Бугунги савдо", "Продажи за день")
    fun weekSales(lang: AppLanguage) = tr(lang, "Haftalik savdo", "Ҳафталик савдо", "Продажи за неделю")
    fun monthSales(lang: AppLanguage) = tr(lang, "Oylik savdo", "Ойлик савдо", "Продажи за месяц")

    fun addClientTitle(lang: AppLanguage) = tr(lang, "Yangi mijoz", "Янги мижоз", "Новый клиент")
    fun clientName(lang: AppLanguage) = tr(lang, "Ism (do'kon nomi)", "Исм (до'кон номи)", "Название")
    fun clientInn(lang: AppLanguage) = tr(lang, "INN", "ИНН", "ИНН")
    fun clientPhone(lang: AppLanguage) = tr(lang, "Telefon raqami", "Телефон рақами", "Номер телефона")
    fun clientAddress(lang: AppLanguage) = tr(lang, "Manzil", "Манзил", "Адрес")
    fun clientLine(lang: AppLanguage) = tr(lang, "Liniya", "Линия", "Линия")
    fun selectLine(lang: AppLanguage) = tr(lang, "Liniyani tanlang", "Линияни танланг", "Выберите линию")
    fun clientLocation(lang: AppLanguage) = tr(lang, "Xaritada joyi", "Харитада жойи", "Место на карте")
    fun clientPhoto(lang: AppLanguage) = tr(lang, "Do'kon rasmi", "Дo'кон расми", "Фото магазина")
    fun useMyLocation(lang: AppLanguage) = tr(lang, "Mening joyim", "Менинг жойим", "Моё местоположение")
    fun tapMapHint(lang: AppLanguage) = tr(
        lang,
        "Xaritada bosing yoki belgini suring",
        "Харитада босинг ёки белгини суринг",
        "Нажмите на карту или перетащите метку",
    )
    fun selectPhoto(lang: AppLanguage) = tr(lang, "Rasm tanlash", "Расм танлаш", "Выбрать фото")
    fun takePhoto(lang: AppLanguage) = tr(lang, "Kamera", "Камера", "Камера")
    fun chooseFromGallery(lang: AppLanguage) = tr(lang, "Galereya", "Галерея", "Галерея")
    fun fullScreenMap(lang: AppLanguage) = tr(lang, "To'liq ekran", "Тўлиқ экран", "Полный экран")
    fun done(lang: AppLanguage) = tr(lang, "Tayyor", "Тайёр", "Готово")
    fun saveClient(lang: AppLanguage) = tr(lang, "Saqlash", "Сақлаш", "Сохранить")
    fun clientSaved(lang: AppLanguage) = tr(lang, "Mijoz saqlandi", "Мижоз сақланди", "Клиент сохранён")
    fun clientRequestSubmitted(lang: AppLanguage) = tr(
        lang,
        "So'rov yuborildi — tasdiqlanishi kutilmoqda",
        "Сўров юборилди — тасдиқланиши кутилмоқда",
        "Заявка отправлена — ожидает подтверждения",
    )
    fun errorNameRequired(lang: AppLanguage) = tr(lang, "Ism kiriting", "Исм киритинг", "Введите название")
    fun errorInnRequired(lang: AppLanguage) = tr(
        lang,
        "INN kiriting (kamida 9 raqam)",
        "ИНН киритинг (камида 9 рақам)",
        "Введите ИНН (минимум 9 цифр)",
    )
    fun errorPhoneRequired(lang: AppLanguage) = tr(
        lang,
        "Telefon raqamini to'liq kiriting (+998 dan keyin 9 ta raqam)",
        "Телефон рақамини тўлиқ киритинг (+998 дан кейин 9 та рақам)",
        "Введите полный номер (+998 и 9 цифр)",
    )
    fun errorLineRequired(lang: AppLanguage) = tr(lang, "Liniyani tanlang", "Линияни танланг", "Выберите линию")
    fun errorAddressRequired(lang: AppLanguage) = tr(
        lang,
        "Manzilni kiriting",
        "Манзилни киритинг",
        "Введите адрес",
    )
    fun errorLinesLoadFailed(lang: AppLanguage) = tr(
        lang,
        "Liniyalar yuklanmadi — internetni tekshiring",
        "Линиялар юкланмади — интернетни текширинг",
        "Не удалось загрузить линии — проверьте интернет",
    )
    fun lineDisplayLabel(code: String, name: String): String =
        name.trim().ifBlank { code }
    fun errorPhotoRequired(lang: AppLanguage) = tr(
        lang,
        "Do'kon rasmini qo'shing",
        "Дo'кон расмини қo'shing",
        "Добавьте фото магазина",
    )
    fun errorLocationFailed(lang: AppLanguage) = tr(
        lang,
        "Joylashuv aniqlanmadi — GPS ruxsatini yoqing",
        "Жойлашув аниқланмади — GPS рuxsatini ёqing",
        "Не удалось определить местоположение — включите GPS",
    )
    fun errorSaveFailed(lang: AppLanguage) = tr(lang, "Saqlashda xatolik", "Сақлашда хатолик", "Ошибка сохранения")
    fun errorNetwork(lang: AppLanguage) = tr(
        lang,
        "Internet aloqasi yo'q",
        "Интернет алоқаси йўқ",
        "Нет подключения к интернету",
    )
    fun errorServer(lang: AppLanguage) = tr(
        lang,
        "Server xatosi — keyinroq urinib ko'ring",
        "Сервер хатоси — кейинроқ уриниб кўринг",
        "Ошибка сервера — попробуйте позже",
    )
    fun errorUnauthorized(lang: AppLanguage) = tr(
        lang,
        "Kirish muddati tugagan — qayta kiring",
        "Кириш муддати тугаган — қайта киринг",
        "Сессия истекла — войдите снова",
    )
    fun errorInnClientExists(lang: AppLanguage) = tr(
        lang,
        "Bu INN bilan mijoz tizimda mavjud",
        "Бу ИНН билан мижоз тизимда мавжуд",
        "Клиент с таким ИНН уже есть в системе",
    )
    fun errorInnRequestExists(lang: AppLanguage) = tr(
        lang,
        "Bu INN bilan kutilayotgan so'rov mavjud",
        "Бу ИНН билан кутилаётган сўров мавжуд",
        "Заявка с таким ИНН уже ожидает рассмотрения",
    )

    fun addClientError(lang: AppLanguage, key: String): String = apiError(lang, key)

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
