#!/usr/bin/env python3
"""Генератор myavto-ads-v3.csv — Responsive Search Ads для импорта в Google Ads Editor.

Жёсткая валидация:
- Заголовки ≤ 30 СИМВОЛОВ (не байтов)
- Описания ≤ 90 СИМВОЛОВ
- Путь URL ≤ 15 СИМВОЛОВ
- Минимум 5 заголовков, 2 описания
- Имена групп в точности как в Ads
- UTF-8 без BOM
"""

import csv
import sys
from collections import OrderedDict

CAMPAIGN = "MY AVTO Search"

# Лимиты Google Ads RSA
MAX_HEADLINE = 30
MAX_DESC = 90
MAX_PATH = 15

# ===== Группы и URL =====
GROUPS = OrderedDict()

# Общие
GROUPS["Поршни общее"] = ("https://my-avto.kz/zapchasti/porshni/", "zapchasti", "porshni")
GROUPS["Кольца общее"] = ("https://my-avto.kz/zapchasti/koltsa-porshnevye/", "zapchasti", "koltsa")
GROUPS["Вкладыши общее"] = ("https://my-avto.kz/zapchasti/vkladyshi/", "zapchasti", "vkladyshi")
GROUPS["Гео-Алматы"] = ("https://my-avto.kz/", "almaty", "zapchasti")

# Марки авто
GROUPS["Toyota"] = ("https://my-avto.kz/toyota/", "toyota", "zapchasti")
GROUPS["Nissan"] = ("https://my-avto.kz/nissan/", "nissan", "zapchasti")
GROUPS["Mitsubishi"] = ("https://my-avto.kz/mitsubishi/", "mitsubishi", "zapchasti")
GROUPS["Mazda"] = ("https://my-avto.kz/mazda/", "mazda", "zapchasti")

# Двигатели Toyota
for code in ["1KZ", "2JZ", "1JZ", "1ZZ", "2AZ", "1MZ", "2GR", "1GR", "2UZ", "3S"]:
    GROUPS[f"Двигатель {code}"] = (
        f"https://my-avto.kz/toyota/dvigateli/{code.lower()}/",
        "toyota", code.lower())

# Двигатели Mitsubishi
for code in ["4D56", "4M40", "4M41", "4G63", "4G93", "4G94", "4G15", "6G72", "6G74"]:
    GROUPS[f"Двигатель {code}"] = (
        f"https://my-avto.kz/mitsubishi/dvigateli/{code.lower()}/",
        "mitsubishi", code.lower())

# Двигатели Nissan
for code, url_slug in [("YD25","yd25"),("KA24","ka24"),("QR20","qr20"),("QR25","qr25"),
                       ("QG18","qg18"),("SR20","sr20"),("MR20","mr20"),
                       ("VQ25","vq25de"),("VQ30","vq30de"),("VQ35","vq35de"),("EN20","en20b")]:
    GROUPS[f"Двигатель {code}"] = (
        f"https://my-avto.kz/nissan/dvigateli/{url_slug}/",
        "nissan", code.lower())

# Mazda двигатели — все на /mazda/
for code in ["EJ20", "FS", "L3", "LF", "WLT", "ZL", "ZY"]:
    GROUPS[f"Двигатель Mazda {code}"] = ("https://my-avto.kz/mazda/", "mazda", code.lower())

# Бренды запчастей
for brand in ["TEIKIN", "NPR", "IZUMI", "RIK", "TP", "ND", "Taiho", "NDC"]:
    GROUPS[f"Бренд {brand}"] = (
        f"https://my-avto.kz/brendy/{brand.lower()}/",
        "brendy", brand.lower())


# ===== Универсальные заголовки/описания =====
COMMON_HEADLINES = [
    "WhatsApp 7015509377",         # без + и пробелов чтоб уложиться
    "Магазин ТЦ CarCity",
    "Доставка по Казахстану",
    "Бесплатная консультация",
    "Гарантия качества",
    "Цены ниже рынка на 20%",
    "Бутик 135В в CarCity",
    "Магазин с 2015 года",
    "Подбор по двигателю",
]

COMMON_DESCS = [
    "Магазин в Алматы ТЦ CarCity 3 ярус бутик 135В. Опытные консультанты с 2015 года.",
    "Подбор по марке и коду двигателя через WhatsApp за 10 минут. Бесплатно.",
    "Все размеры STD 0.25 0.50 в наличии. Доставка СДЭК по всему Казахстану.",
    "Оригинальные бренды TEIKIN NPR IZUMI Taiho. Гарантия качества.",
]


