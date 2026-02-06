/**
 * @file Natural Earth Countries Style
 *
 * Source: composite
 * Source Layer: world
 *
 * @property {string} featurecla
 * @property {number} scalerank
 * @property {number} labelrank
 * @property {string} sovereignt
 * @property {string} sov_a3
 * @property {number} adm0_dif
 * @property {number} level
 * @property {string} type
 * @property {string} tlc
 * @property {string} admin
 * @property {string} adm0_a3
 * @property {number} geou_dif
 * @property {string} geounit
 * @property {string} gu_a3
 * @property {number} su_dif
 * @property {string} subunit
 * @property {string} su_a3
 * @property {number} brk_diff
 * @property {string} name
 * @property {string} name_long
 * @property {string} brk_a3
 * @property {string} brk_name
 * @property {string} abbrev
 * @property {string} postal
 * @property {string} formal_en
 * @property {string} name_ciawf
 * @property {string} name_sort
 * @property {number} mapcolor7
 * @property {number} mapcolor8
 * @property {number} mapcolor9
 * @property {number} mapcolor13
 * @property {number} pop_est
 * @property {number} pop_rank
 * @property {number} pop_year
 * @property {number} gdp_md
 * @property {number} gdp_year
 * @property {string} economy
 * @property {string} income_grp
 * @property {string} fips_10
 * @property {string} iso_a2
 * @property {string} iso_a2_eh
 * @property {string} iso_a3
 * @property {string} iso_a3_eh
 * @property {string} iso_n3
 * @property {string} iso_n3_eh
 * @property {string} un_a3
 * @property {string} wb_a2
 * @property {string} wb_a3
 * @property {number} woe_id
 * @property {number} woe_id_eh
 * @property {string} woe_note
 * @property {string} adm0_iso
 * @property {string} adm0_tlc
 * @property {string} adm0_a3_us
 * @property {string} adm0_a3_fr
 * @property {string} adm0_a3_ru
 * @property {string} adm0_a3_es
 * @property {string} adm0_a3_cn
 * @property {string} adm0_a3_tw
 * @property {string} adm0_a3_in
 * @property {string} adm0_a3_np
 * @property {string} adm0_a3_pk
 * @property {string} adm0_a3_de
 * @property {string} adm0_a3_gb
 * @property {string} adm0_a3_br
 * @property {string} adm0_a3_il
 * @property {string} adm0_a3_ps
 * @property {string} adm0_a3_sa
 * @property {string} adm0_a3_eg
 * @property {string} adm0_a3_ma
 * @property {string} adm0_a3_pt
 * @property {string} adm0_a3_ar
 * @property {string} adm0_a3_jp
 * @property {string} adm0_a3_ko
 * @property {string} adm0_a3_vn
 * @property {string} adm0_a3_tr
 * @property {string} adm0_a3_id
 * @property {string} adm0_a3_pl
 * @property {string} adm0_a3_gr
 * @property {string} adm0_a3_it
 * @property {string} adm0_a3_nl
 * @property {string} adm0_a3_se
 * @property {string} adm0_a3_bd
 * @property {string} adm0_a3_ua
 * @property {number} adm0_a3_un
 * @property {number} adm0_a3_wb
 * @property {string} continent
 * @property {string} region_un
 * @property {string} subregion
 * @property {string} region_wb
 * @property {number} name_len
 * @property {number} long_len
 * @property {number} abbrev_len
 * @property {number} tiny
 * @property {number} homepart
 * @property {number} min_zoom
 * @property {number} min_label
 * @property {number} max_label
 * @property {number} label_x
 * @property {number} label_y
 * @property {number} ne_id
 * @property {string} wikidataid
 * @property {string} fclass_iso
 * @property {string} fclass_tlc
 * @property {string} filename
 * @property {string} note_adm0
 * @property {string} formal_fr
 * @property {string} note_brk
 * @property {string} brk_group
 */

// Default colors which are often overridden by the theme utility in handlers
const LAND = '#F5F5F5';
const OCEAN = '#CFDBED';
const naturalEarthStyle = {
    "version": 8,
    "sources": {
        "composite": {
            "type": "vector",
            "maxzoom": 5,
            "tiles": [
                "https://abcnewsdata.sgp1.digitaloceanspaces.com/map-vector-tiles-natural-earth/{z}/{x}/{y}.pbf"
            ]
        }
    },
    "sprite": "https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite",
    "glyphs": "https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf",
    "layers": [
        {
            "id": "background",
            "type": "background",
            "layout": {
                "visibility": "visible"
            },
            "paint": {
                "background-color": OCEAN
            }
        },
        {
            "id": "countries-fill",
            "type": "fill",
            "source": "composite",
            "source-layer": "world",
            "paint": {
                "fill-color": LAND,
                "fill-outline-color": "#c7c5d0ff"
            }
        }
    ]
}
export default  naturalEarthStyle;