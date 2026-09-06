const BASE = import.meta.env.BASE_URL

const u = (letter, file) =>
  `${BASE}images/${letter}/${file.replace('.png', '.webp')}`

/**
 * NASA's 'Your Name in Landsat' library — real Landsat 8 & 9 scenes where the
 * surface happens to look like a character, keyed by the character it forms.
 *
 * Digits are in here as well as letters: the gallery gained numerals in its 2026
 * refresh, so a date or a house number can be written the same way a word can.
 *
 * Several scenes appear more than once under the same key, as false-colour
 * renderings of the same ground — NIR and SWIR pick out vegetation and water
 * that the natural-colour version flattens, and they read as genuinely
 * different tiles. Clicking a tile cycles the variants.
 *
 * Generated from images/ by scripts/gen_letters.cjs; hand-written labels are
 * preserved on regeneration, so editing one here survives.
 */
export const LETTERS = {
  '0':[{url:u('0','0-0-LakeWaccamaw-NorthCarolina-USA-NIR.png'),label:'Lake Waccamaw, North Carolina (false colour, NIR)'},{url:u('0','0-1-LakeWaccamaw-NorthCarolina-USA-SWIR.png'),label:'Lake Waccamaw, North Carolina (false colour, SWIR)'}],
  '1':[{url:u('1','1-0-ConsensusLake-NewYork-US.png'),label:'Conesus Lake, New York'}],
  '2':[{url:u('2','2-0-PennsylvaniaHills-US.png'),label:'Pennsylvania Hills'},{url:u('2','2-1-PennsylvaniaHills-US-NIR.png'),label:'Pennsylvania Hills (false colour, NIR)'},{url:u('2','2-2-GreatFishRiverNatureReserve-SouthAfrica.png'),label:'Great Fish River Nature Reserve, South Africa'},{url:u('2','2-3-GreatFishRiverNatureReserve-SouthAfrica-NIR.png'),label:'Great Fish River Nature Reserve, South Africa (false colour, NIR)'}],
  '3':[{url:u('3','3-0-LakeMassinger-Mozmbique.png'),label:'Lake Massinger, Mozambique'},{url:u('3','3-1-LakeMassinger-Mozmbique-NIR.png'),label:'Lake Massinger, Mozambique (false colour, NIR)'},{url:u('3','3-2-ProvinceOfSondrio-Italy.png'),label:'Province of Sondrio, Italy'},{url:u('3','3-3-ProvinceOfSondrio-Italy-NIR.png'),label:'Province of Sondrio, Italy (false colour, NIR)'}],
  '4':[{url:u('4','4-0-LacAssinica-Quebec-Canada-NIR.png'),label:'Lac Assinica, Quebec, Canada (false colour, NIR)'},{url:u('4','4-1-LacAssinica-Quebec-Canada-SWIR.png'),label:'Lac Assinica, Quebec, Canada (false colour, SWIR)'}],
  '5':[{url:u('5','5-0-Yukon-Canada.png'),label:'Yukon, Canada'},{url:u('5','5-1-Yukon-Canada-NIR.png'),label:'Yukon, Canada (false colour, NIR)'}],
  '6':[{url:u('6','6-AmazonRiver-Peru-NIR.png'),label:'Amazon River, Peru (false colour, NIR)'},{url:u('6','6-AmazonRiver-Peru.png'),label:'Amazon River, Peru'}],
  '7':[{url:u('7','7-0-Regina-Saskatchewan-Canada.png'),label:'Regina, Saskatchewan, Canada'},{url:u('7','7-1-Regina-Saskatchewan-Canada.png'),label:'Regina, Saskatchewan, Canada (2)'}],
  '8':[{url:u('8','8-0-HudsanBay-Ontario-Canada.png'),label:'Hudson Bay, Ontario, Canada'},{url:u('8','8-1-HudsanBay-Ontario-Canada-NIR.png'),label:'Hudson Bay, Ontario, Canada (false colour, NIR)'},{url:u('8','8-2-HudsanBay-Ontario-Canada-SWIR.png'),label:'Hudson Bay, Ontario, Canada (false colour, SWIR)'}],
  '9':[{url:u('9','9-0-HollaBend-Arkansas.png'),label:'Holla Bend, Arkansas'}],
  A:[{url:u('A','a-0-hickman-Kentucky.png'),label:'Hickman, Kentucky'},{url:u('A','a-1-FarmIsland-Maine.png'),label:'Farm Island, Maine'},{url:u('A','a-1-Hickman-Kentucky-NIR.png'),label:'Hickman, Kentucky (false colour, NIR)'},{url:u('A','a-2-guakhmaz-azerbaijan.png'),label:'Guakhmaz, Azerbaijan'},{url:u('A','a-3-YukonDelta-Alaska.png'),label:'Yukon Delta, Alaska'},{url:u('A','a-4-Lake-Mjøsa-Norway.png'),label:'Lake Mjøsa, Norway'},{url:u('A','a-6-AmazonRiver-Peru.png'),label:'Amazon River, Peru'},{url:u('A','a-7-AmazonRiver-Peru-NIR.png'),label:'Amazon River, Peru (false colour, NIR)'},{url:u('A','a-8-AmazonRiver-Peru-SWIR.png'),label:'Amazon River, Peru (false colour, SWIR)'}],
  B:[{url:u('B','b-0-HollaBend-Arkansas.png'),label:'Holla Bend, Arkansas'},{url:u('B','b-1-Humaitá-Brazil.png'),label:'Humaitá, Brazil'}],
  C:[{url:u('C','c-0-BlackRockDesert-Nevada.png'),label:'Black Rock Desert, Nevada'},{url:u('C','c-1-DeceptionIsland-Antarctica.png'),label:'Deception Island, Antarctica'},{url:u('C','c-2-FalseRiver-Louisiana.png'),label:'False River, Louisiana'}],
  D:[{url:u('D','d-0-AkimiskiIsland-Canada.png'),label:'Akimiski Island, Canada'},{url:u('D','d-1-LakeTandou-Australia.png'),label:'Lake Tandou, Australia'}],
  E:[{url:u('E','e-0-FirnfilledFjords-Tibet.png'),label:'Firnfilled Fjords, Tibet'},{url:u('E','e-1-SeaofOkhotsk.png'),label:'Sea of Okhotsk'},{url:u('E','e-2-BellonaPlateau.png'),label:'Bellona Plateau'},{url:u('E','e-3-breiðamerkurjökull-iceland.png'),label:'Breiðamerkurjökull, Iceland'}],
  F:[{url:u('F','f-0-MatoGrosso-Brazil.png'),label:'Mato Grosso, Brazil'},{url:u('F','f-1-KrugerNationalPark-SouthAfrica.png'),label:'Kruger National Park, South Africa'},{url:u('F','f-1-WoodstockDam-SouthAfrica-NIR.png'),label:'Woodstock Dam, South Africa (false colour, NIR)'},{url:u('F','f-2-WoodstockDam-SouthAfrica-SWIR.png'),label:'Woodstock Dam, South Africa (false colour, SWIR)'}],
  G:[{url:u('G','g-0-FonteBoa-Amazonas.png'),label:'Fonte Boa, Amazonas'},{url:u('G','g-1-FonteBoa-Amazonas-Brazil-NIR.png'),label:'Fonte Boa, Amazonas, Brazil (false colour, NIR)'},{url:u('G','g-2-DenmarkStrait-Greenland.png'),label:'Denmark Strait, Greenland'},{url:u('G','g-3-AmazonRiver-Peru.png'),label:'Amazon River, Peru'},{url:u('G','g-4-AmazonRiver-Peru-NIR.png'),label:'Amazon River, Peru (false colour, NIR)'},{url:u('G','g-5-AmazonRiver-Brazil.png'),label:'Amazon River, Brazil'},{url:u('G','g-6-AmazonRiver-Brazil-NIR.png'),label:'Amazon River, Brazil (false colour, NIR)'},{url:u('G','g-7-AmazonRiver-Brazil-SWIR.png'),label:'Amazon River, Brazil (false colour, SWIR)'}],
  H:[{url:u('H','h-0-southwestern-kyrgystan.png'),label:'Southwestern Kyrgyzstan'},{url:u('H','h-1-khorinsky-district-russia.png'),label:'Khorinsky District, Russia'},{url:u('H','h-2-Brunswick-Maryland.png'),label:'Brunswick, Maryland'}],
  I:[{url:u('I','i-0-Borgarbyggð-Iceland-NIR.png'),label:'Borgarbyggð, Iceland (false colour, NIR)'},{url:u('I','i-0-Borgarbyggð-Iceland.png'),label:'Borgarbyggð, Iceland'},{url:u('I','i-1-Borgarbyggð-Iceland-SWIR.png'),label:'Borgarbyggð, Iceland (false colour, SWIR)'},{url:u('I','i-1-Canandaigua-Lake-NewYork.png'),label:'Canandaigua Lake, New York'},{url:u('I','i-2-EtoshaNationalPark-Namibia.png'),label:'Etosha National Park, Namibia'},{url:u('I','i-3-djebelOuarkziz-morocco.png'),label:'Djebel Ouarkziz, Morocco'},{url:u('I','i-4-HoluhraunIceField-iceland.png'),label:'Holuhraun Ice Field, Iceland'}],
  J:[{url:u('J','j-0-GreatBarrierReef.png'),label:'Great Barrier Reef'},{url:u('J','j-1-KarakayaDam-Turkey.png'),label:'Karakaya Dam, Turkey'},{url:u('J','j-2-LakeSuperior-NorthAmerica.png'),label:'Lake Superior, North America'}],
  K:[{url:u('K','k-0-SirmilikNationalPark-Canada.png'),label:'Sirmilik National Park, Canada'},{url:u('K','k-1-Golmund-China.png'),label:'Golmud, China'}],
  L:[{url:u('L','l-0-Nusantara-Indonesia.png'),label:'Nusantara, Indonesia'},{url:u('L','l-1-Xinjiang-China.png'),label:'Xinjiang, China'},{url:u('L','l-2-ReginaSaskatchewan-Canada.png'),label:'Regina, Saskatchewan'},{url:u('L','l-3-ReginaSaskatchewan-Canada.png'),label:'Regina, Saskatchewan (2)'}],
  M:[{url:u('M','m-0-ShenandoahRiver-Virginia.png'),label:'Shenandoah River, Virginia'},{url:u('M','m-1-PotomacRiver.png'),label:'Potomac River'},{url:u('M','m-1-ShenandoahRiver-Virginia-SWIR.png'),label:'Shenandoah River, Virginia (false colour, SWIR)'},{url:u('M','m-2-ShenandoahRiver-Virginia-NIR.png'),label:'Shenandoah River, Virginia (false colour, NIR)'},{url:u('M','m-2-TianShanMountains-Kyrgyzstan.png'),label:'Tian Shan Mountains, Kyrgyzstan'},{url:u('M','m-3-PawPawBends-PotomacRiver-NIR.png'),label:'Paw Paw Bends, Potomac River (false colour, NIR)'},{url:u('M','m-4-PawPawBends-PotomacRiver-NIR.png'),label:'Paw Paw Bends, Potomac River (false colour, NIR) (2)'}],
  N:[{url:u('N','n-0-YapacaniBolivia.png'),label:'Yapacaní, Bolivia'},{url:u('N','n-1-YapacaniBolivia.png'),label:'Yapacaní, Bolivia (2)'},{url:u('N','n-2-SãoMigueldoAraguaia-Brazil.png'),label:'São Miguel do Araguaia, Brazil'}],
  O:[{url:u('O','o-0-CraterLake-Oregon.png'),label:'Crater Lake, Oregon'},{url:u('O','o-1-ManicouaganReservoir.png'),label:'Manicouagan Reservoir'}],
  P:[{url:u('P','p-0-MackenzieRiverDelta-Canada.png'),label:'Mackenzie River Delta, Canada'},{url:u('P','p-1-RiberaltaBolivia.png'),label:'Riberalta, Bolivia'}],
  Q:[{url:u('Q','q-0-LonarCrater-India.png'),label:'Lonar Crater, India'},{url:u('Q','q-1-MountTambora-Indonesia.png'),label:'Mount Tambora, Indonesia'}],
  R:[{url:u('R','r-0-LagoMenendez-Argentina.png'),label:'Lago Menendez, Argentina'},{url:u('R','r-1-ProvinceofSondrio-Italy.png'),label:'Province of Sondrio, Italy'},{url:u('R','r-2-florida-keys.png'),label:'Florida Keys'},{url:u('R','r-3-canyonlandsNationalPark-utah.png'),label:'Canyonlands National Park, Utah'}],
  S:[{url:u('S','s-0-MackenzieRiver.png'),label:'Mackenzie River'},{url:u('S','s-1-nDjamena-chad.png'),label:'N\'Djamena, Chad'},{url:u('S','s-2-RioChapare-Bolivia.png'),label:'Río Chapare, Bolivia'},{url:u('S','s-3-AraguaiaRiver-Brazil.png'),label:'Araguaia River, Brazil'},{url:u('S','s-4-AraguaiaRiver-Brazil-NIR.png'),label:'Araguaia River, Brazil (false colour, NIR)'}],
  T:[{url:u('T','t-0-Liwa-United-Arab-Emirates.png'),label:'Liwa, United Arab Emirates'},{url:u('T','t-1-LenaRiverDelta.png'),label:'Lena River Delta'}],
  U:[{url:u('U','u-0-CanyonlandsNationalPark-Utah.png'),label:'Canyonlands National Park, Utah'},{url:u('U','u-1-BamforthNationalWildlifeRefuge-Wyoming.png'),label:'Bamforth NWR, Wyoming'},{url:u('U','u-2-BamforthNationalWildlifeRefuge-Wyoming-NIR.png'),label:'Bamforth National Wildlife Refuge, Wyoming (false colour, NIR)'},{url:u('U','u-3-SouthernCoast-Greenland.png'),label:'Southern Coast, Greenland'},{url:u('U','u-4-SouthernCoast-Greenland-SWIR.png'),label:'Southern Coast, Greenland (false colour, SWIR)'}],
  V:[{url:u('V','v-0-CellinaandMedunaRivers-Italy.png'),label:'Cellina & Meduna Rivers, Italy'},{url:u('V','v-1-NewSouthWales-Australia.png'),label:'New South Wales, Australia'},{url:u('V','v-2-PadmaRiver-Bangladesh.png'),label:'Padma River, Bangladesh'},{url:u('V','v-3-Mapleton-Maine.png'),label:'Mapleton, Maine'}],
  W:[{url:u('W','w-0-PonoyRiver-Russia-NIR.png'),label:'Ponoy River, Russia (false colour, NIR)'},{url:u('W','w-0-PonoyRiver-Russia.png'),label:'Ponoy River, Russia'},{url:u('W','w-1-LaPrimavera-Columbia.png'),label:'La Primavera, Colombia'},{url:u('W','w-3-BogdaMountains.png'),label:'Bogda Mountains'}],
  X:[{url:u('X','x-0-WolstenholmeFjord-Greenland.png'),label:'Wolstenholme Fjord, Greenland'},{url:u('X','x-1-DavisStrait-Greenland.png'),label:'Davis Strait, Greenland'},{url:u('X','x-2-SermersooqMunicipality-Greenland.png'),label:'Sermersooq, Greenland'}],
  Y:[{url:u('Y','y-0-BíobíoRiver-Chile.png'),label:'Biobío River, Chile'},{url:u('Y','y-1-EstuariodeVirrila-Peru.png'),label:'Estuario de Virrila, Peru'},{url:u('Y','y-2-tasmanGlacier-newZealand.png'),label:'Tasman Glacier, New Zealand'}],
  Z:[{url:u('Z','z-0-PrimaveradoLeste-Brazil.png'),label:'Primavera do Leste, Brazil'},{url:u('Z','z-1-MohammedBoudiaf-Algeria.png'),label:'Mohammed Boudiaf, Algeria'}],
}

export const TITLE_LINES = ['WRITE WITH', 'NATURE']
