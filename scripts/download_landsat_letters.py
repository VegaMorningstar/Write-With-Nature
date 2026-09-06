#!/usr/bin/env python3
"""
scripts/download_landsat_letters.py
────────────────────────────────────
Downloads NASA's 'Your Name in Landsat' images into ../images/{KEY}/,
where KEY is A-Z or 0-9 — the gallery gained numerals in the 2026 refresh.

The manifest below is scraped from the gallery rather than hand-kept:

  for p in "" "page/2/" "page/3/"; do
    curl -s "https://science.nasa.gov/gallery/your-name-in-landsat-gallery/$p"       | grep -oE 'your-name-in-landsat-images/[^"?]+.png' | sed 's|.*/||'
  done | sort -u

Two things that scrape turns up are not scenes and are excluded: a
cq5dam.web.*.png AEM rendition path, and a percent-encoded twin of a file we
already hold under its decoded name.

Usage:
  pip install requests
  python scripts/download_landsat_letters.py
  python scripts/convert_to_webp.py
"""

import os
import time
import requests

# The gallery moved its assets under /update/ in the 2026 refresh. The old base
# still serves the original letters but 404s on everything added since, which is
# the failure to look for first if a download stops working.
NASA_BASE = (
    "https://assets.science.nasa.gov/dynamicimage/assets/science/missions/"
    "landsat/your-name-in-landsat-images/update/"
)
GALLERY_URL = "https://science.nasa.gov/gallery/your-name-in-landsat-gallery/"

# Output root — one subfolder per letter or digit
OUT_ROOT = os.path.join(os.path.dirname(__file__), "..", "images")

# ── Scraped from the gallery, all three pages ───────────────────────────────
KNOWN_FILES = {
    "0": [
        "0-0-LakeWaccamaw-NorthCarolina-USA-NIR.png",
        "0-1-LakeWaccamaw-NorthCarolina-USA-SWIR.png",
    ],
    "1": [
        "1-0-ConsensusLake-NewYork-US.png",
    ],
    "2": [
        "2-0-PennsylvaniaHills-US.png",
        "2-1-PennsylvaniaHills-US-NIR.png",
        "2-2-GreatFishRiverNatureReserve-SouthAfrica.png",
        "2-3-GreatFishRiverNatureReserve-SouthAfrica-NIR.png",
    ],
    "3": [
        "3-0-LakeMassinger-Mozmbique.png",
        "3-1-LakeMassinger-Mozmbique-NIR.png",
        "3-2-ProvinceOfSondrio-Italy.png",
        "3-3-ProvinceOfSondrio-Italy-NIR.png",
    ],
    "4": [
        "4-0-LacAssinica-Quebec-Canada-NIR.png",
        "4-1-LacAssinica-Quebec-Canada-SWIR.png",
    ],
    "5": [
        "5-0-Yukon-Canada.png",
        "5-1-Yukon-Canada-NIR.png",
    ],
    "6": [
        "6-AmazonRiver-Peru-NIR.png",
        "6-AmazonRiver-Peru.png",
    ],
    "7": [
        "7-0-Regina-Saskatchewan-Canada.png",
        "7-1-Regina-Saskatchewan-Canada.png",
    ],
    "8": [
        "8-0-HudsanBay-Ontario-Canada.png",
        "8-1-HudsanBay-Ontario-Canada-NIR.png",
        "8-2-HudsanBay-Ontario-Canada-SWIR.png",
    ],
    "9": [
        "9-0-HollaBend-Arkansas.png",
    ],
    "A": [
        "a-0-hickman-Kentucky.png",
        "a-1-FarmIsland-Maine.png",
        "a-1-Hickman-Kentucky-NIR.png",
        "a-2-guakhmaz-azerbaijan.png",
        "a-3-YukonDelta-Alaska.png",
        "a-4-Lake-Mjøsa-Norway.png",
        "a-6-AmazonRiver-Peru.png",
        "a-7-AmazonRiver-Peru-NIR.png",
        "a-8-AmazonRiver-Peru-SWIR.png",
    ],
    "B": [
        "b-0-HollaBend-Arkansas.png",
        "b-1-Humaitá-Brazil.png",
    ],
    "C": [
        "c-0-BlackRockDesert-Nevada.png",
        "c-1-DeceptionIsland-Antarctica.png",
        "c-2-FalseRiver-Louisiana.png",
    ],
    "D": [
        "d-0-AkimiskiIsland-Canada.png",
        "d-1-LakeTandou-Australia.png",
    ],
    "E": [
        "e-0-FirnfilledFjords-Tibet.png",
        "e-1-SeaofOkhotsk.png",
        "e-2-BellonaPlateau.png",
        "e-3-breiðamerkurjökull-iceland.png",
    ],
    "F": [
        "f-0-MatoGrosso-Brazil.png",
        "f-1-WoodstockDam-SouthAfrica-NIR.png",
        "f-2-WoodstockDam-SouthAfrica-SWIR.png",
    ],
    "G": [
        "g-0-FonteBoa-Amazonas.png",
        "g-1-FonteBoa-Amazonas-Brazil-NIR.png",
        "g-2-DenmarkStrait-Greenland.png",
        "g-3-AmazonRiver-Peru.png",
        "g-4-AmazonRiver-Peru-NIR.png",
        "g-5-AmazonRiver-Brazil.png",
        "g-6-AmazonRiver-Brazil-NIR.png",
        "g-7-AmazonRiver-Brazil-SWIR.png",
    ],
    "H": [
        "h-0-southwestern-kyrgystan.png",
        "h-1-khorinsky-district-russia.png",
        "h-2-Brunswick-Maryland.png",
    ],
    "I": [
        "i-0-Borgarbyggð-Iceland-NIR.png",
        "i-1-Borgarbyggð-Iceland-SWIR.png",
        "i-1-Canandaigua-Lake-NewYork.png",
        "i-2-EtoshaNationalPark-Namibia.png",
        "i-3-djebelOuarkziz-morocco.png",
        "i-4-HoluhraunIceField-iceland.png",
    ],
    "J": [
        "j-0-GreatBarrierReef.png",
        "j-1-KarakayaDam-Turkey.png",
        "j-2-LakeSuperior-NorthAmerica.png",
    ],
    "K": [
        "k-0-SirmilikNationalPark-Canada.png",
        "k-1-Golmund-China.png",
    ],
    "L": [
        "l-0-Nusantara-Indonesia.png",
        "l-1-Xinjiang-China.png",
        "l-2-ReginaSaskatchewan-Canada.png",
        "l-3-ReginaSaskatchewan-Canada.png",
    ],
    "M": [
        "m-0-ShenandoahRiver-Virginia.png",
        "m-1-PotomacRiver.png",
        "m-1-ShenandoahRiver-Virginia-SWIR.png",
        "m-2-ShenandoahRiver-Virginia-NIR.png",
        "m-2-TianShanMountains-Kyrgyzstan.png",
        "m-3-PawPawBends-PotomacRiver-NIR.png",
        "m-4-PawPawBends-PotomacRiver-NIR.png",
    ],
    "N": [
        "n-0-YapacaniBolivia.png",
        "n-1-YapacaniBolivia.png",
        "n-2-SãoMigueldoAraguaia-Brazil.png",
    ],
    "O": [
        "o-0-CraterLake-Oregon.png",
        "o-1-ManicouaganReservoir.png",
    ],
    "P": [
        "p-0-MackenzieRiverDelta-Canada.png",
        "p-1-RiberaltaBolivia.png",
    ],
    "Q": [
        "q-0-LonarCrater-India.png",
        "q-1-MountTambora-Indonesia.png",
    ],
    "R": [
        "r-0-LagoMenendez-Argentina.png",
        "r-2-florida-keys.png",
        "r-3-canyonlandsNationalPark-utah.png",
    ],
    "S": [
        "s-0-MackenzieRiver.png",
        "s-1-nDjamena-chad.png",
        "s-2-RioChapare-Bolivia.png",
        "s-3-AraguaiaRiver-Brazil.png",
        "s-4-AraguaiaRiver-Brazil-NIR.png",
    ],
    "T": [
        "t-1-LenaRiverDelta.png",
    ],
    "U": [
        "u-0-CanyonlandsNationalPark-Utah.png",
        "u-1-BamforthNationalWildlifeRefuge-Wyoming.png",
        "u-2-BamforthNationalWildlifeRefuge-Wyoming-NIR.png",
        "u-3-SouthernCoast-Greenland.png",
        "u-4-SouthernCoast-Greenland-SWIR.png",
    ],
    "V": [
        "v-0-CellinaandMedunaRivers-Italy.png",
        "v-1-NewSouthWales-Australia.png",
        "v-3-Mapleton-Maine.png",
    ],
    "W": [
        "w-0-PonoyRiver-Russia-NIR.png",
        "w-0-PonoyRiver-Russia.png",
        "w-1-LaPrimavera-Columbia.png",
        "w-3-BogdaMountains.png",
    ],
    "X": [
        "x-0-WolstenholmeFjord-Greenland.png",
        "x-1-DavisStrait-Greenland.png",
        "x-2-SermersooqMunicipality-Greenland.png",
    ],
    "Y": [
        "y-0-BíobíoRiver-Chile.png",
        "y-1-EstuariodeVirrila-Peru.png",
        "y-2-tasmanGlacier-newZealand.png",
    ],
    "Z": [
        "z-0-PrimaveradoLeste-Brazil.png",
        "z-1-MohammedBoudiaf-Algeria.png",
    ],
}

