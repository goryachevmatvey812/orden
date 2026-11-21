# Орден — энциклопедия

Сайт-энциклопедия по вымышленной вселенной Ордена: лор, персонажи, техника,
звания, а также сообщество — общий чат, личные сообщения, вопросы, галерея.

Работает как обычный сайт и как устанавливаемое приложение (PWA).
Все данные хранятся в Firebase Firestore, поэтому изменения видны
одновременно на всех устройствах.

**Адрес сайта:** https://goryachevmatvey812.github.io/orden/

---

## Из чего состоит проект

### Только сайт (эта папка — всё, что нужно для запуска)

| Файл | Что делает |
|---|---|
| `index.html` | весь сайт: разметка, стили, логика, тексты статей |
| `sw.js` | офлайн-режим: без сети отдаёт сохранённую копию |
| `firebase-messaging-sw.js` | уведомления, когда вкладка браузера закрыта |
| `manifest.json` | название, иконки, цвета — чтобы сайт ставился приложением |
| `version.json` | номер версии сайта (для проверки обновлений) |
| `icon-192.png`, `icon-512.png` | иконки приложения |

### Не для GitHub, а для настройки (лежат здесь же)

| Файл | Куда |
|---|---|
| `firestore.rules` | Firebase Console → Firestore → Rules → вставить → Publish |
| `firebase.json` | конфиг деплоя функций |
| `index.js` | это `functions/index.js` — серверные push-уведомления |
| `functions-package.json` | переименовать в `package.json` и положить в папку `functions/` |

---

## Как запустить

### 1. GitHub Pages

1. Создайте репозиторий (например, `orden`), поставьте **Public**.
2. Загрузите файлы: `index.html`, `sw.js`, `firebase-messaging-sw.js`,
   `manifest.json`, `version.json`, `icon-192.png`, `icon-512.png`.
3. Settings → Pages → Source: **Deploy from a branch** → Branch: **main**,
   папка **/ (root)** → Save.
4. Через 1–2 минуты сайт откроется по адресу репозитория.

### 2. Firebase

Проект уже создан: `orden-carstvie`.

1. **Authentication** → Sign-in method → включить **Anonymous** и **Google**.
2. **Firestore Database** → создать базу.
3. **Rules** → вставить содержимое `firestore.rules` → Publish.
4. **Authentication → Settings → Authorized domains** → добавить
   `goryachevmatvey812.github.io`.

Владелец сайта — `goryachevmatvey812@gmail.com`: при входе через Google
у этого аккаунта появляются права администратора.

### 3. Уведомления (необязательно)

Для push при **полностью закрытом** браузере нужны Cloud Functions
и тариф Blaze:

```
npx web-push generate-vapid-keys
cd functions && npm install
firebase login
firebase use orden-carstvie
firebase functions:secrets:set VAPID
firebase deploy --only functions
```

Публичный ключ положить в Firestore: коллекция `config`, документ `push`,
поле `key`.

Без этого уведомления приходят, только пока вкладка свёрнута.

---

## Приложения

В коде сайта есть кнопка **«📥 Скачать»** (в настройках ⚙ и в своём профиле).
Она берёт файлы по адресам:

```
app/Orden-Setup.exe   — приложение для Windows
app/Orden.apk         — приложение для Android
```

Пока этих файлов нет в репозитории — кнопка сообщит, что файл не найден.
Собираются они из отдельных проектов (Electron и Android Studio).

---

## Как обновлять сайт

1. Отредактируйте `index.html`.
2. Увеличьте номер в `version.json` (например, `1.0.1` → `1.0.2`).
3. Загрузите оба файла на GitHub → Commit.
4. У всех открытых сайт и приложений появится баннер «Доступно обновление».

Переустанавливать приложения не нужно.

---

## Структура данных во Firestore

| Коллекция | Что хранит |
|---|---|
| `members` | профили участников |
| `roles`, `roleDefs` | выданные роли и описания ролей |
| `chat`, `chans`, `rooms` | общий чат, каналы и чаты внутри них |
| `dms`, `inbox` | личные сообщения |
| `calls` | сигналы звонков |
| `qa`, `fan`, `gal` | вопросы, творчество, галерея |
| `news`, `board`, `ticker` | новости, объявления, бегущая строка |
| `pages`, `cpages` | страницы, созданные с сайта |
| `reports`, `sanc`, `logs` | жалобы, предупреждения, журнал действий |
| `devices` | устройства участников |
| `pushtok`, `devtok` | токены для push (браузер и Android) |
| `config` | публичные настройки (ключ Web Push) |

---

## Частые проблемы

**«Файл не найден» на странице** — открыт неверный адрес или
репозиторий не публикуется через Pages. Проверьте Settings → Pages.

**Сайт пустой, кнопки не работают** — старый Service Worker из кэша.
F12 → Application → Service Workers → Unregister, затем Storage → Clear site data.

**Не работает вход через Google** — домен не добавлен
в Authorized domains в Firebase.

**Чат пустой** — не опубликованы правила Firestore.

---

## Лицензия

Личный проект. Все тексты и материалы — авторские.