def cust_headlines(group_name):
    """Генерирует кастомные заголовки в зависимости от типа группы."""
    g = group_name

    # 4 общие категории
    if g == "Поршни общее":
        return ["Поршни на японские авто", "Купить поршни Алматы",
                "Поршни TEIKIN NPR IZUMI", "Поршни любых размеров",
                "Поршни STD 0.25 0.50", "Поршни на капремонт"]
    if g == "Кольца общее":
        return ["Кольца поршневые", "Купить кольца Алматы",
                "Кольца TP NPR RIK", "Кольца на капремонт",
                "Кольца все размеры", "Комплект колец на ДВС"]
    if g == "Вкладыши общее":
        return ["Вкладыши коренные", "Вкладыши шатунные",
                "Вкладыши Taiho NDC", "Купить вкладыши Алматы",
                "Все размеры STD 0.25", "Комплект вкладышей"]
    if g == "Гео-Алматы":
        return ["Запчасти для капремонта", "Магазин в Алматы",
                "Японские запчасти", "Поршни кольца вкладыши",
                "MY AVTO CarCity", "Магазин с 2015 года"]

    # Бренд запчастей
    if g.startswith("Бренд "):
        b = g.replace("Бренд ", "")
        return [
            f"{b} запчасти Алматы",
            f"{b} оригинал Япония",
            f"Купить {b}",
            f"{b} в Казахстане",
            f"Поршни {b}",
            f"{b} цена",
        ]

    # Двигатель Mazda XX
    if g.startswith("Двигатель Mazda "):
        code = g.replace("Двигатель Mazda ", "")
        return [
            f"Mazda {code} запчасти",
            f"Mazda {code} поршни",
            f"Mazda {code} кольца",
            f"Mazda {code} вкладыши",
            f"Капремонт Mazda {code}",
            "Запчасти Mazda Алматы",
        ]

    # Двигатель XX
    if g.startswith("Двигатель "):
        code = g.replace("Двигатель ", "")
        return [
            f"Запчасти {code}",
            f"Поршни {code}",
            f"Кольца {code}",
            f"Вкладыши {code}",
            f"Капремонт {code}",
            f"Ремкомплект {code}",
        ]

    # Марка авто
    if g in ("Toyota", "Nissan", "Mitsubishi", "Mazda"):
        return [
            f"Запчасти {g}",
            f"Поршни {g}",
            f"Кольца {g}",
            f"Вкладыши {g}",
            f"Капремонт {g}",
            f"Ремкомплект {g}",
        ]

    return []


def cust_descs(group_name):
    """Кастомные описания в зависимости от типа группы."""
    g = group_name
    if g == "Поршни общее":
        return ["Поршни на Toyota, Nissan, Mitsubishi, Mazda. Бренды TEIKIN, NPR, IZUMI в наличии."]
    if g == "Кольца общее":
        return ["Кольца поршневые TP, NPR, RIK на двигатели Toyota, Nissan, Mitsubishi."]
    if g == "Вкладыши общее":
        return ["Вкладыши коренные и шатунные Taiho, NDC, Daido на японские двигатели."]
    if g == "Гео-Алматы":
        return ["Магазин запчастей для капремонта в Алматы. Японские бренды, любые размеры."]
    if g.startswith("Бренд "):
        b = g.replace("Бренд ", "")
        return [f"Бренд {b}: оригинал из Японии. Поставка напрямую без посредников. Гарантия."]
    if g.startswith("Двигатель Mazda "):
        code = g.replace("Двигатель Mazda ", "")
        return [f"Запчасти на Mazda {code}: поршни, кольца, вкладыши, ремкомплекты в наличии."]
    if g.startswith("Двигатель "):
        code = g.replace("Двигатель ", "")
        return [f"Запчасти на двигатель {code}: поршни, кольца, вкладыши. Все размеры в наличии."]
    if g in ("Toyota", "Nissan", "Mitsubishi", "Mazda"):
        return [f"Запчасти для капремонта {g}. Поршни, кольца, вкладыши в наличии."]
    return []


def truncate_or_skip(items, max_len, label, group_name):
    """Возвращает список items, обрезанных или отброшенных если длиннее max_len."""
    out = []
    for item in items:
        if len(item) > max_len:
            print(f"⚠️  [{group_name}] {label} > {max_len} символов ({len(item)}): {item}", file=sys.stderr)
            continue
        out.append(item)
    return out


def build_ad(group, url, path1, path2):
    """Собирает строку RSA для CSV."""
    raw_headlines = cust_headlines(group) + COMMON_HEADLINES
    raw_descs = cust_descs(group) + COMMON_DESCS

    # Валидация и обрезка
    headlines = truncate_or_skip(raw_headlines, MAX_HEADLINE, "Headline", group)
    descs = truncate_or_skip(raw_descs, MAX_DESC, "Description", group)
    path1 = path1[:MAX_PATH]
    path2 = path2[:MAX_PATH]

    # Дедуп
    headlines = list(dict.fromkeys(headlines))
    descs = list(dict.fromkeys(descs))

    # Проверка минимума
    if len(headlines) < 5:
        print(f"❌ [{group}] МАЛО заголовков: {len(headlines)} (нужно ≥5)", file=sys.stderr)
        return None
    if len(descs) < 2:
        print(f"❌ [{group}] МАЛО описаний: {len(descs)} (нужно ≥2)", file=sys.stderr)
        return None

    # Заполнить до 15 заголовков пустыми
    while len(headlines) < 15:
        headlines.append("")
    while len(descs) < 4:
        descs.append("")

    return [
        CAMPAIGN, group, "Responsive search ad",
        *headlines[:15],
        *descs[:4],
        url, path1, path2,
    ]


def main():
    header = [
        "Campaign", "Ad Group", "Ad Type",
        *(f"Headline {i}" for i in range(1, 16)),
        *(f"Description {i}" for i in range(1, 5)),
        "Final URL", "Path 1", "Path 2",
    ]

    rows = [header]
    failures = []

    for group, (url, p1, p2) in GROUPS.items():
        row = build_ad(group, url, p1, p2)
        if row is None:
            failures.append(group)
            continue
        rows.append(row)

    out = "/Users/semen/IdeaProjects/myavto-landing/.claude/worktrees/loving-keller-9db10a/google-ads/myavto-ads-v3.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        csv.writer(f, quoting=csv.QUOTE_MINIMAL).writerows(rows)

    print(f"\n✅ Создано объявлений: {len(rows)-1} из {len(GROUPS)}")
    if failures:
        print(f"❌ Не создано для групп: {', '.join(failures)}")
    print(f"📄 Файл: {out}")


if __name__ == "__main__":
    main()
