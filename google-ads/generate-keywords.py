#!/usr/bin/env python3
"""Генератор всех CSV для Google Ads Editor:
- myavto-keywords-v2.csv  (все ключи Exact match)
- myavto-ads-v2.csv       (53 RSA, по 1 на группу со своим URL)
- myavto-sitelinks.csv    (доп. ссылки на уровне кампании)
"""

import csv
from collections import OrderedDict

CAMPAIGN = "MY AVTO Search"

# ============================================================
# 1. ДВИГАТЕЛИ
# ============================================================
ENGINES = OrderedDict([
    # Toyota
    ("1KZ", "https://my-avto.kz/toyota/dvigateli/1kz/"),
    ("2JZ", "https://my-avto.kz/toyota/dvigateli/2jz/"),
    ("1JZ", "https://my-avto.kz/toyota/dvigateli/1jz/"),
    ("1ZZ", "https://my-avto.kz/toyota/dvigateli/1zz/"),
    ("2AZ", "https://my-avto.kz/toyota/dvigateli/2az/"),
    ("1MZ", "https://my-avto.kz/toyota/dvigateli/1mz/"),
    ("2GR", "https://my-avto.kz/toyota/dvigateli/2gr/"),
    ("1GR", "https://my-avto.kz/toyota/dvigateli/1gr/"),
    ("2UZ", "https://my-avto.kz/toyota/dvigateli/2uz/"),
    ("3S",  "https://my-avto.kz/toyota/dvigateli/3s/"),
    # Mitsubishi
    ("4D56", "https://my-avto.kz/mitsubishi/dvigateli/4d56/"),
    ("4M40", "https://my-avto.kz/mitsubishi/dvigateli/4m40/"),
    ("4M41", "https://my-avto.kz/mitsubishi/dvigateli/4m41/"),
    ("4G63", "https://my-avto.kz/mitsubishi/dvigateli/4g63/"),
    ("4G93", "https://my-avto.kz/mitsubishi/dvigateli/4g93/"),
    ("4G94", "https://my-avto.kz/mitsubishi/dvigateli/4g94/"),
    ("4G15", "https://my-avto.kz/mitsubishi/dvigateli/4g15/"),
    ("6G72", "https://my-avto.kz/mitsubishi/dvigateli/6g72/"),
    ("6G74", "https://my-avto.kz/mitsubishi/dvigateli/6g74/"),
    # Nissan
    ("YD25", "https://my-avto.kz/nissan/dvigateli/yd25/"),
    ("KA24", "https://my-avto.kz/nissan/dvigateli/ka24/"),
    ("QR20", "https://my-avto.kz/nissan/dvigateli/qr20/"),
    ("QR25", "https://my-avto.kz/nissan/dvigateli/qr25/"),
    ("QG18", "https://my-avto.kz/nissan/dvigateli/qg18/"),
    ("SR20", "https://my-avto.kz/nissan/dvigateli/sr20/"),
    ("MR20", "https://my-avto.kz/nissan/dvigateli/mr20/"),
    ("VQ25", "https://my-avto.kz/nissan/dvigateli/vq25de/"),
    ("VQ30", "https://my-avto.kz/nissan/dvigateli/vq30de/"),
    ("VQ35", "https://my-avto.kz/nissan/dvigateli/vq35de/"),
    ("EN20", "https://my-avto.kz/nissan/dvigateli/en20b/"),
])

# Mazda — все на /mazda/
MAZDA_ENGINES = ["EJ20", "FS", "L3", "LF", "WLT", "ZL", "ZY"]

# Бренды запчастей
BRANDS = OrderedDict([
    ("TEIKIN", ("https://my-avto.kz/brendy/teikin/", "Япония, поршни и кольца")),
    ("NPR",    ("https://my-avto.kz/brendy/npr/",    "Япония, поршневые кольца")),
    ("IZUMI",  ("https://my-avto.kz/brendy/izumi/",  "Япония, поршни и пальцы")),
    ("RIK",    ("https://my-avto.kz/brendy/rik/",    "Япония, поршневые кольца")),
    ("TP",     ("https://my-avto.kz/brendy/tp/",     "Япония, поршневые кольца")),
    ("ND",     ("https://my-avto.kz/brendy/nd/",     "Япония Daido, вкладыши")),
    ("Taiho",  ("https://my-avto.kz/brendy/taiho/",  "Япония, вкладыши")),
    ("NDC",    ("https://my-avto.kz/brendy/ndc/",    "Япония, вкладыши")),
])

