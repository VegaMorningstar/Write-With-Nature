#!/usr/bin/env python3
"""
scripts/download_landsat_letters.py
────────────────────────────────────
Downloads all NASA 'Your Name in Landsat' letter images into:
  ../images/{LETTER}/{filename}

After running, set USE_LOCAL = true in index.html.

Usage:
  pip install requests beautifulsoup4
  python3 download_landsat_letters.py
"""

import os
import time
import requests

NASA_BASE   = "https://assets.science.nasa.gov/dynamicimage/assets/science/missions/landsat/your-name-in-landsat-images/"
GALLERY_URL = "https://science.nasa.gov/gallery/your-name-in-landsat-gallery/"

# Output root — one subfolder per letter
OUT_ROOT = os.path.join(os.path.dirname(__file__), "..", "images")

# ── Known filenames (confirmed from NASA gallery) ───────────────────────────
# Filenames scraped from https://science.nasa.gov/gallery/your-name-in-landsat-gallery/
# (both pages). Case-sensitive — use exactly as shown.
KNOWN_FILES = {
    "A": [
        "a-0-hickman-Kentucky.png",
        "a-1-FarmIsland-Maine.png",
        "a-2-guakhmaz-azerbaijan.png",
        "a-3-YukonDelta-Alaska.png",
        "a-4-Lake-Mjøsa-Norway.png",
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
        "f-1-KrugerNationalPark-SouthAfrica.png",
    ],
    "G": [
        "g-0-FonteBoa-Amazonas.png",
    ],
    "H": [
        "h-0-southwestern-kyrgystan.png",
        "h-1-khorinsky-district-russia.png",
    ],
    "I": [
        "i-0-Borgarbyggð-Iceland.png",
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
        "m-2-TianShanMountains-Kyrgyzstan.png",
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
        "r-1-ProvinceofSondrio-Italy.png",
        "r-2-florida-keys.png",
        "r-3-canyonlandsNationalPark-utah.png",
    ],
    "S": [
        "s-0-MackenzieRiver.png",
        "s-1-nDjamena-chad.png",
        "s-2-RioChapare-Bolivia.png",
    ],
    "T": [
        "t-0-Liwa-United-Arab-Emirates.png",
        "t-1-LenaRiverDelta.png",
    ],
    "U": [
        "u-0-CanyonlandsNationalPark-Utah.png",
        "u-1-BamforthNationalWildlifeRefuge-Wyoming.png",
    ],
    "V": [
        "v-0-CellinaandMedunaRivers-Italy.png",
        "v-1-NewSouthWales-Australia.png",
        "v-2-PadmaRiver-Bangladesh.png",
        "v-3-Mapleton-Maine.png",
    ],
    "W": [
        "w-0-PonoyRiver-Russia.png",
        "w-1-LaPrimavera-Columbia.png",
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

def download_file(filename, letter):
    cdn_name = CDN_URL_OVERRIDES.get(filename, filename)
    url = NASA_BASE + cdn_name
    out_dir = os.path.join(OUT_ROOT, letter)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename)

    if os.path.exists(out_path):
        print(f"  skip  {letter}/{filename}")
        return True

    try:
        r = requests.get(url, timeout=30,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; WriteWithNature/1.0)"})
        if r.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(r.content)
            print(f"  OK  {letter}/{filename}  ({len(r.content)//1024} KB)")
            return True
        else:
            print(f"  FAIL  {letter}/{filename}  -> HTTP {r.status_code}")
            return False
    except Exception as e:
        print(f"  FAIL  {letter}/{filename}  -> {e}")
        return False


def main():
    total = sum(len(v) for v in KNOWN_FILES.values())
    print(f"Downloading {total} images into images/{{LETTER}}/ ...\n")

    ok, fail = 0, 0
    for letter in sorted(KNOWN_FILES):
        for fname in KNOWN_FILES[letter]:
            if download_file(fname, letter):
                ok += 1
            else:
                fail += 1
            time.sleep(0.3)   # be polite to NASA servers

    print(f"\n-- Done: {ok} downloaded, {fail} failed --")
    print(f"\nNext step: in index.html, set  USE_LOCAL = true")


if __name__ == "__main__":
    main()
