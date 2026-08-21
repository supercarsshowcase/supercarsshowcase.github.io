import type { Car } from "@/lib/types";

/**
 * Static, hand-verified Wikimedia lead images resolved by article title (not
 * by guessing Commons filenames, which are case-sensitive and frequently
 * renamed). Every car and marque has a real photo, so the archive no longer
 * depends on a runtime network fetch to show which machine it is.
 */

const CAR_IMAGES: Record<string, string> = {
  "bugatti-veyron-16-4": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg/960px-Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg",
  "bugatti-veyron-super-sport": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg/960px-Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg",
  "bugatti-chiron": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/960px-Bugatti_Chiron_1.jpg",
  "bugatti-chiron-sport": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/960px-Bugatti_Chiron_1.jpg",
  "bugatti-chiron-super-sport-300": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/960px-Bugatti_Chiron_1.jpg",
  "bugatti-divo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Bugatti_Divo%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0029%29.jpg/960px-Bugatti_Divo%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0029%29.jpg",
  "bugatti-centodieci": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/2022_Bugatti_Centodieci_in_Grigio_Chiaro%2C_front_left.jpg/960px-2022_Bugatti_Centodieci_in_Grigio_Chiaro%2C_front_left.jpg",
  "bugatti-la-voiture-noire": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Bugatti_Chiron_1.jpg/960px-Bugatti_Chiron_1.jpg",
  "bugatti-bolide": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2024_Bugatti_Bolide_4.jpg/960px-2024_Bugatti_Bolide_4.jpg",
  "bugatti-mistral": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Bugatti_Mistral_2.jpg/960px-Bugatti_Mistral_2.jpg",
  "bugatti-tourbillon": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Bugatti_Tourbillon.jpg/960px-Bugatti_Tourbillon.jpg",
  "mercedes-sls-amg": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercedes-Benz_SLS_AMG_%28C_197%29_%E2%80%93_Frontansicht_ge%C3%B6ffnet%2C_10._August_2011%2C_D%C3%BCsseldorf.jpg/960px-Mercedes-Benz_SLS_AMG_%28C_197%29_%E2%80%93_Frontansicht_ge%C3%B6ffnet%2C_10._August_2011%2C_D%C3%BCsseldorf.jpg",
  "mercedes-amg-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg/960px-Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg",
  "mercedes-amg-gt-r": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg/960px-Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg",
  "mercedes-amg-gt-black-series": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg/960px-Festival_automobile_international_2015_-_Mercedes_AMG_GT_-_003.jpg",
  "mercedes-amg-one": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Mercedes-AMG_One_at_the_2022_Goodwood_Festival_of_Speed.jpg/960px-Mercedes-AMG_One_at_the_2022_Goodwood_Festival_of_Speed.jpg",
  "mercedes-amg-gt-63-s-4door": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercedes-Benz_AMG_GT_63S_%2851750035016%29_%28cropped%29.jpg/960px-Mercedes-Benz_AMG_GT_63S_%2851750035016%29_%28cropped%29.jpg",
  "mercedes-amg-c63-s-e-performance": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Mercedes-Benz_C_200_Avantgarde_%28W_205%29_%E2%80%93_Frontansicht%2C_26._April_2014%2C_D%C3%BCsseldorf.jpg/960px-Mercedes-Benz_C_200_Avantgarde_%28W_205%29_%E2%80%93_Frontansicht%2C_26._April_2014%2C_D%C3%BCsseldorf.jpg",
  "mercedes-amg-e63-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Mercedes-Benz_W214_1X7A1841.jpg/960px-Mercedes-Benz_W214_1X7A1841.jpg",
  "mercedes-amg-g63": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Mercedes-Benz_W463_G_350_BlueTEC_01.jpg/960px-Mercedes-Benz_W463_G_350_BlueTEC_01.jpg",
  "mercedes-amg-gle-63-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Mercedes-Benz_GLE_350_d_4MATIC_AMG_Line_%28V_167%29_%E2%80%93_f_18042021.jpg/960px-Mercedes-Benz_GLE_350_d_4MATIC_AMG_Line_%28V_167%29_%E2%80%93_f_18042021.jpg",
  "mercedes-slr-mclaren": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Mercedes-Benz_SLR_McLaren_%288615164079%29.jpg/960px-Mercedes-Benz_SLR_McLaren_%288615164079%29.jpg",
  "mercedes-amg-gt-63-s-e-performance": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercedes-Benz_AMG_GT_63S_%2851750035016%29_%28cropped%29.jpg/960px-Mercedes-Benz_AMG_GT_63S_%2851750035016%29_%28cropped%29.jpg",
  "bmw-m1": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/BMW_M1%2C_front_right_%28Brooklyn%29.jpg/960px-BMW_M1%2C_front_right_%28Brooklyn%29.jpg",
  "bmw-m3-e46-csl": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BMW_M3_Competition_%28G80%29_IMG_4041.jpg/960px-BMW_M3_Competition_%28G80%29_IMG_4041.jpg",
  "bmw-m3": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BMW_M3_Competition_%28G80%29_IMG_4041.jpg/960px-BMW_M3_Competition_%28G80%29_IMG_4041.jpg",
  "bmw-m3-cs": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/BMW_M3_Competition_%28G80%29_IMG_4041.jpg/960px-BMW_M3_Competition_%28G80%29_IMG_4041.jpg",
  "bmw-m4": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2021_BMW_M4_Competition_Automatic_3.0_Front.jpg/960px-2021_BMW_M4_Competition_Automatic_3.0_Front.jpg",
  "bmw-m4-csl": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2021_BMW_M4_Competition_Automatic_3.0_Front.jpg/960px-2021_BMW_M4_Competition_Automatic_3.0_Front.jpg",
  "bmw-m2": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/BMW_G87_M2_1X7A1838.jpg/960px-BMW_G87_M2_1X7A1838.jpg",
  "bmw-m5": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/BMW%2C_Techno_Classica_2018%2C_Essen_%28IMG_8995%29.jpg/960px-BMW%2C_Techno_Classica_2018%2C_Essen_%28IMG_8995%29.jpg",
  "bmw-m5-cs": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/BMW%2C_Techno_Classica_2018%2C_Essen_%28IMG_8995%29.jpg/960px-BMW%2C_Techno_Classica_2018%2C_Essen_%28IMG_8995%29.jpg",
  "bmw-m8-competition": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/BMW_M8_Competition_IMG_3364.jpg/960px-BMW_M8_Competition_IMG_3364.jpg",
  "bmw-xm": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/BMW_XM_%28G09%29_IMG_7778.jpg/960px-BMW_XM_%28G09%29_IMG_7778.jpg",
  "bmw-i8": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/2016_BMW_i8.jpg/960px-2016_BMW_i8.jpg",
  "ferrari-250-gto": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/1962_Ferrari_250_GTO_SP25.jpg/960px-1962_Ferrari_250_GTO_SP25.jpg",
  "ferrari-f40": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/F40_Ferrari_20090509.jpg/960px-F40_Ferrari_20090509.jpg",
  "ferrari-f50": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/1999_Ferrari_F50.jpg/960px-1999_Ferrari_F50.jpg",
  "ferrari-enzo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Orange_Enzo_Ferrari_%287191948164%29.jpg/960px-Orange_Enzo_Ferrari_%287191948164%29.jpg",
  "ferrari-laferrari": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/LaFerrari_in_Beverly_Hills_%2814563979888%29.jpg/960px-LaFerrari_in_Beverly_Hills_%2814563979888%29.jpg",
  "ferrari-488-gtb": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/2018_Ferrari_488_GTB_Spider_S-A_3.9_Front.jpg/960px-2018_Ferrari_488_GTB_Spider_S-A_3.9_Front.jpg",
  "ferrari-812-superfast": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/2019_Ferrari_812_Superfast_S-A_6.5.jpg/960px-2019_Ferrari_812_Superfast_S-A_6.5.jpg",
  "ferrari-f8-tributo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/2020_Ferrari_F8_Tributo_3.9.jpg/960px-2020_Ferrari_F8_Tributo_3.9.jpg",
  "ferrari-sf90-stradale": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Red_2019_Ferrari_SF90_Stradale_%2848264238897%29_%28cropped%29.jpg/960px-Red_2019_Ferrari_SF90_Stradale_%2848264238897%29_%28cropped%29.jpg",
  "ferrari-296-gtb": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/2022_Ferrari_296_%28cropped%29.jpg/960px-2022_Ferrari_296_%28cropped%29.jpg",
  "ferrari-purosangue": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Ferrari_Purosangue_DSC_7008.jpg/960px-Ferrari_Purosangue_DSC_7008.jpg",
  "ferrari-daytona-sp3": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ferrari_Daytona_SP3_front_side_at_CF_2022.jpg/960px-Ferrari_Daytona_SP3_front_side_at_CF_2022.jpg",
  "lamborghini-countach": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg/960px-Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg",
  "lamborghini-diablo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/1995_Lamborghini_Diablo_SE_30.jpg/960px-1995_Lamborghini_Diablo_SE_30.jpg",
  "lamborghini-murcielago": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Lamborghini_Murci%C3%A9lago_LP-640_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2840%29.jpg/960px-Lamborghini_Murci%C3%A9lago_LP-640_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2840%29.jpg",
  "lamborghini-gallardo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Lamborghini_Superleggera-20180708.jpg/960px-Lamborghini_Superleggera-20180708.jpg",
  "lamborghini-aventador": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Lamborghini_Aventador_S_%2844554%29.jpg/960px-Lamborghini_Aventador_S_%2844554%29.jpg",
  "lamborghini-aventador-svj": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Lamborghini_Aventador_S_%2844554%29.jpg/960px-Lamborghini_Aventador_S_%2844554%29.jpg",
  "lamborghini-huracan": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2017_Lamborghini_Huracan_LP610.jpg/960px-2017_Lamborghini_Huracan_LP610.jpg",
  "lamborghini-huracan-sto": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2017_Lamborghini_Huracan_LP610.jpg/960px-2017_Lamborghini_Huracan_LP610.jpg",
  "lamborghini-urus": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Lamborghini_Urus_SE_DSC_8524.jpg/960px-Lamborghini_Urus_SE_DSC_8524.jpg",
  "lamborghini-sian-fkp-37": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Lamborghini_Sian_at_IAA_2019_IMG_0332.jpg/960px-Lamborghini_Sian_at_IAA_2019_IMG_0332.jpg",
  "lamborghini-countach-lpi-800-4": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg/960px-Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg",
  "lamborghini-revuelto": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Lamborghini_Revuelto_DSC_6985_%28cropped%29.jpg/960px-Lamborghini_Revuelto_DSC_6985_%28cropped%29.jpg",
  "porsche-carrera-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Porsche_Carrera_GT_-_Goodwood_Breakfast_Club_%28July_2008%29.jpg/960px-Porsche_Carrera_GT_-_Goodwood_Breakfast_Club_%28July_2008%29.jpg",
  "porsche-918-spyder": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Porsche_918_Spyder_IAA_2013.jpg/960px-Porsche_918_Spyder_IAA_2013.jpg",
  "porsche-911-gt2-rs": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Porsche_991_GT2_RS_%2841654760692%29_%28cropped%29.jpg/960px-Porsche_991_GT2_RS_%2841654760692%29_%28cropped%29.jpg",
  "porsche-911-turbo-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg/960px-Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg",
  "porsche-911-gt3": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Porsche_992_GT3_1X7A0323.jpg/960px-Porsche_992_GT3_1X7A0323.jpg",
  "porsche-911-gt3-rs": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Porsche_992_GT3_1X7A0323.jpg/960px-Porsche_992_GT3_1X7A0323.jpg",
  "porsche-taycan-turbo-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/2020_Porsche_Taycan_4S_79kWh_Front.jpg/960px-2020_Porsche_Taycan_4S_79kWh_Front.jpg",
  "porsche-911-dakar": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg/960px-Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg",
  "porsche-718-cayman-gt4-rs": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/2018_Porsche_718_Cayman_S_S-A_2.5_Front.jpg/960px-2018_Porsche_718_Cayman_S_S-A_2.5_Front.jpg",
  "porsche-panamera-turbo-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Porsche_972_Turbo_E-Hybrid_IMG_0445.jpg/960px-Porsche_972_Turbo_E-Hybrid_IMG_0445.jpg",
  "porsche-911-s-t": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg/960px-Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg",
  "porsche-911-speedster": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg/960px-Porsche_911_No_1000000%2C_70_Years_Porsche_Sports_Car%2C_Berlin_%281X7A3888%29.jpg",
  "mclaren-f1": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/1996_McLaren_F1_Chassis_No_63_6.1_Front.jpg/960px-1996_McLaren_F1_Chassis_No_63_6.1_Front.jpg",
  "mclaren-p1": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/McLaren_P1.jpg/960px-McLaren_P1.jpg",
  "mclaren-senna": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/McLaren_Senna_IMG_3279.jpg/960px-McLaren_Senna_IMG_3279.jpg",
  "mclaren-speedtail": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/McLaren_Speedtail_Genf_2019_1Y7A5636.jpg/960px-McLaren_Speedtail_Genf_2019_1Y7A5636.jpg",
  "mclaren-720s": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2018_McLaren_720S_V8_S-A_4.0.jpg/960px-2018_McLaren_720S_V8_S-A_4.0.jpg",
  "mclaren-765lt": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2018_McLaren_720S_V8_S-A_4.0.jpg/960px-2018_McLaren_720S_V8_S-A_4.0.jpg",
  "mclaren-750s": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2018_McLaren_720S_V8_S-A_4.0.jpg/960px-2018_McLaren_720S_V8_S-A_4.0.jpg",
  "mclaren-artura": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/2021_McLaren_Artura_%281%29.jpg/960px-2021_McLaren_Artura_%281%29.jpg",
  "mclaren-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/2022_McLaren_GT.jpg/960px-2022_McLaren_GT.jpg",
  "mclaren-600lt": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/2017_McLaren_570S%2C_blue%2C_front_left.jpg/960px-2017_McLaren_570S%2C_blue%2C_front_left.jpg",
  "mclaren-elva": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/2021_McLaren_Elva_4.0_Front.jpg/960px-2021_McLaren_Elva_4.0_Front.jpg",
  "mclaren-w1": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/McLaren_W1_%2855129817900%29.jpg/960px-McLaren_W1_%2855129817900%29.jpg",
  "aston-martin-db5": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Aston_Martin_DB5_%28Skyfall%29.jpg/960px-Aston_Martin_DB5_%28Skyfall%29.jpg",
  "aston-martin-one-77": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/2011_Aston_Martin_One-77_SCD_24.jpg/960px-2011_Aston_Martin_One-77_SCD_24.jpg",
  "aston-martin-v12-vantage": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Aston-Martin_Vantage_%281973%29_%2834328531642%29.jpg/960px-Aston-Martin_Vantage_%281973%29_%2834328531642%29.jpg",
  "aston-martin-dbs-superleggera": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/2018_Aston_Martin_DBS_Superleggera_V12_Automatic_5.2_Front.jpg/960px-2018_Aston_Martin_DBS_Superleggera_V12_Automatic_5.2_Front.jpg",
  "aston-martin-db12": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Aston_Martin_DB12_1X7A1921.jpg/960px-Aston_Martin_DB12_1X7A1921.jpg",
  "aston-martin-vantage": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Aston-Martin_Vantage_%281973%29_%2834328531642%29.jpg/960px-Aston-Martin_Vantage_%281973%29_%2834328531642%29.jpg",
  "aston-martin-valkyrie": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Aston_Martin_Valkyrie_Verification_Prototype_001_Genf_2019_1Y7A5569.jpg/960px-Aston_Martin_Valkyrie_Verification_Prototype_001_Genf_2019_1Y7A5569.jpg",
  "aston-martin-valhalla": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2022_Aston_Martin_Valhalla.jpg/960px-2022_Aston_Martin_Valhalla.jpg",
  "aston-martin-vulcan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Aston_Martin_Vulcan_%2827701406352%29.jpg/960px-Aston_Martin_Vulcan_%2827701406352%29.jpg",
  "aston-martin-dbx707": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg/960px-2021_Aston_Martin_DBX_in_Midnight_Blue%2C_front_left.jpg",
  "aston-martin-vanquish": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Aston_Martin_Vanquish_S_-_prawy_prz%C3%B3d_%28MSP17%29.jpg/960px-Aston_Martin_Vanquish_S_-_prawy_prz%C3%B3d_%28MSP17%29.jpg",
  "koenigsegg-ccx": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Koenigsegg_CCX_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2811%29.jpg/960px-Koenigsegg_CCX_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2811%29.jpg",
  "koenigsegg-agera-rs": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/2015_Koenigsegg_Agera_N_%2819886243212%29.jpg/960px-2015_Koenigsegg_Agera_N_%2819886243212%29.jpg",
  "koenigsegg-regera": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Regera_%28light_gradient%29.png/960px-Regera_%28light_gradient%29.png",
  "koenigsegg-jesko": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0833%29.jpg/960px-GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0833%29.jpg",
  "koenigsegg-jesko-absolut": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0833%29.jpg/960px-GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0833%29.jpg",
  "koenigsegg-gemera": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Koenigsegg_Gemera.jpg/960px-Koenigsegg_Gemera.jpg",
  "koenigsegg-cc850": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/2022_Koenigsegg_CC850.jpg/960px-2022_Koenigsegg_CC850.jpg",
  "koenigsegg-one-1": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/2015_Koenigsegg_Agera_N_%2819886243212%29.jpg/960px-2015_Koenigsegg_Agera_N_%2819886243212%29.jpg",
  "pagani-zonda-c12": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg/960px-Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg",
  "pagani-zonda-cinque": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg/960px-Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg",
  "pagani-huayra": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg/960px-Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg",
  "pagani-huayra-bc": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg/960px-Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg",
  "pagani-huayra-r": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg/960px-Pagani%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0023%29.jpg",
  "pagani-utopia": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Pagani_Utopia.jpg/960px-Pagani_Utopia.jpg",
  "pagani-zonda-hp-barchetta": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg/960px-Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg",
  "rolls-royce-phantom": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2019_Rolls-Royce_Phantom_V12_Automatic_6.75.jpg/960px-2019_Rolls-Royce_Phantom_V12_Automatic_6.75.jpg",
  "rolls-royce-ghost": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg/960px-2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg",
  "rolls-royce-cullinan": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/2019_Rolls-Royce_Cullinan_V12_Automatic_6.75_Front.jpg/960px-2019_Rolls-Royce_Cullinan_V12_Automatic_6.75_Front.jpg",
  "rolls-royce-spectre": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/2024_Rolls-Royce_Spectre_in_Midnight_Sapphire_over_Silver%2C_front_left.jpg/960px-2024_Rolls-Royce_Spectre_in_Midnight_Sapphire_over_Silver%2C_front_left.jpg",
  "rolls-royce-wraith": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/2019_Rolls-Royce_Wraith_V12_Automatic_6.6.jpg/960px-2019_Rolls-Royce_Wraith_V12_Automatic_6.6.jpg",
  "rolls-royce-dawn": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/2019_Rolls-Royce_Dawn_V12_Automatic_6.6.jpg/960px-2019_Rolls-Royce_Dawn_V12_Automatic_6.6.jpg",
  "rolls-royce-boat-tail": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Rolls-Royce_Boat_Tail_side.png/960px-Rolls-Royce_Boat_Tail_side.png",
  "rolls-royce-black-badge-ghost": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg/960px-2022_Rolls-Royce_Ghost_Black_Badge_in_Arctic_White%2C_front_left.jpg",
  "bentley-continental-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "bentley-continental-gt-speed": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "bentley-flying-spur": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Bentley_Flying_Spur_W12_Speed_%282019%29_1X7A1636.jpg/960px-Bentley_Flying_Spur_W12_Speed_%282019%29_1X7A1636.jpg",
  "bentley-bentayga": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg/960px-Bentley_Bentayga_V8_%28FL%29_IMG_0005.jpg",
  "bentley-bacalar": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "bentley-batur": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "bentley-mulsanne": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Bentley_Mulsanne_%E2%80%93_Frontansicht_%285%29%2C_30._August_2011%2C_D%C3%BCsseldorf.jpg/960px-Bentley_Mulsanne_%E2%80%93_Frontansicht_%285%29%2C_30._August_2011%2C_D%C3%BCsseldorf.jpg",
  "bentley-continental-supersports": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "audi-r8-v10": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2018_Audi_R8_Coupe_V10_plus_Front.jpg/960px-2018_Audi_R8_Coupe_V10_plus_Front.jpg",
  "audi-r8-v10-performance": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2018_Audi_R8_Coupe_V10_plus_Front.jpg/960px-2018_Audi_R8_Coupe_V10_plus_Front.jpg",
  "audi-rs6-avant": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/2021_Audi_RS6_Avant_in_Nardo_Gray%2C_front_right.jpg/960px-2021_Audi_RS6_Avant_in_Nardo_Gray%2C_front_right.jpg",
  "audi-rs7-sportback": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2018_Audi_A7_S_Line_40_TDi_S-A_2.0.jpg/960px-2018_Audi_A7_S_Line_40_TDi_S-A_2.0.jpg",
  "audi-rs3": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Audi_A3_8Y_Sedan_IMG_5936.jpg/960px-Audi_A3_8Y_Sedan_IMG_5936.jpg",
  "audi-e-tron-gt-rs": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Audi_e-tron_GT_IMG_5689.jpg/960px-Audi_e-tron_GT_IMG_5689.jpg",
  "audi-rs-q8": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/2018_Audi_Q8_S_Line_50_TDi_Quattro_3.0_Front.jpg/960px-2018_Audi_Q8_S_Line_50_TDi_Quattro_3.0_Front.jpg",
  "audi-r8-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2018_Audi_R8_Coupe_V10_plus_Front.jpg/960px-2018_Audi_R8_Coupe_V10_plus_Front.jpg",
  "jaguar-e-type": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jaguar_E-Type_Series_1_3.8_Litre_1961.jpg/960px-Jaguar_E-Type_Series_1_3.8_Litre_1961.jpg",
  "jaguar-xj220": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/JaguarXJ220.jpg/960px-JaguarXJ220.jpg",
  "jaguar-f-type-svr": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/2017_Jaguar_F-Type_V6_R-Dynamic_Automatic_3.0_Front.jpg/960px-2017_Jaguar_F-Type_V6_R-Dynamic_Automatic_3.0_Front.jpg",
  "jaguar-f-type-r": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/2017_Jaguar_F-Type_V6_R-Dynamic_Automatic_3.0_Front.jpg/960px-2017_Jaguar_F-Type_V6_R-Dynamic_Automatic_3.0_Front.jpg",
  "jaguar-xkr-s": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Coup%C3%A9_Jaguar_XKR_%28X150%29_ventral.jpg/960px-Coup%C3%A9_Jaguar_XKR_%28X150%29_ventral.jpg",
  "jaguar-project-8": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/2019_Jaguar_XE_S_Automatic_2.0.jpg/960px-2019_Jaguar_XE_S_Automatic_2.0.jpg",
  "maserati-mc20": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Maserati_MC20_IAA_2021_1X7A0087.jpg/960px-Maserati_MC20_IAA_2021_1X7A0087.jpg",
  "maserati-granturismo-trofeo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Maserati_GranTurismo_Trofeo_1X7A0828.jpg/960px-Maserati_GranTurismo_Trofeo_1X7A0828.jpg",
  "maserati-mc12": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/MC12._%285234528513%29.jpg/960px-MC12._%285234528513%29.jpg",
  "maserati-ghibli-trofeo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/2018_Maserati_Ghibli_GranLusso_Diesel_3.0_facelift_Front.jpg/960px-2018_Maserati_Ghibli_GranLusso_Diesel_3.0_facelift_Front.jpg",
  "maserati-quattroporte-trofeo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/2015_Maserati_Quattroporte_DV6_Automatic_3.0_Front.jpg/960px-2015_Maserati_Quattroporte_DV6_Automatic_3.0_Front.jpg",
  "maserati-mc20-cielo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Maserati_MC20_IAA_2021_1X7A0087.jpg/960px-Maserati_MC20_IAA_2021_1X7A0087.jpg",
  "lotus-evija": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2020_Lotus_Evija.jpg/960px-2020_Lotus_Evija.jpg",
  "lotus-emira": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/2024_Lotus_Emira_First_Edition_3.jpg/960px-2024_Lotus_Emira_First_Edition_3.jpg",
  "lotus-exige-sport-410": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Lotus_Exige_Sport_380.jpg/960px-Lotus_Exige_Sport_380.jpg",
  "lotus-elise": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Lotus_Elise_Club_Racer_%28front_quarter%29.jpg/960px-Lotus_Elise_Club_Racer_%28front_quarter%29.jpg",
  "lotus-esprit-v8": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/1999_Lotus_Esprit_V8_type_918.jpg/960px-1999_Lotus_Esprit_V8_type_918.jpg",
  "lotus-3-eleven": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Lotus_3-Eleven_1Y7A6172.jpg/960px-Lotus_3-Eleven_1Y7A6172.jpg",
  "rimac-nevera": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Rimac_Nevera.jpg/960px-Rimac_Nevera.jpg",
  "rimac-concept-one": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/2016-03-01_Geneva_Motor_Show_0977_%28cropped%29.JPG/960px-2016-03-01_Geneva_Motor_Show_0977_%28cropped%29.JPG",
  "rimac-nevera-r": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Rimac_Nevera.jpg/960px-Rimac_Nevera.jpg",
  "hennessey-venom-gt": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Hennessey_Venom_GT_%2816040233465%29.jpg/960px-Hennessey_Venom_GT_%2816040233465%29.jpg",
  "hennessey-venom-f5": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/2022_Hennessey_Venom_F5_Roadster_6.6_Front.jpg/960px-2022_Hennessey_Venom_F5_Roadster_6.6_Front.jpg",
  "hennessey-venom-f5-revolution": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/2022_Hennessey_Venom_F5_Roadster_6.6_Front.jpg/960px-2022_Hennessey_Venom_F5_Roadster_6.6_Front.jpg",
};

