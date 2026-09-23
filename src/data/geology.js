/**
 * Real geology for the Landsat scenes, harvested once and baked in.
 *
 * Keyed by the scene label in letters.js. `relief` is the spread of SRTM
 * elevations over roughly a 10 km grid around the point — the number that
 * separates a floodplain from a mountain front — and `lith` is the bedrock
 * Macrostrat reports there.
 *
 * Sources: Nominatim (OSM, ODbL), OpenTopoData/SRTM, Macrostrat (CC-BY 4.0).
 * Regenerate with scripts/harvest-geo.mjs.
 */
export const GEOLOGY = {
 "Akimiski Island, Canada": {
  "lat": 52.94,
  "lng": -81.31,
  "elev": 18,
  "relief": 27,
  "lith": "sedimentary",
  "era": "Paleozoic",
  "unit": "Early Silurian sedimentary"
 },
 "Amazon River, Brazil": {
  "lat": -1.128,
  "lng": -51.22,
  "elev": 18,
  "relief": 28
 },
 "Amazon River, Peru": {
  "lat": -3.893,
  "lng": -73.187,
  "elev": 103,
  "relief": 47,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Araguaia River, Brazil": {
  "lat": -8.27,
  "lng": -49.268,
  "elev": 199,
  "relief": 308,
  "lith": "sand, clay, gravel, silt; alluvium",
  "era": "Holocene",
  "unit": "Depósitos aluvionares"
 },
 "Bamforth National Wildlife Refuge, Wyoming": {
  "lat": 41.372,
  "lng": -105.739,
  "elev": 2194,
  "relief": 122,
  "lith": "Major:{clay,silt,sand}, Minor:{gravel}",
  "era": "Cenozoic",
  "unit": "Alluvium and Colluvium"
 },
 "Biobío River, Chile": {
  "lat": -37.69,
  "lng": -71.972,
  "elev": 365,
  "relief": 268,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Black Rock Desert, Nevada": {
  "lat": 41.083,
  "lng": -118.797,
  "elev": 1210,
  "relief": 120,
  "lith": "sedimentary",
  "era": "Cenozoic",
  "unit": "Quaternary sedimentary"
 },
 "Bogda Mountains": {
  "lat": 43.773,
  "lng": 88.244,
  "elev": 3353,
  "relief": 2146,
  "lith": "intermediate-felsic volcanic rocks",
  "era": "Paleozoic",
  "unit": "Paleozoic volcanic rocks"
 },
 "Borgarbyggð, Iceland": {
  "lat": 64.538,
  "lng": -21.92,
  "lith": "basalt, olivine basalt, tholeiite, alkali basalt, basanite, pillow basalt, flood basalt",
  "era": "Miocene",
  "unit": "Igneous: extrusive; Extrusive: mafic"
 },
 "Breiðamerkurjökull, Iceland": {
  "lat": 64.179,
  "lng": -16.468
 },
 "Brunswick, Maryland": {
  "lat": 39.313,
  "lng": -77.628,
  "elev": 157,
  "relief": 254,
  "lith": "paragneiss; paragneiss/metavolcanic gneiss",
  "era": "Mesoproterozoic",
  "unit": "Mesoproterozoic crystalline metamorphic rocks"
 },
 "Canandaigua Lake, New York": {
  "lat": 42.772,
  "lng": -77.309,
  "elev": 320,
  "relief": 388,
  "lith": "sedimentary rocks",
  "era": "",
  "unit": "Paleozoic sedimentary rocks"
 },
 "Canyonlands National Park, Utah": {
  "lat": 38.233,
  "lng": -109.921,
  "elev": 1500,
  "relief": 452,
  "lith": "Major:{sandstone}, Minor:{siltstone mudstone,limestone}",
  "era": "Cisuralian",
  "unit": "Cutler Group"
 },
 "Conesus Lake, New York": {
  "lat": 42.773,
  "lng": -77.718,
  "elev": 313,
  "relief": 342,
  "lith": "sedimentary",
  "era": "Devonian",
  "unit": "Late Devonian sedimentary"
 },
 "Crater Lake, Oregon": {
  "lat": 42.942,
  "lng": -122.099,
  "elev": 1933,
  "relief": 562
 },
 "Estuario de Virrila, Peru": {
  "lat": -5.829,
  "lng": -80.856,
  "elev": 15,
  "relief": 61,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Etosha National Park, Namibia": {
  "lat": -18.991,
  "lng": 15.746,
  "elev": 1115,
  "relief": 30,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "False River, Louisiana": {
  "lat": 30.57,
  "lng": -91.593,
  "elev": 13,
  "relief": 18,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Farm Island, Maine": {
  "lat": 46.35,
  "lng": -69.377,
  "elev": 316,
  "relief": 97,
  "lith": "sedimentary rocks",
  "era": "",
  "unit": "Paleozoic sedimentary rocks"
 },
 "Florida Keys": {
  "lat": 24.674,
  "lng": -81.498,
  "elev": 1,
  "relief": 7,
  "lith": "sedimentary",
  "era": "Cenozoic",
  "unit": "Quaternary sedimentary"
 },
 "Fonte Boa, Amazonas": {
  "lat": -2.515,
  "lng": -66.095,
  "elev": 63,
  "relief": 47,
  "lith": "sand, clay, peat, gravel, lignite",
  "era": "Cenozoic",
  "unit": "Içá Formação"
 },
 "Fonte Boa, Amazonas, Brazil": {
  "lat": -2.515,
  "lng": -66.095,
  "elev": 63,
  "relief": 47,
  "lith": "sand, clay, peat, gravel, lignite",
  "era": "Cenozoic",
  "unit": "Içá Formação"
 },
 "Golmud, China": {
  "lat": 36.74,
  "lng": 93.542,
  "elev": 2993,
  "relief": 815,
  "lith": "sedimentary rocks",
  "era": "Neoproterozoic",
  "unit": "Neoproterozoic sedimentary rocks"
 },
 "Great Barrier Reef": {
  "lat": -16.35,
  "lng": 145.9,
  "elev": 0,
  "relief": 0
 },
 "Great Fish River Nature Reserve, South Africa": {
  "lat": -33.025,
  "lng": 26.812,
  "elev": 369,
  "relief": 435
 },
 "Hickman, Kentucky": {
  "lat": 36.69,
  "lng": -88.959,
  "elev": 115,
  "relief": 44,
  "lith": "Major:{fine alluvium}, Minor:{gravel,sand}",
  "era": "Cenozoic",
  "unit": "Continental deposits and loess, undifferentiated"
 },
 "Holla Bend, Arkansas": {
  "lat": 35.166,
  "lng": -93.052,
  "elev": 121,
  "relief": 154,
  "lith": "sandstone,shale,coal",
  "era": "Bashkirian",
  "unit": "Bashkirian sedimentary"
 },
 "Hudson Bay, Ontario, Canada": {
  "lat": 55.92,
  "lng": -87.82,
  "elev": 25,
  "relief": 17,
  "lith": "limestone, dolostone, shale, sandstone, gypsum, salt",
  "era": "Paleozoic",
  "unit": "Kenogami River Formation (Upper Silurian to Lower Devonian)"
 },
 "Humaitá, Brazil": {
  "lat": -27.566,
  "lng": -53.972,
  "elev": 378,
  "relief": 244,
  "lith": "andesite, basalt",
  "era": "Mesozoic",
  "unit": "Paranapanema Fácies"
 },
 "Karakaya Dam, Turkey": {
  "lat": 38.226,
  "lng": 39.135,
  "elev": 1205,
  "relief": 1661,
  "lith": "greenschist",
  "era": "",
  "unit": "Amphibolite and Greenschist facies"
 },
 "Khorinsky District, Russia": {
  "lat": 52.463,
  "lng": 109.554,
  "elev": 1209,
  "relief": 839,
  "lith": "intrusive igneous rocks",
  "era": "",
  "unit": "Paleozoic intrusive rocks"
 },
 "Kruger National Park, South Africa": {
  "lat": -23.936,
  "lng": 31.508,
  "elev": 302,
  "relief": 162,
  "lith": "crystalline metamorphic rocks",
  "era": "Archean",
  "unit": "Archean crystalline metamorphic rocks"
 },
 "La Primavera, Colombia": {
  "lat": 5.49,
  "lng": -70.41,
  "elev": 111,
  "relief": 27
 },
 "Lac Assinica, Quebec, Canada": {
  "lat": 50.519,
  "lng": -75.214,
  "elev": 373,
  "relief": 83,
  "lith": "intrusive igneous rocks",
  "era": "Neoarchean",
  "unit": "Archean intrusive rocks"
 },
 "Lago Menendez, Argentina": {
  "lat": -42.677,
  "lng": -71.829,
  "elev": 1022,
  "relief": 1326,
  "lith": "intrusive igneous rocks",
  "era": "Phanerozoic",
  "unit": "Mesozoic-Cenozoic intrusive rocks"
 },
 "Lake Superior, North America": {
  "lat": 36.116,
  "lng": -79.616,
  "elev": 220,
  "relief": 69,
  "lith": "plutonic: undivided granitic rocks",
  "era": "",
  "unit": "Neoproterozoic-Cambrian plutonic: undivided granitic rocks"
 },
 "Lake Tandou, Australia": {
  "lat": -32.622,
  "lng": 142.07,
  "elev": 66,
  "relief": 39,
  "lith": "laterite,clay,gravel,sand,silt",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Lake Waccamaw, North Carolina": {
  "lat": 34.322,
  "lng": -78.522,
  "elev": 21,
  "relief": 27,
  "lith": "sedimentary rocks",
  "era": "Mesozoic",
  "unit": "Mesozoic sedimentary rocks"
 },
 "Liwa, United Arab Emirates": {
  "lat": 23.136,
  "lng": 53.788,
  "elev": 138,
  "relief": 93,
  "lith": "sandstone-siltstone",
  "era": "Holocene",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Lonar Crater, India": {
  "lat": 19.974,
  "lng": 76.498,
  "elev": 545,
  "relief": 114,
  "lith": "flood basalt(s); mafic volcanic rocks; basalt",
  "era": "Phanerozoic",
  "unit": "Mesozoic-Cenozoic volcanic rocks"
 },
 "Mackenzie River": {
  "lat": 67.449,
  "lng": -131.226,
  "lith": "sedimentary",
  "era": "Devonian",
  "unit": "Late Devonian sedimentary"
 },
 "Manicouagan Reservoir": {
  "lat": 51.37,
  "lng": -68.295,
  "elev": 377,
  "relief": 206,
  "lith": "crystalline metamorphic rocks",
  "era": "Proterozoic",
  "unit": "Paleoproterozoic-Mesoproterozoic crystalline metamorphic rocks"
 },
 "Mapleton, Maine": {
  "lat": 46.682,
  "lng": -68.162,
  "elev": 191,
  "relief": 152,
  "lith": "sedimentary rocks",
  "era": "",
  "unit": "Paleozoic sedimentary rocks"
 },
 "Mato Grosso, Brazil": {
  "lat": -12.212,
  "lng": -55.572,
  "elev": 348,
  "relief": 75,
  "lith": "sand, gravel; alluvium",
  "era": "Holocene",
  "unit": "Depósitos aluvionares"
 },
 "Mohammed Boudiaf, Algeria": {
  "lat": 34.899,
  "lng": 4.43,
  "elev": 853,
  "relief": 475
 },
 "Mount Tambora, Indonesia": {
  "lat": -8.276,
  "lng": 117.997,
  "elev": 1225,
  "relief": 2145,
  "lith": "mafic-intermediate volcanic rocks",
  "era": "Neogene",
  "unit": "Cenozoic volcanic rocks"
 },
 "N'Djamena, Chad": {
  "lat": 12.119,
  "lng": 15.05,
  "elev": 295,
  "relief": 8,
  "lith": "sedimentary",
  "era": "Cenozoic",
  "unit": ""
 },
 "New South Wales, Australia": {
  "lat": -32.163,
  "lng": 147.032,
  "elev": 220,
  "relief": 55,
  "lith": "sedimentary",
  "era": "Ordovician",
  "unit": "Ordovician sedimentary rocks "
 },
 "Nusantara, Indonesia": {
  "lat": 0,
  "lng": 120,
  "elev": 259,
  "relief": 939,
  "lith": "deformed sedimentary, metamorphic, and igneous rocks",
  "era": "Phanerozoic",
  "unit": "Mesozoic-Cenozoic tectonic rocks"
 },
 "Padma River, Bangladesh": {
  "lat": 23.578,
  "lng": 90.009,
  "elev": 5,
  "relief": 14,
  "lith": "sedimentary rocks",
  "era": "Neogene",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Pennsylvania Hills": {
  "lat": 40.674,
  "lng": -73.896,
  "elev": 13,
  "relief": 46,
  "lith": "Major:{clay}, Minor:{sand,silt}, Incidental:{gravel}",
  "era": "Late Cretaceous",
  "unit": "Raritan Formation"
 },
 "Potomac River": {
  "lat": 39.074,
  "lng": -77.428,
  "elev": 92,
  "relief": 64,
  "lith": "gravel",
  "era": "Holocene",
  "unit": "quaternary alluvium"
 },
 "Primavera do Leste, Brazil": {
  "lat": -15.561,
  "lng": -54.299,
  "elev": 587,
  "relief": 189,
  "lith": "sedimentary rocks",
  "era": "Mesozoic",
  "unit": "Mesozoic sedimentary rocks"
 },
 "Regina, Saskatchewan": {
  "lat": 50.448,
  "lng": -104.616,
  "elev": 579,
  "relief": 37,
  "lith": "siltstone,shale,sandstone",
  "era": "Late Cretaceous",
  "unit": "Mesozoic sedimentary rocks"
 },
 "Regina, Saskatchewan, Canada": {
  "lat": 50.448,
  "lng": -104.616,
  "elev": 579,
  "relief": 37,
  "lith": "siltstone,shale,sandstone",
  "era": "Late Cretaceous",
  "unit": "Mesozoic sedimentary rocks"
 },
 "Riberalta, Bolivia": {
  "lat": -10.997,
  "lng": -66.075,
  "elev": 141,
  "relief": 59,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Río Chapare, Bolivia": {
  "lat": -16.52,
  "lng": -64.972,
  "elev": 206,
  "relief": 30,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Sea of Okhotsk": {
  "lat": 55,
  "lng": 150
 },
 "Sermersooq, Greenland": {
  "lat": 66,
  "lng": -40
 },
 "Shenandoah River, Virginia": {
  "lat": 39.098,
  "lng": -77.953,
  "elev": 200,
  "relief": 350,
  "lith": "dolostone",
  "era": "Series 2",
  "unit": "Tomstown Formation"
 },
 "Sirmilik National Park, Canada": {
  "lat": 73.255,
  "lng": -78.562,
  "lith": "plutonic: undivided granitic rocks",
  "era": "",
  "unit": "Neoarchean-Paleoproterozoic plutonic: undivided granitic rocks"
 },
 "São Miguel do Araguaia, Brazil": {
  "lat": -13.273,
  "lng": -50.163,
  "elev": 315,
  "relief": 134,
  "lith": "low-medium grade metasedimentary/metavolcanic schist",
  "era": "Paleoproterozoic",
  "unit": "Paleoproterozoic crystalline metamorphic rocks"
 },
 "Tasman Glacier, New Zealand": {
  "lat": -43.574,
  "lng": 170.228,
  "elev": 1841,
  "relief": 1889
 },
 "Wolstenholme Fjord, Greenland": {
  "lat": 76.603,
  "lng": -67.827,
  "lith": "shale,sandstone",
  "era": "Mesoproterozoic",
  "unit": "Mesoproterozoic sedimentary rocks"
 },
 "Woodstock Dam, South Africa": {
  "lat": -28.743,
  "lng": 29.204,
  "elev": 1287,
  "relief": 474
 },
 "Xinjiang, China": {
  "lat": 42.48,
  "lng": 85.463,
  "elev": 3225,
  "relief": 2136,
  "lith": "sedimentary rocks",
  "era": "Paleozoic",
  "unit": "Paleozoic sedimentary rocks"
 },
 "Yapacaní, Bolivia": {
  "lat": -16.994,
  "lng": -64.067,
  "elev": 247,
  "relief": 23,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Yukon Delta, Alaska": {
  "lat": 61.194,
  "lng": -149.897,
  "lith": "sedimentary rocks",
  "era": "Cenozoic",
  "unit": "Cenozoic sedimentary rocks"
 },
 "Yukon, Canada": {
  "lat": 63,
  "lng": -136.003,
  "lith": "sandstone, siltstone, shale, limestone or metamorphosed equivalent",
  "era": "",
  "unit": "Sedimentary; Sedimentary: undivided"
 }
}