# Filenames where the CDN URL differs from the local saved name
CDN_URL_OVERRIDES = {
    "t-0-Liwa-United-Arab-Emirates.png": "t-0-Liwa-United%20Arab%20Emirates.png",
}


def download_file(filename, key):
    cdn_name = CDN_URL_OVERRIDES.get(filename, filename)
    url = NASA_BASE + cdn_name
    out_dir = os.path.join(OUT_ROOT, key)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename)

    if os.path.exists(out_path):
        print(f"  skip  {key}/{filename}")
        return "skip"

    try:
        r = requests.get(url, timeout=30,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; WriteWithNature/1.0)"})
        if r.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(r.content)
            print(f"  OK    {key}/{filename}  ({len(r.content)//1024} KB)")
            return "ok"
        print(f"  FAIL  {key}/{filename}  -> HTTP {r.status_code}")
        return "fail"
    except Exception as e:
        print(f"  FAIL  {key}/{filename}  -> {e}")
        return "fail"


def main():
    total = sum(len(v) for v in KNOWN_FILES.values())
    print("Checking %d images into images/{KEY}/ ...\n" % total)

    counts = {"ok": 0, "skip": 0, "fail": 0}
    for key in sorted(KNOWN_FILES):
        for fname in KNOWN_FILES[key]:
            counts[download_file(fname, key)] += 1
            time.sleep(0.25)   # be polite to NASA servers

    print("\n-- %d downloaded, %d already present, %d failed --"
          % (counts["ok"], counts["skip"], counts["fail"]))
    print("\nNext: python scripts/convert_to_webp.py")


if __name__ == "__main__":
    main()
