# Источники исследования

Материалы прочитаны при исследовании 14.10.2026. Внешняя документация и сообщения описывают контекст; фактические результаты прогона подтверждаются сохранёнными значениями и браузерным UI.

Таблица 1. Источники и их применение

| Источник | Применение | Ограничение |
| :--- | :--- | :--- |
| [Тестовый файл Figma](https://www.figma.com/design/OWBuzmv9GDKdGpPkzbqMk0/Codex-Color-P3-Transforms?node-id=0-1) | Практические опыты с заливками, переменными и Dev Mode | Доступ определяется правами файла |
| [Исходный Overlay](https://www.figma.com/design/SR61SDd57O6FCtpj4Tbdu1/Overlays-4?node-id=1-16842) | Структура контейнера с opacity | Живой файл изменяется |
| [Overlay BG](https://www.figma.com/design/SR61SDd57O6FCtpj4Tbdu1/Overlays-4?node-id=46-51599) | Уточнение исходной заливки | Ссылка ведёт на экземпляр; дочерний Fill разрешён через API |
| [Figma: цветовые профили](https://help.figma.com/hc/en-us/articles/360039825114-Manage-color-profiles-in-design-files) | Различие Assign и Convert, профиль документа | Не раскрывает алгоритм HEX-fallback Dev Mode |
| [Figma: цветовые модели](https://help.figma.com/hc/en-us/articles/360043042113-About-color-models) | CSS-ввод и модели представления | Практическая проверка текстовой формы после обновления описана отдельно |
| [Figma: локальная копия](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files) | Штатный экспорт `.fig`, отсутствие истории и комментариев, новый файл при импорте | Сохранность конкретных ID проверена нашим обратным импортом |
| [Figma: импорт файлов](https://help.figma.com/hc/en-us/articles/360041003114-Import-files-to-the-file-browser) | Восстановление `.fig` через файловый браузер | Не заменяет проверку данных восстановленного документа |
| [OkColor: документация автора](https://dokozero.design/en/projects/okcolor/#differences-in-the-hex-and-rgba-values) | Различие HEX относительно профиля Figma и CSS HEX | Установка и запуск самого плагина в этом опыте не выполнялись |
| [Doko Zero: тред от 06.02.2025](https://x.com/dokozero/status/1887429676861145235) | Историческое сообщение о вводе OKLCH в P3-файл | Не доказывает текущее поведение |
| [Figma Forum: Unmanaged](https://forum.figma.com/ask-the-community-7/does-figma-stretch-rgb-colors-in-unmanaged-p3-color-profile-24465) | Исторический вопрос об RGB и охвате P3 от 18.01.2023 | Ответ об HSB не объясняет преобразование Dev Mode |
| [CSS Color 4](https://www.w3.org/TR/css-color-4/) | Значение CSS HEX, пространства, clipping и opacity | Не описывает реализацию Figma |
| [CSS Color 5](https://www.w3.org/TR/css-color-5/#color-mix) | Интерполяция с альфой в color-mix | Растровое сравнение с Figma в этом опыте не выполнялось |
| [Color.js: пространства](https://colorjs.io/docs/spaces) | Преобразование OKLCH, Display-P3 и sRGB | В расчётах зафиксирована версия 0.5.2 |
| [Color.js: gamut mapping](https://colorjs.io/docs/gamut-mapping) | Альтернативная политика сопоставления охвата | Отличается от clipping в проверенном UI Figma |

## Интерпретация треда

В треде Doko Zero сопоставляет `#FAB6B8` и `#F0B9B9` для `oklch(84% 0.08 17)` и указывает на различие профилей HEX. Сообщение прочитано вместе с ответами через браузерный интерфейс X. В репозитории сохранены пересказ и ссылка, а не копия треда.

Расчёт исходного цвета даёт sRGB HEX `#FAB6B8` и P3 HEX `#F0B9B9`. В текущем опыте ввод OKLCH в переменную P3-документа сохранил P3-каналы исходного цвета и показал `#F0B9B9`. Историческое расхождение ввода не воспроизвелось.

Отдельно воспроизвелось расхождение HEX-fallback переменной в Dev Mode. Эти два результата относятся к разным путям обработки.

## Пределы внешних свидетельств

В прогоне от 15.10.2026 использованы [Figma: Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables) и [DTCG Color Module 2025.10](https://www.designtokens.org/tr/2025.10/color/). Первая описывает native import и export, вторая — смысл цветовых полей и единицы HSL. Практические расхождения записаны в [Variables JSON](variables-json.md).

Сообщение на форуме, документация плагина и численная модель не являются подтверждением внутреннего кода Figma. Практические утверждения в этом репозитории имеют дату, контрольный набор и сохранённые доказательства.

[Справочник записей цвета](color-notations.md) объединяет эти источники с наблюдениями интерфейса. CSS HEX трактуется как sRGB по [CSS Color 4, разделу HEX](https://www.w3.org/TR/css-color-4/#hex-notation); смысл P3 HEX в полях Figma подтверждён отдельными опытами. Округление до четырёх десятичных знаков описывает сохранённый вывод Dev Mode, а правило Figma на точной половине шага не исследовалось.