const BRAND_IMAGES: Record<string, string> = {
  Bugatti: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg/960px-Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%281%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg",
  "Mercedes-AMG": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Mercedes-Benz_SLS_AMG_%28C_197%29_%E2%80%93_Frontansicht_ge%C3%B6ffnet%2C_10._August_2011%2C_D%C3%BCsseldorf.jpg/960px-Mercedes-Benz_SLS_AMG_%28C_197%29_%E2%80%93_Frontansicht_ge%C3%B6ffnet%2C_10._August_2011%2C_D%C3%BCsseldorf.jpg",
  "BMW M": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/BMW_M1%2C_front_right_%28Brooklyn%29.jpg/960px-BMW_M1%2C_front_right_%28Brooklyn%29.jpg",
  Ferrari: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/1962_Ferrari_250_GTO_SP25.jpg/960px-1962_Ferrari_250_GTO_SP25.jpg",
  Lamborghini: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg/960px-Lamborghini_Countach_-_Flickr_-_exfordy_%282%29_%28cropped-2%29.jpg",
  Porsche: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Porsche_Carrera_GT_-_Goodwood_Breakfast_Club_%28July_2008%29.jpg/960px-Porsche_Carrera_GT_-_Goodwood_Breakfast_Club_%28July_2008%29.jpg",
  McLaren: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/1996_McLaren_F1_Chassis_No_63_6.1_Front.jpg/960px-1996_McLaren_F1_Chassis_No_63_6.1_Front.jpg",
  "Aston Martin": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Aston_Martin_DB5_%28Skyfall%29.jpg/960px-Aston_Martin_DB5_%28Skyfall%29.jpg",
  Koenigsegg: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Koenigsegg_CCX_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2811%29.jpg/960px-Koenigsegg_CCX_-_Flickr_-_Alexandre_Pr%C3%A9vot_%2811%29.jpg",
  Pagani: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg/960px-Pagani_Zonda_C12_%27chassis_001%27_Genf_2019_1Y7A5539.jpg",
  "Rolls-Royce": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2019_Rolls-Royce_Phantom_V12_Automatic_6.75.jpg/960px-2019_Rolls-Royce_Phantom_V12_Automatic_6.75.jpg",
  Bentley: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg/960px-Bentley_Continental_GT_First_Edition_%2849919050697%29_%28cropped%29_%28cropped%29.jpg",
  "Audi Sport": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/2018_Audi_R8_Coupe_V10_plus_Front.jpg/960px-2018_Audi_R8_Coupe_V10_plus_Front.jpg",
  Jaguar: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jaguar_E-Type_Series_1_3.8_Litre_1961.jpg/960px-Jaguar_E-Type_Series_1_3.8_Litre_1961.jpg",
  Maserati: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Maserati_MC20_IAA_2021_1X7A0087.jpg/960px-Maserati_MC20_IAA_2021_1X7A0087.jpg",
  Lotus: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2020_Lotus_Evija.jpg/960px-2020_Lotus_Evija.jpg",
  Rimac: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Rimac_Nevera.jpg/960px-Rimac_Nevera.jpg",
  Hennessey: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Hennessey_Venom_GT_%2816040233465%29.jpg/960px-Hennessey_Venom_GT_%2816040233465%29.jpg",
};

