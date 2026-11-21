# SocialSentiment — Frontend

Веб-интерфейс анализа комментариев Instagram. Next.js 16, React 19, TypeScript, Tailwind CSS.

## Быстрый запуск
Нужны Node.js и pnpm. Backend Java работает на http://localhost:4001.

```sh
pnpm install
pnpm dev
```

Откройте http://localhost:4000.

## Возможности
- Анализ публикации Instagram через Scrapfly или ручной ввод комментариев
- Статистика negative / neutral / positive
- Поиск и фильтры комментариев
- История анализов, повторный анализ
- Плавная однострочная индикация загрузки (ориентировочная, не real-time статусы сервера)

## Конфигурация
`NEXT_PUBLIC_API_URL` — адрес Java API, по умолчанию `http://localhost:4001`.
Пример в `.env.example`.

## Проверка
```sh
pnpm lint
pnpm build
```

## Git workflow
Изменения отправляются из `feature/<name>` в `main` через Pull Request. Перед слиянием проверяйте CI и просматривайте diff.

## Backend и документация
[SocialSentiment-Backend](https://github.com/RollSatrs/SocialSentiment-Backend) — Java, PostgreSQL, Python parser и материалы к защите (User Stories, ER, API, Postman).

## Ограничения
Автоматический сбор зависит от внешнего сервиса и может быть недоступен; Python sentiment model должна быть запущена отдельно. Авторизации нет. Для защиты добавьте реальные скриншоты работающего UI, не подменяйте их макетами.
