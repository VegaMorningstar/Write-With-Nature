/**
 * Where each Landsat scene actually is, as NASA publishes it.
 *
 * Keyed by the image's path under images/, without its extension, so a scene
 * joins to letters.js by url regardless of whether the .png or the .webp is
 * being served.
 *
 * `lat`/`lng` are signed decimal degrees, decoded from the `dms` string NASA
 * shows. `nasa` is their write-up of the scene and `map` their Google Maps
 * pin, both as published.
 *
 * These are per-scene, not per-place. Two scenes sharing a name can sit a long
 * way apart — NASA has two Regina scenes 31km apart and three Amazon River
 * ones — which is why this is not keyed by the label the way geology.js is.
 *
 * Generated; regenerate with scripts/harvest-nasa-coords.mjs.
 * 120 of 122 scenes. Without coordinates, because NASA's
 * interactive does not carry them: F/f-1-KrugerNationalPark-SouthAfrica, V/v-2-PadmaRiver-Bangladesh.
 */
export const COORDS = {
 "0/0-0-LakeWaccamaw-NorthCarolina-USA-NIR": {
  "place": "Lake Waccamaw, North Carolina, USA",
  "lat": 34.28797,
  "lng": -78.51231,
  "dms": "34°17'16.7\"N 78°30'44.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/a6CYbuVE8AyKUnpm6"
 },
 "0/0-1-LakeWaccamaw-NorthCarolina-USA-SWIR": {
  "place": "Lake Waccamaw, North Carolina, USA",
  "lat": 34.28797,
  "lng": -78.51231,
  "dms": "34°17'16.7\"N 78°30'44.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/a6CYbuVE8AyKUnpm6"
 },
 "1/1-0-ConsensusLake-NewYork-US": {
  "place": "Conesus Lake, New York, United States",
  "lat": 42.78639,
  "lng": -77.71614,
  "dms": "42°47'11.0 N 77°42'58.1 W",
  "nasa": "https://go.nasa.gov/4uwXNhq",
  "map": "https://maps.app.goo.gl/jNsDTfUadwb8jBVL6"
 },
 "2/2-0-PennsylvaniaHills-US": {
  "place": "Pennsylvania Hills, United States",
  "lat": 40.36656,
  "lng": -78.35658,
  "dms": "40°21'59.6\"N 78°21'23.7\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/painting-pennsylvania-hills-147580/",
  "map": "https://maps.app.goo.gl/ux2zyVqonjbAUXdP6"
 },
 "2/2-1-PennsylvaniaHills-US-NIR": {
  "place": "Pennsylvania Hills, United States",
  "lat": 40.36656,
  "lng": -78.35658,
  "dms": "40°21'59.6\"N 78°21'23.7\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/painting-pennsylvania-hills-147580/",
  "map": "https://maps.app.goo.gl/ux2zyVqonjbAUXdP6"
 },
 "2/2-2-GreatFishRiverNatureReserve-SouthAfrica": {
  "place": "Great Fish River Nature Reserve, South Africa",
  "lat": -33.06572,
  "lng": 26.83136,
  "dms": "33°03'56.6\"S 26°49'52.9\"E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/MygAmafYKnBZxECi7"
 },
 "2/2-3-GreatFishRiverNatureReserve-SouthAfrica-NIR": {
  "place": "Great Fish River Nature Reserve, South Africa",
  "lat": -33.06572,
  "lng": 26.83136,
  "dms": "33°03'56.6\"S 26°49'52.9\"E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/MygAmafYKnBZxECi7"
 },
 "3/3-0-LakeMassinger-Mozmbique": {
  "place": "Lake Massinger, Mozambique",
  "lat": -23.88711,
  "lng": 32.04853,
  "dms": "23°53'13.6\"S 32°02'54.7\"E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/tLmRsnQR1MvJBJXx7"
 },
 "3/3-1-LakeMassinger-Mozmbique-NIR": {
  "place": "Lake Massinger, Mozambique",
  "lat": -23.88711,
  "lng": 32.04853,
  "dms": "23°53'13.6\"S 32°02'54.7\"E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/tLmRsnQR1MvJBJXx7"
 },
 "3/3-2-ProvinceOfSondrio-Italy": {
  "place": "Province of Sondrio, Italy",
  "lat": 46.29397,
  "lng": 9.42069,
  "dms": "46°17'38.3 N 9°25'14.5 E",
  "nasa": "https://go.nasa.gov/4dHu1jc",
  "map": "https://maps.app.goo.gl/cuNbj9CouRM7pzg99"
 },
 "3/3-3-ProvinceOfSondrio-Italy-NIR": {
  "place": "Province of Sondrio, Italy",
  "lat": 46.29397,
  "lng": 9.42069,
  "dms": "46°17'38.3 N 9°25'14.5 E",
  "nasa": "https://go.nasa.gov/4dHu1jc",
  "map": "https://maps.app.goo.gl/cuNbj9CouRM7pzg99"
 },
 "4/4-0-LacAssinica-Quebec-Canada-NIR": {
  "place": "Lac Assinica, Quebec, Canada",
  "lat": 50.40947,
  "lng": -74.96333,
  "dms": "50°24'34.1\"N 74°57'48.0\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/ikEWbcgFsMvTkx7X6"
 },
 "4/4-1-LacAssinica-Quebec-Canada-SWIR": {
  "place": "Lac Assinica, Quebec, Canada",
  "lat": 50.40947,
  "lng": -74.96333,
  "dms": "50°24'34.1\"N 74°57'48.0\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/ikEWbcgFsMvTkx7X6"
 },
 "5/5-0-Yukon-Canada": {
  "place": "Yukon, Canada",
  "lat": 66.34047,
  "lng": -134.35047,
  "dms": "66°20'25.7\"N 134°21'01.7\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/1mni2QzeFdrWW8hP6"
 },
 "5/5-1-Yukon-Canada-NIR": {
  "place": "Yukon, Canada",
  "lat": 66.34047,
  "lng": -134.35047,
  "dms": "66°20'25.7\"N 134°21'01.7\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/1mni2QzeFdrWW8hP6"
 },
 "6/6-AmazonRiver-Peru": {
  "place": "Amazon River, Peru",
  "lat": -4.19047,
  "lng": -73.32692,
  "dms": "4°11'25.7\"S 73°19'36.9\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/6YngnJjSwFXztAPdA"
 },
 "6/6-AmazonRiver-Peru-NIR": {
  "place": "Amazon River, Peru",
  "lat": -4.19047,
  "lng": -73.32692,
  "dms": "4°11'25.7\"S 73°19'36.9\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/6YngnJjSwFXztAPdA"
 },
 "7/7-0-Regina-Saskatchewan-Canada": {
  "place": "Regina, Saskatchewan, Canada",
  "lat": 50.19769,
  "lng": -104.28761,
  "dms": "50°11'51.7 N 104°17'15.4 W",
  "nasa": "https://go.nasa.gov/4dpk7Uh",
  "map": "https://maps.app.goo.gl/iVppLmYh44QxDr9c9"
 },
 "7/7-1-Regina-Saskatchewan-Canada": {
  "place": "Regina, Saskatchewan, Canada",
  "lat": 50.21147,
  "lng": -104.72725,
  "dms": "50°12'41.3 N 104°43'38.1 W",
  "nasa": "https://go.nasa.gov/4dpk7Uh",
  "map": "https://maps.app.goo.gl/Aa6mwzvmMJXRw3Gf8"
 },
 "8/8-0-HudsanBay-Ontario-Canada": {
  "place": "Hudson Bay, Ontario, Canada",
  "lat": 55.87619,
  "lng": -87.87431,
  "dms": "55°52'34.3\"N 87°52'27.5\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/rebounding-in-hudson-bay-147405/",
  "map": "https://maps.app.goo.gl/THfZmmsHE2qc25ZU6"
 },
 "8/8-1-HudsanBay-Ontario-Canada-NIR": {
  "place": "Hudson Bay, Ontario, Canada",
  "lat": 55.87619,
  "lng": -87.87431,
  "dms": "55°52'34.3\"N 87°52'27.5\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/rebounding-in-hudson-bay-147405/",
  "map": "https://maps.app.goo.gl/THfZmmsHE2qc25ZU6"
 },
 "8/8-2-HudsanBay-Ontario-Canada-SWIR": {
  "place": "Hudson Bay, Ontario, Canada",
  "lat": 55.87619,
  "lng": -87.87431,
  "dms": "55°52'34.3\"N 87°52'27.5\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/rebounding-in-hudson-bay-147405/",
  "map": "https://maps.app.goo.gl/THfZmmsHE2qc25ZU6"
 },
 "9/9-0-HollaBend-Arkansas": {
  "place": "Holla Bend, Arkansas, United States",
  "lat": 35.14475,
  "lng": -93.05458,
  "dms": "35°08'41.1 N 93°03'16.5 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/the-alphabet-from-orbit-letter-b-87241/",
  "map": "https://maps.app.goo.gl/kgoYq8mgtbsGZJ8NA"
 },
 "A/a-0-hickman-Kentucky": {
  "place": "Hickman, Kentucky",
  "lat": 36.58911,
  "lng": -89.34081,
  "dms": "36°35'20.8 N 89°20'26.9 W",
  "nasa": "https://go.nasa.gov/3zotXEt",
  "map": "https://maps.app.goo.gl/RufRtZKXgyD5ukKS7"
 },
 "A/a-1-FarmIsland-Maine": {
  "place": "Farm Island, Maine, United States",
  "lat": 45.72883,
  "lng": -69.76914,
  "dms": "45°43'43.8 N 69°46'08.9 W",
  "nasa": "https://go.nasa.gov/4wFVcTQ",
  "map": "https://maps.app.goo.gl/3BjD7xuXpJnfkEu99"
 },
 "A/a-1-Hickman-Kentucky-NIR": {
  "place": "Hickman, Kentucky, United States",
  "lat": 36.58911,
  "lng": -89.34081,
  "dms": "36°35'20.8 N 89°20'26.9 W",
  "nasa": "https://go.nasa.gov/3zotXEt",
  "map": "https://maps.app.goo.gl/RufRtZKXgyD5ukKS7"
 },
 "A/a-2-guakhmaz-azerbaijan": {
  "place": "Lake Guakhmaz, Azerbaijan",
  "lat": 40.66411,
  "lng": 47.11006,
  "dms": "40°39'50.8 N 47°06'36.2 E",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/a-is-for-azerbaijan-153367/",
  "map": "https://maps.app.goo.gl/tnrVaiMuFiGacH746"
 },
 "A/a-3-YukonDelta-Alaska": {
  "place": "Yukon Delta, Alaska, United States",
  "lat": 62.55492,
  "lng": -164.93619,
  "dms": "62°33'17.7 N 164°56'10.3 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/yukon-delta-alaska-72762/",
  "map": "https://maps.app.goo.gl/AuARuTMTcT2ugLnq5"
 },
 "A/a-4-Lake-Mjøsa-Norway": {
  "place": "Lake Mjøsa, Norway",
  "lat": 60.76464,
  "lng": 10.94533,
  "dms": "60°45'52.7 N 10°56'43.2 E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/2KHYmEMruQzgRTBb9"
 },
 "A/a-6-AmazonRiver-Peru": {
  "place": "Amazon River, Peru",
  "lat": -4.60025,
  "lng": -74.45925,
  "dms": "4°36'00.9\"S 74°27'33.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/XarjUYR9hM3YZvWi6"
 },
 "A/a-7-AmazonRiver-Peru-NIR": {
  "place": "Amazon River, Peru",
  "lat": -4.60025,
  "lng": -74.45925,
  "dms": "4°36'00.9\"S 74°27'33.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/XarjUYR9hM3YZvWi6"
 },
 "A/a-8-AmazonRiver-Peru-SWIR": {
  "place": "Amazon River, Peru",
  "lat": -4.60025,
  "lng": -74.45925,
  "dms": "4°36'00.9\"S 74°27'33.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/XarjUYR9hM3YZvWi6"
 },
 "B/b-0-HollaBend-Arkansas": {
  "place": "Holla Bend, Arkansas, United States",
  "lat": 35.14475,
  "lng": -93.05458,
  "dms": "35°08'41.1 N 93°03'16.5 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/the-alphabet-from-orbit-letter-b-87241/",
  "map": "https://maps.app.goo.gl/f2SW2E8a5hh4xfBYA"
 },
 "B/b-1-Humaitá-Brazil": {
  "place": "Madeira River, Brazil",
  "lat": -7.61669,
  "lng": -62.92139,
  "dms": "7°37'00.1\"S 62°55'17.0\"W",
  "nasa": "https://go.nasa.gov/4ulF6gP",
  "map": "https://maps.app.goo.gl/BpsMZRtaDWr6jb9W8"
 },
 "C/c-0-BlackRockDesert-Nevada": {
  "place": "Black Rock Desert, Nevada, United States",
  "lat": 40.78772,
  "lng": -119.20361,
  "dms": "40°47'15.8 N 119°12'13.0 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/summer-rains-on-nevadas-black-rock-playa-151802/",
  "map": "https://maps.app.goo.gl/cEjkbLB4TiADxU9S8"
 },
 "C/c-1-DeceptionIsland-Antarctica": {
  "place": "Deception Island, Antarctica",
  "lat": -62.95619,
  "lng": -60.64244,
  "dms": "62°57'22.3 S 60°38'32.8 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/the-island-shaped-like-a-horseshoe-146164/",
  "map": "https://maps.app.goo.gl/jp3H8scx8wzn5eAu5"
 },
 "C/c-2-FalseRiver-Louisiana": {
  "place": "False River, Louisiana, United States",
  "lat": 36.58911,
  "lng": -89.34081,
  "dms": "36°35'20.8 N 89°20'26.9 W",
  "nasa": "https://go.nasa.gov/4ukb2lv",
  "map": "https://maps.app.goo.gl/d4wA2MSqkaS6BcVk9"
 },
 "D/d-0-AkimiskiIsland-Canada": {
  "place": "Akimiski Island, Canada",
  "lat": 53.01625,
  "lng": -81.30683,
  "dms": "53°00'58.5 N 81°18'24.6 W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/akimiski-island-canada-8657/",
  "map": "https://maps.app.goo.gl/Y4JzvjTHf4PiaPEJA"
 },
 "D/d-1-LakeTandou-Australia": {
  "place": "Lake Tandou, Australia",
  "lat": -32.62161,
  "lng": 142.07261,
  "dms": "32°37'17.8 S 142°04'21.4 E",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/lake-tandou-new-south-wales-australia-2996/",
  "map": "https://maps.app.goo.gl/z3kPn1HxZUxS4FMCA"
 },
 "E/e-0-FirnfilledFjords-Tibet": {
  "place": "Firn-filled Fjords, Tibet",
  "lat": 29.26303,
  "lng": 96.31772,
  "dms": "29°15'46.9 N 96°19'03.8 E",
  "nasa": "https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/abc/images/f/tibet_oli_2014116_lrg.jpg",
  "map": "https://maps.app.goo.gl/8MFbWofadJnYEVD6A"
 },
 "E/e-1-SeaofOkhotsk": {
  "place": "Sea of Okhotsk, Russia",
  "lat": 54.71397,
  "lng": 136.57233,
  "dms": "54°42'50.3 N 136°34'20.4 E",
  "nasa": "https://go.nasa.gov/3WY3qqK",
  "map": "https://maps.app.goo.gl/T6aqkof9nPPDQFzg6"
 },
 "E/e-2-BellonaPlateau": {
  "place": "Bellona Plateau, Coral Sea",
  "lat": -20.5,
  "lng": 158.5,
  "dms": "20°30'00.0 S 158°30'00.0 E",
  "nasa": "https://go.nasa.gov/4nFpz8W",
  "map": "https://maps.app.goo.gl/zMnCkqbYRrEgMyUy9"
 },
 "E/e-3-breiðamerkurjökull-iceland": {
  "place": "Breiðamerkurjökull glacier, Iceland",
  "lat": 64.09583,
  "lng": -16.36267,
  "dms": "64°05'45.0 N 16°21'45.6 W",
  "nasa": "https://go.nasa.gov/3AG3ZNj",
  "map": "https://maps.app.goo.gl/6xoCUtSu99xvXZ8S6"
 },
 "F/f-0-MatoGrosso-Brazil": {
  "place": "Mato Grosso, Brazil",
  "lat": -13.84081,
  "lng": -55.29861,
  "dms": "13°50'26.9 S 55°17'55.0 W",
  "nasa": "https://go.nasa.gov/3TtONfw",
  "map": "https://maps.app.goo.gl/tXas4c27VuWi2pwk6"
 },
 "F/f-1-WoodstockDam-SouthAfrica-NIR": {
  "place": "Woodstock Dam, South Africa",
  "lat": -28.73369,
  "lng": 29.20836,
  "dms": "28°44'01.3 S 29°12'30.1 E",
  "nasa": "https://go.nasa.gov/3AdjEDu",
  "map": "https://maps.app.goo.gl/a1UArynvAqGGYMXg6"
 },
 "F/f-2-WoodstockDam-SouthAfrica-SWIR": {
  "place": "Woodstock Dam, South Africa",
  "lat": -28.73369,
  "lng": 29.20836,
  "dms": "28°44'01.3 S 29°12'30.1 E",
  "nasa": "https://go.nasa.gov/3AdjEDu",
  "map": "https://maps.app.goo.gl/a1UArynvAqGGYMXg6"
 },
 "G/g-0-FonteBoa-Amazonas": {
  "place": "Fonte Boa, Amazonas, Brazil",
  "lat": -2.44189,
  "lng": -66.27881,
  "dms": "2°26'30.8 S 66°16'43.7 W",
  "nasa": "https://go.nasa.gov/3Rn3XCg",
  "map": "https://maps.app.goo.gl/WVPMGGpMRuhmev3j9"
 },
 "G/g-1-FonteBoa-Amazonas-Brazil-NIR": {
  "place": "Fonte Boa, Amazonas, Brazil",
  "lat": -2.44189,
  "lng": -66.27881,
  "dms": "2°26'30.8 S 66°16'43.7 W",
  "nasa": "https://go.nasa.gov/4hlkC44",
  "map": "https://maps.app.goo.gl/WVPMGGpMRuhmev3j9"
 },
 "G/g-2-DenmarkStrait-Greenland": {
  "place": "Denmark Strait, Greenland",
  "lat": 68.49094,
  "lng": -25.69997,
  "dms": "68°29'27.4\"N 25°41'59.9\"W",
  "nasa": "https://go.nasa.gov/4hr0pK4",
  "map": "https://maps.app.goo.gl/n7hTQ95Dn8crGvTj7"
 },
 "G/g-3-AmazonRiver-Peru": {
  "place": "Amazon River, Peru",
  "lat": -4.19047,
  "lng": -73.32692,
  "dms": "4°11'25.7\"S 73°19'36.9\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/6YngnJjSwFXztAPdA"
 },
 "G/g-4-AmazonRiver-Peru-NIR": {
  "place": "Amazon River, Peru",
  "lat": -4.19047,
  "lng": -73.32692,
  "dms": "4°11'25.7\"S 73°19'36.9\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/6YngnJjSwFXztAPdA"
 },
 "G/g-5-AmazonRiver-Brazil": {
  "place": "Amazon River, Brazil",
  "lat": -2.64672,
  "lng": -67.14508,
  "dms": "2°38'48.2\"S 67°08'42.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/TDZmb8feXv7JVkR36"
 },
 "G/g-6-AmazonRiver-Brazil-NIR": {
  "place": "Amazon River, Brazil",
  "lat": -2.64672,
  "lng": -67.14508,
  "dms": "2°38'48.2\"S 67°08'42.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/TDZmb8feXv7JVkR36"
 },
 "G/g-7-AmazonRiver-Brazil-SWIR": {
  "place": "Amazon River, Brazil",
  "lat": -2.64672,
  "lng": -67.14508,
  "dms": "2°38'48.2\"S 67°08'42.3\"W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/TDZmb8feXv7JVkR36"
 },
 "H/h-0-southwestern-kyrgystan": {
  "place": "Southwestern Kyrgyzstan",
  "lat": 40.23433,
  "lng": 71.23967,
  "dms": "40°14'03.6 N 71°14'22.8 E",
  "nasa": "https://go.nasa.gov/46DrQsV",
  "map": "https://maps.app.goo.gl/gRTJ6rDiiXJhT1mD9"
 },
 "H/h-1-khorinsky-district-russia": {
  "place": "Khorinsky District, Russia",
  "lat": 52.04733,
  "lng": 109.78089,
  "dms": "52°02'50.4 N 109°46'51.2 E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/TLEGWnEGY8P3HUri9"
 },
 "H/h-2-Brunswick-Maryland": {
  "place": "Brunswick, Maryland, United States",
  "lat": 39.31667,
  "lng": -77.60867,
  "dms": "39°19'00.0\" N 77°36'31.2\" W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/b7u4mU93QbGyTmwf6"
 },
 "I/i-0-Borgarbyggð-Iceland": {
  "place": "Borgarbyggð, Iceland",
  "lat": 64.76289,
  "lng": -22.45778,
  "dms": "64°45'46.4 N 22°27'28.0 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/Vvtx8wYeXo6pq8y86"
 },
 "I/i-0-Borgarbyggð-Iceland-NIR": {
  "place": "Borgarbyggð, Iceland",
  "lat": 64.76289,
  "lng": -22.45778,
  "dms": "64°45'46.4 N 22°27'28.0 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/Vvtx8wYeXo6pq8y86"
 },
 "I/i-1-Borgarbyggð-Iceland-SWIR": {
  "place": "Borgarbyggð, Iceland",
  "lat": 64.76289,
  "lng": -22.45778,
  "dms": "64°45'46.4 N 22°27'28.0 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/Vvtx8wYeXo6pq8y86"
 },
 "I/i-1-Canandaigua-Lake-NewYork": {
  "place": "Conesus Lake, New York, United States",
  "lat": 42.78639,
  "lng": -77.71614,
  "dms": "42°47'11.0 N 77°42'58.1 W",
  "nasa": "https://go.nasa.gov/4uwXNhq",
  "map": "https://maps.app.goo.gl/jNsDTfUadwb8jBVL6"
 },
 "I/i-2-EtoshaNationalPark-Namibia": {
  "place": "Etosha National Park, Namibia",
  "lat": -18.48756,
  "lng": 16.17072,
  "dms": "18°29'15.2 S 16°10'14.6 E",
  "nasa": "https://eros.usgs.gov/media-gallery/earth-as-art/6/salty-desolation",
  "map": "https://maps.app.goo.gl/s6ujVrXGJKnbrppH7"
 },
 "I/i-3-djebelOuarkziz-morocco": {
  "place": "Djebel Ouarkziz, Morocco",
  "lat": 28.30042,
  "lng": -10.56625,
  "dms": "28°18'01.5 N 10°33'58.5 W",
  "nasa": "https://eros.usgs.gov/media-gallery/earth-as-art/6/desert-ribbons",
  "map": "https://maps.app.goo.gl/osEU3NnVtShw6CBN9"
 },
 "I/i-4-HoluhraunIceField-iceland": {
  "place": "Holuhraun Lava Field, Iceland",
  "lat": 64.85311,
  "lng": -16.827,
  "dms": "64°51'11.2 N 16°49'37.2 W",
  "nasa": "https://go.nasa.gov/3yVc7cd",
  "map": "https://maps.app.goo.gl/ys3A1PGKvF6MCGWP7"
 },
 "J/j-0-GreatBarrierReef": {
  "place": "Great Barrier Reef, Australia",
  "lat": -18.34869,
  "lng": 146.84761,
  "dms": "18°20'55.3 S 146°50'51.4 E",
  "nasa": "https://go.nasa.gov/4fE62SW",
  "map": "https://maps.app.goo.gl/A7ekfv5mp8zMtoP98"
 },
 "J/j-1-KarakayaDam-Turkey": {
  "place": "Karakaya Dam, Turkey",
  "lat": 38.49381,
  "lng": 38.44431,
  "dms": "38°29'37.7 N 38°26'39.5 E",
  "nasa": "https://go.nasa.gov/3QE3Wa1",
  "map": "https://www.google.com/maps/place/38%C2%B029'37.7%22N+38%C2%B026'39.5%22E/@38.5489247,38.208631,112968m/data=!3m1!1e3!4m4!3m3!8m2!3d38.4938!4d38.4443?entry=ttu"
 },
 "J/j-2-LakeSuperior-NorthAmerica": {
  "place": "Lake Superior, United States",
  "lat": 46.68617,
  "lng": -90.38653,
  "dms": "46°41'10.2 N 90°23'11.5 W",
  "nasa": "https://go.nasa.gov/3AHLYOJ",
  "map": "https://maps.app.goo.gl/PFWzBnFTCXwpGDKJ8"
 },
 "K/k-0-SirmilikNationalPark-Canada": {
  "place": "Sirmilik National Park, Canada",
  "lat": 72.08364,
  "lng": -76.81192,
  "dms": "72°05'01.1 N 76°48'42.9 W",
  "nasa": "https://go.nasa.gov/4urHxi3",
  "map": "https://maps.app.goo.gl/gbdHKTrGovtK196w6"
 },
 "K/k-1-Golmund-China": {
  "place": "Golmud, China",
  "lat": 35.61286,
  "lng": 95.06275,
  "dms": "35°36'46.3 N 95°03'45.9 E",
  "nasa": "https://go.nasa.gov/42G6I47",
  "map": "https://maps.app.goo.gl/UweKoxYbPbz1xbY38"
 },
 "L/l-0-Nusantara-Indonesia": {
  "place": "Nusantara, Indonesia",
  "lat": -0.97169,
  "lng": 116.69969,
  "dms": "0°58'18.1 S 116°41'58.9 E",
  "nasa": "https://go.nasa.gov/4dqkVsa",
  "map": "https://maps.app.goo.gl/hUQWh19Wu4t4geAp8"
 },
 "L/l-1-Xinjiang-China": {
  "place": "Xinjiang, China",
  "lat": 40.06744,
  "lng": 77.66686,
  "dms": "40°04'02.8 N 77°40'00.7 E",
  "nasa": "https://go.nasa.gov/4dCIkFE",
  "map": "https://maps.app.goo.gl/to1tPoNqQzZr8kr28"
 },
 "L/l-2-ReginaSaskatchewan-Canada": {
  "place": "Regina, Saskatchewan, Canada",
  "lat": 50.19769,
  "lng": -104.28761,
  "dms": "50°11'51.7 N 104°17'15.4 W",
  "nasa": "https://go.nasa.gov/4dpk7Uh",
  "map": "https://maps.app.goo.gl/iVppLmYh44QxDr9c9"
 },
 "L/l-3-ReginaSaskatchewan-Canada": {
  "place": "Regina, Saskatchewan, Canada",
  "lat": 50.21147,
  "lng": -104.72725,
  "dms": "50°12'41.3 N 104°43'38.1 W",
  "nasa": "https://go.nasa.gov/4dpk7Uh",
  "map": "https://maps.app.goo.gl/Aa6mwzvmMJXRw3Gf8"
 },
 "M/m-0-ShenandoahRiver-Virginia": {
  "place": "Shenandoah River, Virginia, United States",
  "lat": 38.77561,
  "lng": -78.40197,
  "dms": "38°46'32.2 N 78°24'07.1 W",
  "nasa": "https://go.nasa.gov/4nIVw01",
  "map": "https://maps.app.goo.gl/nTiaMd3uKDsKJry86"
 },
 "M/m-1-PotomacRiver": {
  "place": "Paw Paw Bends, Potomac River",
  "lat": 39.59386,
  "lng": -78.42333,
  "dms": "39°35'37.9\" N 78°25'24.0\" W",
  "nasa": "https://go.nasa.gov/4tLbS9V",
  "map": "https://maps.app.goo.gl/2CmsvHPFtanEGpgi9"
 },
 "M/m-1-ShenandoahRiver-Virginia-SWIR": {
  "place": "Shenandoah River, Virginia, United States",
  "lat": 38.77561,
  "lng": -78.40197,
  "dms": "38°46'32.2 N 78°24'07.1 W",
  "nasa": "https://go.nasa.gov/4nIVw01",
  "map": "https://maps.app.goo.gl/nTiaMd3uKDsKJry86"
 },
 "M/m-2-ShenandoahRiver-Virginia-NIR": {
  "place": "Shenandoah River, Virginia",
  "lat": 38.77561,
  "lng": -78.40197,
  "dms": "38°46'32.2 N 78°24'07.1 W",
  "nasa": "https://go.nasa.gov/4nIVw01",
  "map": "https://maps.app.goo.gl/nTiaMd3uKDsKJry86"
 },
 "M/m-2-TianShanMountains-Kyrgyzstan": {
  "place": "Tian Shan Mountains, Kyrgyzstan",
  "lat": 42.12122,
  "lng": 80.04558,
  "dms": "42°07'16.4 N 80°02'44.1 E",
  "nasa": "https://go.nasa.gov/3SIaKUY",
  "map": "https://maps.app.goo.gl/Ja3ZAHeuTNCRNFMN9"
 },
 "M/m-3-PawPawBends-PotomacRiver-NIR": {
  "place": "Paw Paw Bends, Potomac River",
  "lat": 39.59386,
  "lng": -78.42333,
  "dms": "39°35'37.9\" N 78°25'24.0\" W",
  "nasa": "https://go.nasa.gov/4tLbS9V",
  "map": "https://maps.app.goo.gl/2CmsvHPFtanEGpgi9"
 },
 "M/m-4-PawPawBends-PotomacRiver-NIR": {
  "place": "Paw Paw Bends, Potomac River",
  "lat": 39.59386,
  "lng": -78.42333,
  "dms": "39°35'37.9\" N 78°25'24.0\" W",
  "nasa": "https://go.nasa.gov/4tLbS9V",
  "map": "https://maps.app.goo.gl/2CmsvHPFtanEGpgi9"
 },
 "N/n-0-YapacaniBolivia": {
  "place": "Yapacani, Bolivia",
  "lat": -17.30825,
  "lng": -63.88861,
  "dms": "17°18'29.7 S 63°53'19.0 W",
  "nasa": "https://go.nasa.gov/4tGKdH9",
  "map": "https://maps.app.goo.gl/5rXL3mESWj2YsTWj6"
 },
 "N/n-1-YapacaniBolivia": {
  "place": "Yapacani, Bolivia",
  "lat": -17.30825,
  "lng": -63.88861,
  "dms": "17°18'29.7 S 63°53'19.0 W",
  "nasa": "https://go.nasa.gov/49Yl2c1",
  "map": "https://maps.app.goo.gl/5rXL3mESWj2YsTWj6"
 },
 "N/n-2-SãoMigueldoAraguaia-Brazil": {
  "place": "São Miguel do Araguaia, Brazil",
  "lat": -12.94564,
  "lng": -50.495,
  "dms": "12°56'44.3 S 50°29'42.0 W",
  "nasa": "https://go.nasa.gov/4eXj1jS",
  "map": "https://maps.app.goo.gl/1HtmMe82x2XdabT99"
 },
 "O/o-0-CraterLake-Oregon": {
  "place": "Crater Lake, Oregon, United States",
  "lat": 42.93611,
  "lng": -122.10131,
  "dms": "42°56'10.0 N 122°06'04.7 W",
  "nasa": "https://go.nasa.gov/4f7mg8x",
  "map": "https://maps.app.goo.gl/S9sJeZ6iHBVJuGu37"
 },
 "O/o-1-ManicouaganReservoir": {
  "place": "Manicouagan Reservoir, Canada",
  "lat": 51.37844,
  "lng": -68.67422,
  "dms": "51°22'42.4 N 68°40'27.2 W",
  "nasa": "https://go.nasa.gov/4nHcnk9",
  "map": "https://maps.app.goo.gl/E6Rn3yeQkYuagviG7"
 },
 "P/p-0-MackenzieRiverDelta-Canada": {
  "place": "Mackenzie River Delta, Canada",
  "lat": 68.21511,
  "lng": -134.38758,
  "dms": "68°12'54.4 N 134°23'15.3 W",
  "nasa": "https://go.nasa.gov/4tMfCIb",
  "map": "https://maps.app.goo.gl/NK1j3nXaFDB8hPzo9"
 },
 "P/p-1-RiberaltaBolivia": {
  "place": "Riberalta, Bolivia",
  "lat": -10.87889,
  "lng": -66.04778,
  "dms": "10°52'44.0 S 66°02'52.0 W",
  "nasa": "https://go.nasa.gov/3PcqqRZ",
  "map": "https://maps.app.goo.gl/sW32pDeYpN3JQQT18"
 },
 "Q/q-0-LonarCrater-India": {
  "place": "Lonar Crater, India",
  "lat": 19.97689,
  "lng": 76.5085,
  "dms": "19°58'36.8 N 76°30'30.6 E",
  "nasa": "https://go.nasa.gov/4uYjwyO",
  "map": "https://maps.app.goo.gl/vNSZuSEAV22k2UScA"
 },
 "Q/q-1-MountTambora-Indonesia": {
  "place": "Mount Tambora, Indonesia",
  "lat": -8.24203,
  "lng": 117.992,
  "dms": "8°14'31.3 S 117°59'31.2 E",
  "nasa": "https://go.nasa.gov/3VYFv8T",
  "map": "https://maps.app.goo.gl/1KcvrspMtYDs1qSi8"
 },
 "R/r-0-LagoMenendez-Argentina": {
  "place": "Lago Menendez, Argentina",
  "lat": -42.68747,
  "lng": -71.87269,
  "dms": "42°41'14.9 S 71°52'21.7 W",
  "nasa": "https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/abc/images/r/lagomenendez_oli_2015021_lrg.jpg",
  "map": "https://maps.app.goo.gl/DXzCc49EUTcWUsDH6"
 },
 "R/r-1-ProvinceofSondrio-Italy": {
  "place": "Province of Sondrio, Italy",
  "lat": 46.29397,
  "lng": 9.42069,
  "dms": "46°17'38.3 N 9°25'14.5 E",
  "nasa": "https://go.nasa.gov/4dHu1jc",
  "map": "https://maps.app.goo.gl/cuNbj9CouRM7pzg99"
 },
 "R/r-2-florida-keys": {
  "place": "Florida Keys, United States",
  "lat": 24.75844,
  "lng": -81.53156,
  "dms": "24°45'30.4 N 81°31'53.6 W",
  "nasa": "https://go.nasa.gov/4tQRTqt",
  "map": "https://maps.app.goo.gl/CfSnUcNriFtWBrEQ8"
 },
 "R/r-3-canyonlandsNationalPark-utah": {
  "place": "Canyonlands National Park, Utah, United States",
  "lat": 38.44106,
  "lng": -109.75092,
  "dms": "38°26'27.8 N 109°45'03.3 W",
  "nasa": "https://go.nasa.gov/3yZHEK3",
  "map": "https://maps.app.goo.gl/Bt89EafENbXXLmPPA"
 },
 "S/s-0-MackenzieRiver": {
  "place": "Mackenzie River, Canada",
  "lat": 68.41694,
  "lng": -134.14311,
  "dms": "68°25'01.0 N 134°08'35.2 W",
  "nasa": "https://earthobservatory.nasa.gov/images/89870/where-trucks-drive-on-the-river",
  "map": "https://maps.app.goo.gl/ksCEMGEHtzKAhvLX6"
 },
 "S/s-1-nDjamena-chad": {
  "place": "Logone River, Cameroon",
  "lat": 12.00769,
  "lng": 15.06283,
  "dms": "12°00'27.7 N 15°03'46.2 E",
  "nasa": "https://earthobservatory.nasa.gov/images/150521/flooding-in-ndjamena",
  "map": "https://maps.app.goo.gl/piZ9CX41t7QrurP78"
 },
 "S/s-2-RioChapare-Bolivia": {
  "place": "Rio Chapare, Bolivia",
  "lat": -16.93464,
  "lng": -65.22894,
  "dms": "16°56'04.7 S 65°13'44.2 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/MRR8oJSdDTTBVP4z5"
 },
 "S/s-3-AraguaiaRiver-Brazil": {
  "place": "Araguaia River, Brazil",
  "lat": -13.02439,
  "lng": -50.58358,
  "dms": "13°01'27.8\"S 50°35'00.9\"W",
  "nasa": "https://go.nasa.gov/4voMk3d",
  "map": "https://maps.app.goo.gl/Vy2tA4JnZgkcsTzi6"
 },
 "S/s-4-AraguaiaRiver-Brazil-NIR": {
  "place": "Araguaia River, Brazil",
  "lat": -13.02439,
  "lng": -50.58358,
  "dms": "13°01'27.8\"S 50°35'00.9\"W",
  "nasa": "https://go.nasa.gov/4voMk3d",
  "map": "https://maps.app.goo.gl/Vy2tA4JnZgkcsTzi6"
 },
 "T/t-0-Liwa-United-Arab-Emirates": {
  "place": "Liwa, United Arab Emirates",
  "lat": 23.175,
  "lng": 53.798,
  "dms": "23°10'30.0 N 53°47'52.8 E",
  "nasa": "https://earthobservatory.nasa.gov/images/87237/the-alphabet-from-orbit-letter-t",
  "map": "https://maps.app.goo.gl/ozu6s25LfPTmiXFb9"
 },
 "T/t-1-LenaRiverDelta": {
  "place": "Lena River Delta, Russia",
  "lat": 72.87786,
  "lng": 129.53097,
  "dms": "72°52'40.3 N 129°31'51.5 E",
  "nasa": "https://oceancolor.gsfc.nasa.gov/gallery/759/",
  "map": "https://maps.app.goo.gl/YnaHMDF3oQDHePgq5"
 },
 "U/u-0-CanyonlandsNationalPark-Utah": {
  "place": "Canyonlands National Park, Utah, United States",
  "lat": 38.26919,
  "lng": -109.92575,
  "dms": "38°16'09.1 N 109°55'32.7 W",
  "nasa": "https://earthobservatory.nasa.gov/images/83875/the-loop",
  "map": "https://maps.app.goo.gl/za5Mdiv9r6nAgEmC7"
 },
 "U/u-1-BamforthNationalWildlifeRefuge-Wyoming": {
  "place": "Bamforth National Wildlife Refuge, Wyoming, United States",
  "lat": 41.32389,
  "lng": -105.77053,
  "dms": "41°19'26.0 N 105°46'13.9 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/ku2rrcCLiSVPFiPJ7"
 },
 "U/u-2-BamforthNationalWildlifeRefuge-Wyoming-NIR": {
  "place": "Bamforth National Wildlife Refuge, Wyoming, United States",
  "lat": 41.32389,
  "lng": -105.77053,
  "dms": "41°19'26.0 N 105°46'13.9 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/ku2rrcCLiSVPFiPJ7"
 },
 "U/u-3-SouthernCoast-Greenland": {
  "place": "Southern Coast of Greenland",
  "lat": 62.64767,
  "lng": -42.246,
  "dms": "62°38'51.6\"N 42°14'45.6\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/scientists-discover-a-polar-bear-subpopulation-149977/",
  "map": "https://maps.app.goo.gl/kyvNq3pB4SnonST59"
 },
 "U/u-4-SouthernCoast-Greenland-SWIR": {
  "place": "Southern Coast of Greenland",
  "lat": 62.64767,
  "lng": -42.246,
  "dms": "62°38'51.6\"N 42°14'45.6\"W",
  "nasa": "https://science.nasa.gov/earth/earth-observatory/scientists-discover-a-polar-bear-subpopulation-149977/",
  "map": "https://maps.app.goo.gl/kyvNq3pB4SnonST59"
 },
 "V/v-0-CellinaandMedunaRivers-Italy": {
  "place": "Cellina and Meduna Rivers, Italy",
  "lat": 46.1115,
  "lng": 12.75739,
  "dms": "46°06'41.4 N 12°45'26.6 E",
  "nasa": "https://earthobservatory.nasa.gov/images/47670/gravel-rivers-in-northeastern-italy",
  "map": "https://maps.app.goo.gl/cCpPn84kot35xuX66"
 },
 "V/v-1-NewSouthWales-Australia": {
  "place": "New South Wales, Australia",
  "lat": -34.28644,
  "lng": 150.82567,
  "dms": "34°17'11.2 S 150°49'32.4 E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/fxE1ik8qzdANidxT8"
 },
 "V/v-3-Mapleton-Maine": {
  "place": "Mapleton, Maine",
  "lat": 46.54458,
  "lng": -68.25178,
  "dms": "46°32'40.5 N 68°15'06.4 W",
  "nasa": "https://go.nasa.gov/3xGMviR",
  "map": "https://maps.app.goo.gl/8LF7PAqxNbS6egPMA"
 },
 "W/w-0-PonoyRiver-Russia": {
  "place": "Ponoy River, Russia",
  "lat": 67.03636,
  "lng": 40.33869,
  "dms": "67°02'10.9 N 40°20'19.3 E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/z6n8HY91r7f4kv9G7"
 },
 "W/w-0-PonoyRiver-Russia-NIR": {
  "place": "Ponoy River, Russia",
  "lat": 67.03636,
  "lng": 40.33869,
  "dms": "67°02'10.9 N 40°20'19.3 E",
  "nasa": null,
  "map": "https://maps.app.goo.gl/z6n8HY91r7f4kv9G7"
 },
 "W/w-1-LaPrimavera-Columbia": {
  "place": "La Primavera, Colombia",
  "lat": 5.44942,
  "lng": -69.79917,
  "dms": "5°26'57.9 N 69°47'57.0 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/fa5RwpEkAbZQU6d3A"
 },
 "W/w-3-BogdaMountains": {
  "place": "Bogda Mountains, China",
  "lat": 43.20931,
  "lng": 90.08375,
  "dms": "43°12'33.5\"N 90°05'01.5\"E",
  "nasa": "https://eros.usgs.gov/media-gallery/earth-as-art/2/bogda-mountains",
  "map": "https://maps.app.goo.gl/6sCWMj7Evq9CLxsU6"
 },
 "X/x-0-WolstenholmeFjord-Greenland": {
  "place": "Wolstenholme Fjord, Greenland",
  "lat": 76.73439,
  "lng": -68.60647,
  "dms": "76°44'03.8 N 68°36'23.3 W",
  "nasa": "https://earthobservatory.nasa.gov/images/150267/a-half-century-of-loss-in-northwest-greenland",
  "map": "https://maps.app.goo.gl/yySFEVBXHtBuAEnj9"
 },
 "X/x-1-DavisStrait-Greenland": {
  "place": "Davis Strait, Greenland",
  "lat": 62.23744,
  "lng": -49.58053,
  "dms": "62°14'14.8 N 49°34'49.9 W",
  "nasa": "https://oceancolor.gsfc.nasa.gov/gallery/feature/images/LC09_L1TP_004017_20230903_20230903_02_T1_Greenland_lg.png",
  "map": "https://maps.app.goo.gl/16JVpC5o3KiSbHL77"
 },
 "X/x-2-SermersooqMunicipality-Greenland": {
  "place": "Sermersooq Municipality, Greenland",
  "lat": 66.61811,
  "lng": -36.36831,
  "dms": "66°37'05.2 N 36°22'05.9 W",
  "nasa": null,
  "map": "https://maps.app.goo.gl/1P9vKFiCy3PkQSnY8"
 },
 "Y/y-0-BíobíoRiver-Chile": {
  "place": "Bíobío River, Chile",
  "lat": -37.26733,
  "lng": -72.72858,
  "dms": "37°16'02.4 S 72°43'42.9 W",
  "nasa": "https://earthobservatory.nasa.gov/images/150945/fires-blaze-through-south-central-chile",
  "map": "https://maps.app.goo.gl/34aSw5Ub4Z8gXS4d7"
 },
 "Y/y-1-EstuariodeVirrila-Peru": {
  "place": "Estuario de Virrila, Peru",
  "lat": -5.86483,
  "lng": -80.731,
  "dms": "5°51'53.4 S 80°43'51.6 W",
  "nasa": "https://earthobservatory.nasa.gov/images/151183/warming-water-and-downpours-in-peru",
  "map": "https://maps.app.goo.gl/ZBaniPAAZsUFp4Jz5"
 },
 "Y/y-2-tasmanGlacier-newZealand": {
  "place": "Tasman Glacier, New Zealand",
  "lat": -43.52206,
  "lng": 170.83158,
  "dms": "43°31'19.4 S 170°49'53.7 E",
  "nasa": "https://go.nasa.gov/4uQsJt0",
  "map": "https://maps.app.goo.gl/vNfFAsk4VFF6pnTo7"
 },
 "Z/z-0-PrimaveradoLeste-Brazil": {
  "place": "Primavera do Leste, Brazil",
  "lat": -15.49414,
  "lng": -54.34097,
  "dms": "15°29'38.9 S 54°20'27.5 W",
  "nasa": "https://go.nasa.gov/4dzP5rF",
  "map": "https://maps.app.goo.gl/t57fsSpAA6Ek3Rv77"
 },
 "Z/z-1-MohammedBoudiaf-Algeria": {
  "place": "Mohammed Boudiaf, Algeria",
  "lat": 34.98869,
  "lng": 4.38911,
  "dms": "34°59'19.3 N 4°23'20.8 E",
  "nasa": "https://go.nasa.gov/4dtZNQo",
  "map": "https://maps.app.goo.gl/iFZcewDgx7niUQCC9"
 }
}
