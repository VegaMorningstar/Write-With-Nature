const BASE = import.meta.env.BASE_URL

const u = (letter, file) =>
  `${BASE}images/${letter}/${file.replace('.png', '.webp')}`

export const LETTERS = {
  A:[{url:u('A','a-0-hickman-Kentucky.png'),label:'Hickman, Kentucky'},{url:u('A','a-1-FarmIsland-Maine.png'),label:'Farm Island, Maine'},{url:u('A','a-2-guakhmaz-azerbaijan.png'),label:'Guakhmaz, Azerbaijan'},{url:u('A','a-3-YukonDelta-Alaska.png'),label:'Yukon Delta, Alaska'},{url:u('A','a-4-Lake-Mjøsa-Norway.png'),label:'Lake Mjøsa, Norway'}],
  B:[{url:u('B','b-0-HollaBend-Arkansas.png'),label:'Holla Bend, Arkansas'},{url:u('B','b-1-Humaitá-Brazil.png'),label:'Humaitá, Brazil'}],
  C:[{url:u('C','c-0-BlackRockDesert-Nevada.png'),label:'Black Rock Desert, Nevada'},{url:u('C','c-1-DeceptionIsland-Antarctica.png'),label:'Deception Island, Antarctica'},{url:u('C','c-2-FalseRiver-Louisiana.png'),label:'False River, Louisiana'}],
  D:[{url:u('D','d-0-AkimiskiIsland-Canada.png'),label:'Akimiski Island, Canada'},{url:u('D','d-1-LakeTandou-Australia.png'),label:'Lake Tandou, Australia'}],
  E:[{url:u('E','e-0-FirnfilledFjords-Tibet.png'),label:'Firnfilled Fjords, Tibet'},{url:u('E','e-1-SeaofOkhotsk.png'),label:'Sea of Okhotsk'},{url:u('E','e-2-BellonaPlateau.png'),label:'Bellona Plateau'},{url:u('E','e-3-breiðamerkurjökull-iceland.png'),label:'Breiðamerkurjökull, Iceland'}],
  F:[{url:u('F','f-0-MatoGrosso-Brazil.png'),label:'Mato Grosso, Brazil'},{url:u('F','f-1-KrugerNationalPark-SouthAfrica.png'),label:'Kruger National Park, South Africa'}],
  G:[{url:u('G','g-0-FonteBoa-Amazonas.png'),label:'Fonte Boa, Amazonas'}],
  H:[{url:u('H','h-0-southwestern-kyrgystan.png'),label:'Southwestern Kyrgyzstan'},{url:u('H','h-1-khorinsky-district-russia.png'),label:'Khorinsky District, Russia'}],
  I:[{url:u('I','i-0-Borgarbyggð-Iceland.png'),label:'Borgarbyggð, Iceland'},{url:u('I','i-1-Canandaigua-Lake-NewYork.png'),label:'Canandaigua Lake, New York'},{url:u('I','i-2-EtoshaNationalPark-Namibia.png'),label:'Etosha National Park, Namibia'},{url:u('I','i-3-djebelOuarkziz-morocco.png'),label:'Djebel Ouarkziz, Morocco'},{url:u('I','i-4-HoluhraunIceField-iceland.png'),label:'Holuhraun Ice Field, Iceland'}],
  J:[{url:u('J','j-0-GreatBarrierReef.png'),label:'Great Barrier Reef'},{url:u('J','j-1-KarakayaDam-Turkey.png'),label:'Karakaya Dam, Turkey'},{url:u('J','j-2-LakeSuperior-NorthAmerica.png'),label:'Lake Superior, North America'}],
  K:[{url:u('K','k-0-SirmilikNationalPark-Canada.png'),label:'Sirmilik National Park, Canada'},{url:u('K','k-1-Golmund-China.png'),label:'Golmud, China'}],
  L:[{url:u('L','l-0-Nusantara-Indonesia.png'),label:'Nusantara, Indonesia'},{url:u('L','l-1-Xinjiang-China.png'),label:'Xinjiang, China'},{url:u('L','l-2-ReginaSaskatchewan-Canada.png'),label:'Regina, Saskatchewan'},{url:u('L','l-3-ReginaSaskatchewan-Canada.png'),label:'Regina, Saskatchewan (2)'}],
  M:[{url:u('M','m-0-ShenandoahRiver-Virginia.png'),label:'Shenandoah River, Virginia'},{url:u('M','m-1-PotomacRiver.png'),label:'Potomac River'},{url:u('M','m-2-TianShanMountains-Kyrgyzstan.png'),label:'Tian Shan Mountains, Kyrgyzstan'}],
  N:[{url:u('N','n-0-YapacaniBolivia.png'),label:'Yapacaní, Bolivia'},{url:u('N','n-1-YapacaniBolivia.png'),label:'Yapacaní, Bolivia (2)'},{url:u('N','n-2-SãoMigueldoAraguaia-Brazil.png'),label:'São Miguel do Araguaia, Brazil'}],
  O:[{url:u('O','o-0-CraterLake-Oregon.png'),label:'Crater Lake, Oregon'},{url:u('O','o-1-ManicouaganReservoir.png'),label:'Manicouagan Reservoir'}],
  P:[{url:u('P','p-0-MackenzieRiverDelta-Canada.png'),label:'Mackenzie River Delta, Canada'},{url:u('P','p-1-RiberaltaBolivia.png'),label:'Riberalta, Bolivia'}],
  Q:[{url:u('Q','q-0-LonarCrater-India.png'),label:'Lonar Crater, India'},{url:u('Q','q-1-MountTambora-Indonesia.png'),label:'Mount Tambora, Indonesia'}],
  R:[{url:u('R','r-0-LagoMenendez-Argentina.png'),label:'Lago Menendez, Argentina'},{url:u('R','r-1-ProvinceofSondrio-Italy.png'),label:'Province of Sondrio, Italy'},{url:u('R','r-2-florida-keys.png'),label:'Florida Keys'},{url:u('R','r-3-canyonlandsNationalPark-utah.png'),label:'Canyonlands National Park, Utah'}],
  S:[{url:u('S','s-0-MackenzieRiver.png'),label:'Mackenzie River'},{url:u('S','s-1-nDjamena-chad.png'),label:"N'Djamena, Chad"},{url:u('S','s-2-RioChapare-Bolivia.png'),label:'Río Chapare, Bolivia'}],
  T:[{url:u('T','t-0-Liwa-United-Arab-Emirates.png'),label:'Liwa, United Arab Emirates'},{url:u('T','t-1-LenaRiverDelta.png'),label:'Lena River Delta'}],
  U:[{url:u('U','u-0-CanyonlandsNationalPark-Utah.png'),label:'Canyonlands National Park, Utah'},{url:u('U','u-1-BamforthNationalWildlifeRefuge-Wyoming.png'),label:'Bamforth NWR, Wyoming'}],
  V:[{url:u('V','v-0-CellinaandMedunaRivers-Italy.png'),label:'Cellina & Meduna Rivers, Italy'},{url:u('V','v-1-NewSouthWales-Australia.png'),label:'New South Wales, Australia'},{url:u('V','v-2-PadmaRiver-Bangladesh.png'),label:'Padma River, Bangladesh'},{url:u('V','v-3-Mapleton-Maine.png'),label:'Mapleton, Maine'}],
  W:[{url:u('W','w-0-PonoyRiver-Russia.png'),label:'Ponoy River, Russia'},{url:u('W','w-1-LaPrimavera-Columbia.png'),label:'La Primavera, Colombia'}],
  X:[{url:u('X','x-0-WolstenholmeFjord-Greenland.png'),label:'Wolstenholme Fjord, Greenland'},{url:u('X','x-1-DavisStrait-Greenland.png'),label:'Davis Strait, Greenland'},{url:u('X','x-2-SermersooqMunicipality-Greenland.png'),label:'Sermersooq, Greenland'}],
  Y:[{url:u('Y','y-0-BíobíoRiver-Chile.png'),label:'Biobío River, Chile'},{url:u('Y','y-1-EstuariodeVirrila-Peru.png'),label:'Estuario de Virrila, Peru'},{url:u('Y','y-2-tasmanGlacier-newZealand.png'),label:'Tasman Glacier, New Zealand'}],
  Z:[{url:u('Z','z-0-PrimaveradoLeste-Brazil.png'),label:'Primavera do Leste, Brazil'},{url:u('Z','z-1-MohammedBoudiaf-Algeria.png'),label:'Mohammed Boudiaf, Algeria'}],
}

export const TITLE_LINES = ['WRITE WITH', 'NATURE']