/**
 * Build the Wikipedia article title most likely to hold a lead photo for a
 * car. Some marque names are prefixes rather than part of the article title.
 * This is kept as the network fallback if a static image ever fails to load.
 */
export function carWikiTitle(car: Car): string {
  if (car.brand === "BMW M") return `BMW ${car.model}`;
  if (car.brand === "Audi Sport") return `Audi ${car.model}`;
  if (car.brand === "Mercedes-AMG") {
    return `Mercedes-AMG ${car.model.replace(/^AMG\s+/i, "")}`;
  }
  return `${car.brand} ${car.model}`;
}

/** Wikimedia only serves its standard thumbnail buckets, so swap the width. */
export function resizeWikiImage(src: string, width: number): string {
  return src.replace(/\/\d+px-/, `/${width}px-`);
}

export interface GalleryImage {
  src: string;
  label: string;
  seed: string;
}

const GALLERY_VIEWS: { key: string; label: string }[] = [
  { key: "front", label: "Studio front" },
  { key: "marque", label: "Marque archive" },
  { key: "rear", label: "Rear three-quarter" },
  { key: "side", label: "Side profile" },
  { key: "cockpit", label: "Cockpit" },
];

/**
 * Five distinct pictures per car. The primary view uses a real photo and the
 * second view uses the marque's real photo; the remaining views are
 * deterministic generated scenes so the gallery is always full and always
 * unique to that car.
 */
export function getCarGallery(car: Car): GalleryImage[] {
  const carSrc = CAR_IMAGES[car.slug] ?? "";
  const brandSrc = BRAND_IMAGES[car.brand] ?? "";

  return GALLERY_VIEWS.map((view, index) => {
    let src = "";
    if (index === 0) src = carSrc;
    if (index === 1) src = brandSrc !== carSrc ? brandSrc : "";
    return {
      src,
      label: view.label,
      seed: `${car.slug}:${view.key}`,
    };
  });
}

/** The primary (front) image for a car — verified static photo. */
export function getCarImage(car: Car): string {
  return CAR_IMAGES[car.slug] ?? "";
}

/** A higher-resolution (1920px) version for the detail-page hero. */
export function getCarImageHiRes(car: Car): string {
  const src = getCarImage(car);
  return src ? resizeWikiImage(src, 1920) : "";
}

export function getBrandImage(brand: string): string {
  return BRAND_IMAGES[brand] ?? "";
}