# Марки авто
CAR_BRANDS = OrderedDict([
    ("Toyota",     ("https://my-avto.kz/toyota/",     "Toyota")),
    ("Nissan",     ("https://my-avto.kz/nissan/",     "Nissan")),
    ("Mitsubishi", ("https://my-avto.kz/mitsubishi/", "Mitsubishi")),
    ("Mazda",      ("https://my-avto.kz/mazda/",      "Mazda")),
])

# ============================================================
# 2. ГЕНЕРАЦИЯ КЛЮЧЕВЫХ СЛОВ (ВСЁ EXACT)
# ============================================================

def exact(kw):
    """Форматирует ключ в Exact match (с квадратными скобками)."""
    kw = kw.strip().strip('"').strip('[').strip(']').strip()
    return f"[{kw}]"


def engine_keywords(engine_code, url):
    code = engine_code.lower()
    seeds = [
        f"{code} поршни",
        f"{code} кольца",
        f"{code} вкладыши",
        f"{code} ремкомплект",
        f"{code} прокладки",
        f"{code} запчасти",
        f"запчасти {code}",
        f"капремонт {code}",
        f"поршни {code}",
        f"кольца {code}",
        f"вкладыши на {code}",
        f"купить запчасти {code}",
        f"{code} алматы",
        f"{code} цена",
    ]
    return [(f"Двигатель {engine_code}", exact(s), "Exact", url) for s in seeds]


def mazda_engine_keywords(engine_code):
    code = engine_code.lower()
    url = "https://my-avto.kz/mazda/"
    seeds = [
        f"mazda {code} поршни",
        f"mazda {code} кольца",
        f"mazda {code} вкладыши",
        f"mazda {code} ремкомплект",
        f"mazda {code} запчасти",
        f"mazda {code} капремонт",
        f"mazda {code} прокладки",
        f"mazda {code} алматы",
        f"запчасти mazda {code}",
    ]
    return [(f"Двигатель Mazda {engine_code}", exact(s), "Exact", url) for s in seeds]


def brand_keywords(brand_name, url):
    brand = brand_name.lower()
    seeds = [
        f"{brand} поршни",
        f"{brand} кольца",
        f"{brand} вкладыши",
        f"купить {brand}",
        f"{brand} запчасти",
        f"{brand} алматы",
        f"{brand} казахстан",
        f"{brand} оригинал",
        f"{brand} япония",
        f"{brand} купить алматы",
        f"{brand} поршни купить",
        f"{brand} цена",
    ]
    return [(f"Бренд {brand_name}", exact(s), "Exact", url) for s in seeds]


def car_brand_keywords(name, url):
    n = name.lower()
    seeds = [
        f"запчасти {n}",
        f"запчасти {n} алматы",
        f"поршни {n}",
        f"кольца {n}",
        f"вкладыши {n}",
        f"ремкомплект {n}",
        f"капремонт {n}",
        f"капремонт двигателя {n}",
        f"запчасти двигателя {n}",
        f"японские запчасти {n}",
        f"{n} запчасти двигателя",
    ]
    return [(name, exact(s), "Exact", url) for s in seeds]


GENERAL = OrderedDict([
    ("Поршни общее", ("https://my-avto.kz/zapchasti/porshni/", [
        "поршни купить алматы", "купить поршни", "поршни цена",
        "поршни на двигатель", "поршни для капремонта", "поршни японские",
        "поршни оригинал", "поршневая группа", "поршни алматы",
        "поршни казахстан", "поршни для японских авто",
        "поршни на капремонт", "оригинальные поршни",
        "поршни в наличии", "купить поршни алматы",
    ])),
    ("Кольца общее", ("https://my-avto.kz/zapchasti/koltsa-porshnevye/", [
        "кольца поршневые", "кольца поршневые купить", "кольца поршневые цена",
        "кольца поршневые алматы", "кольца на двигатель", "кольца компрессионные",
        "маслосъёмные кольца", "поршневые кольца оригинал",
        "комплект колец на двигатель", "поршневые кольца купить",
        "купить кольца алматы", "кольца на капремонт",
    ])),
    ("Вкладыши общее", ("https://my-avto.kz/zapchasti/vkladyshi/", [
        "вкладыши коренные", "вкладыши шатунные", "вкладыши купить",
        "вкладыши цена", "вкладыши на двигатель", "вкладыши taiho",
        "вкладыши ndc", "вкладыши daido", "вкладыши алматы",
        "вкладыши казахстан", "купить вкладыши алматы",
        "вкладыши на капремонт", "комплект вкладышей",
    ])),
    ("Гео-Алматы", ("https://my-avto.kz/", [
        "запчасти для капремонта алматы", "магазин запчастей алматы",
        "запчасти на японские авто алматы", "японские запчасти алматы",
        "запчасти двигателя алматы", "поршни вкладыши алматы",
        "carcity запчасти", "my avto алматы",
        "купить запчасти двигателя алматы",
        "магазин японских запчастей алматы",
        "запчасти capcity бутик 135", "myavto kz",
    ])),
])


def main():
    # ---------- KEYWORDS ----------
    rows = [["Campaign", "Ad Group", "Keyword", "Match Type", "Final URL", "Labels"]]
    seen = set()  # dedupe (group, keyword)

    def add(group, kw, mt, url):
        key = (group.lower(), kw.lower())
        if key in seen:
            return
        seen.add(key)
        rows.append([CAMPAIGN, group, kw, mt, url, ""])

    # General
    for group, (url, seeds) in GENERAL.items():
        for s in seeds:
            add(group, exact(s), "Exact", url)

    # Engines
    for code, url in ENGINES.items():
        for g, kw, mt, u in engine_keywords(code, url):
            add(g, kw, mt, u)

    # Mazda engines
    for code in MAZDA_ENGINES:
        for g, kw, mt, u in mazda_engine_keywords(code):
            add(g, kw, mt, u)

    # Brands
    for brand, (url, _) in BRANDS.items():
        for g, kw, mt, u in brand_keywords(brand, url):
            add(g, kw, mt, u)

    # Car brands
    for name, (url, _) in CAR_BRANDS.items():
        for g, kw, mt, u in car_brand_keywords(name, url):
            add(g, kw, mt, u)

    out_kw = "/Users/semen/IdeaProjects/myavto-landing/.claude/worktrees/loving-keller-9db10a/google-ads/myavto-keywords-v2.csv"
    with open(out_kw, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)
    print(f"✅ Keywords: {len(rows)-1} ключей → {out_kw}")

    # ---------- ADS ----------
    ad_rows = [[
        "Campaign", "Ad Group", "Ad Type",
        "Headline 1", "Headline 2", "Headline 3", "Headline 4", "Headline 5",
        "Headline 6", "Headline 7", "Headline 8", "Headline 9", "Headline 10",
        "Headline 11", "Headline 12", "Headline 13", "Headline 14", "Headline 15",
        "Description 1", "Description 2", "Description 3", "Description 4",
        "Final URL", "Path 1", "Path 2"
    ]]

    # Универсальные заголовки/описания (используются везде)
    COMMON_HEADLINES = [
        "WhatsApp +7 701 550 9377",
        "Магазин ТЦ CarCity Алматы",
        "Доставка по Казахстану",
        "Бесплатная консультация",
        "Опытные консультанты",
        "Гарантия качества",
        "Цены ниже рынка на 15-20%",
        "Подбор по коду двигателя",
        "Бутик 135В в CarCity",
    ]
    COMMON_DESCS = [
        "Магазин в Алматы ТЦ CarCity 3 ярус бутик 135В. Опытные консультанты с 2015 года.",
        "Подбор по марке и коду двигателя через WhatsApp за 10 минут. Бесплатно.",
        "Все размеры STD 0.25 0.50 в наличии. Доставка СДЭК по всему Казахстану.",
        "Оригинальные бренды TEIKIN NPR IZUMI Taiho. Гарантия качества на все запчасти.",
    ]

    def make_ad(group, url, custom_headlines, path1, path2, custom_descs=None):
        """Собирает строку RSA. Заголовки <30 chars, описания <90."""
        # Усечь до 30/90, объединить кастом + общие
        headlines = []
        for h in custom_headlines + COMMON_HEADLINES:
            h = h[:30]
            if h not in headlines:
                headlines.append(h)
            if len(headlines) >= 15:
                break
        while len(headlines) < 15:
            headlines.append("")  # пустые слоты

        descs = []
        src_descs = (custom_descs or []) + COMMON_DESCS
        for d in src_descs:
            d = d[:90]
            if d not in descs:
                descs.append(d)
            if len(descs) >= 4:
                break
        while len(descs) < 4:
            descs.append("")

        return [
            CAMPAIGN, group, "Responsive search ad",
            *headlines[:15],
            *descs[:4],
            url, path1[:15], path2[:15]
        ]

    # 1. General groups
    ad_rows.append(make_ad("Поршни общее",
        "https://my-avto.kz/zapchasti/porshni/",
        ["Поршни на японские авто", "Купить поршни Алматы", "Поршни TEIKIN NPR IZUMI",
         "Поршни любых размеров", "Поршни STD 0.25 0.50", "Поршни для капремонта"],
        "zapchasti", "porshni",
        ["Поршни на Toyota, Nissan, Mitsubishi, Mazda. Бренды TEIKIN, NPR, IZUMI в наличии."]))

    ad_rows.append(make_ad("Кольца общее",
        "https://my-avto.kz/zapchasti/koltsa-porshnevye/",
        ["Кольца поршневые", "Купить кольца Алматы", "Кольца TP NPR RIK",
         "Кольца на капремонт", "Все размеры в наличии", "Комплект колец на ДВС"],
        "zapchasti", "koltsa",
        ["Кольца поршневые TP, NPR, RIK на двигатели Toyota, Nissan, Mitsubishi."]))

    ad_rows.append(make_ad("Вкладыши общее",
        "https://my-avto.kz/zapchasti/vkladyshi/",
        ["Вкладыши коренные", "Вкладыши шатунные", "Вкладыши Taiho NDC Daido",
         "Купить вкладыши Алматы", "Все размеры STD 0.25 0.50", "Комплект вкладышей"],
        "zapchasti", "vkladyshi",
        ["Вкладыши коренные и шатунные Taiho, NDC, Daido на японские двигатели."]))

    ad_rows.append(make_ad("Гео-Алматы",
        "https://my-avto.kz/",
        ["Запчасти для капремонта", "Магазин в Алматы", "Японские запчасти",
         "Поршни кольца вкладыши", "MY AVTO CarCity", "Магазин с 2015 года"],
        "zapchasti", "kapitalka",
        ["Магазин запчастей для капремонта в Алматы. Японские бренды, любые размеры."]))

    # 2. Car brands
    for name, (url, _) in CAR_BRANDS.items():
        ad_rows.append(make_ad(name, url,
            [f"Запчасти {name}", f"Поршни {name}", f"Кольца {name}",
             f"Вкладыши {name}", f"Капремонт {name}", f"Ремкомплект {name}"],
            "zapchasti", name.lower(),
            [f"Запчасти для капремонта {name}. Поршни, кольца, вкладыши в наличии."]))

    # 3. Engines (Toyota/Nissan/Mitsubishi)
    for code, url in ENGINES.items():
        headlines = [
            f"Запчасти {code}",
            f"Поршни {code}",
            f"Кольца {code}",
            f"Вкладыши {code}",
            f"Капремонт {code}",
            f"Ремкомплект {code}",
        ]
        descs = [f"Запчасти на двигатель {code}: поршни, кольца, вкладыши. Все размеры в наличии."]
        ad_rows.append(make_ad(f"Двигатель {code}", url, headlines,
                                "dvigatel", code.lower(), descs))

    # 4. Mazda engines
    for code in MAZDA_ENGINES:
        url = "https://my-avto.kz/mazda/"
        headlines = [
            f"Mazda {code} запчасти",
            f"Mazda {code} поршни",
            f"Mazda {code} кольца",
            f"Mazda {code} вкладыши",
            f"Капремонт {code}",
            "Запчасти Mazda Алматы",
        ]
        descs = [f"Запчасти на Mazda {code}: поршни, кольца, вкладыши, ремкомплекты в наличии."]
        ad_rows.append(make_ad(f"Двигатель Mazda {code}", url, headlines,
                                "mazda", code.lower(), descs))

    # 5. Brands
    for name, (url, tag) in BRANDS.items():
        headlines = [
            f"{name} запчасти Алматы",
            f"{name} оригинал Япония",
            f"Купить {name}",
            f"{name} в Казахстане",
            f"Поршни {name}",
            f"Кольца {name}" if name in ("NPR", "RIK", "TP") else f"Вкладыши {name}",
        ]
        descs = [
            f"Бренд {name}: {tag}. Поставка оригинала из Японии. Гарантия качества.",
            f"Купить {name} в Алматы. Магазин в ТЦ CarCity 3 ярус бутик 135В.",
        ]
        ad_rows.append(make_ad(f"Бренд {name}", url, headlines,
                                "brendy", name.lower(), descs))

    out_ads = "/Users/semen/IdeaProjects/myavto-landing/.claude/worktrees/loving-keller-9db10a/google-ads/myavto-ads-v2.csv"
    with open(out_ads, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(ad_rows)
    print(f"✅ Ads: {len(ad_rows)-1} объявлений → {out_ads}")

    # ---------- SITELINKS ----------
    sl_rows = [[
        "Campaign", "Asset Type", "Sitelink Text",
        "Sitelink Description 1", "Sitelink Description 2", "Final URL"
    ]]
    sitelinks = [
        ("Каталог брендов", "TEIKIN, NPR, IZUMI, Taiho", "Все японские бренды", "https://my-avto.kz/brendy/"),
        ("Поршни",          "Все размеры в наличии",     "STD, 0.25, 0.50",      "https://my-avto.kz/zapchasti/porshni/"),
        ("Кольца",          "TP, NPR, RIK оригинал",     "Купить в Алматы",      "https://my-avto.kz/zapchasti/koltsa-porshnevye/"),
        ("Вкладыши",        "Taiho, NDC, Daido",         "Коренные и шатунные",  "https://my-avto.kz/zapchasti/vkladyshi/"),
        ("WhatsApp",        "Подбор за 10 минут",        "Бесплатная консультация", "https://wa.me/77015509377"),
        ("О магазине",      "Магазин в Алматы с 2015",   "ТЦ CarCity бутик 135В",   "https://my-avto.kz/o-nas"),
        ("Доставка",        "По всему Казахстану",       "СДЭК, Казпочта",       "https://my-avto.kz/dostavka"),
        ("Контакты",        "ТЦ CarCity, бутик 135В",    "Адрес и часы работы",  "https://my-avto.kz/kontakty"),
    ]
    for text, d1, d2, url in sitelinks:
        sl_rows.append([CAMPAIGN, "Sitelink", text[:25], d1[:35], d2[:35], url])

    out_sl = "/Users/semen/IdeaProjects/myavto-landing/.claude/worktrees/loving-keller-9db10a/google-ads/myavto-sitelinks.csv"
    with open(out_sl, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(sl_rows)
    print(f"✅ Sitelinks: {len(sl_rows)-1} ссылок → {out_sl}")

    # ---------- СВОДКА ----------
    from collections import Counter
    cnt = Counter(r[1] for r in rows[1:])
    print(f"\n📊 ИТОГО:")
    print(f"   Групп: {len(cnt)}")
    print(f"   Ключей всего: {sum(cnt.values())}")
    print(f"   Среднее на группу: {sum(cnt.values()) / len(cnt):.1f}")
    print(f"   Все ключи — Exact match ✅")


if __name__ == "__main__":
    main()
