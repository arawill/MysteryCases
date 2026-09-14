"""One-shot lossless extraction. Requires Pillow only for tooling, not runtime.

Sheet drawings are not confined to equal-sized mathematical cells. Locate the
nearest transparent gutter to each nominal grid boundary instead. Within
each resulting cell crop the alpha bbox and add eight transparent pixels.
Verify every nontransparent RGBA pixel survives exactly once before saving.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PADDING = 8
PACKS = {
    "house": ["living_room", "bedroom", "bathroom", "dining_room", "sofa", "tv", "bed", "nightstand", "wardrobe", "lamp", "house_plant", "armchair"],
    "office": ["reception", "office", "meeting_room", "archive", "desk", "office_chair", "laptop", "printer", "filing_cabinet", "bookshelf", "bin", "office_plant"],
    "outdoor": ["garden", "garage", "patio", "porch", "tree", "bench", "car", "flower_pot", "toolbox", "street_lamp", "hose", "mud_puddle"],
    "hotel": ["lobby", "guest_room", "hallway", "hotel_bathroom", "armchair_hotel", "suitcase", "luxury_bed", "luggage_cart", "mirror", "statue", "side_table", "table_lamp"],
    "hospital": ["reception_medical", "exam_room", "patient_room", "laboratory", "hospital_bed", "stool", "patient_monitor", "medical_cart", "privacy_screen", "sink", "medicine_cabinet", "instrument_tray"],
}


def gutter_bounds(alpha, count, axis):
    length = alpha.width if axis == "x" else alpha.height
    maxima = []
    for value in range(length):
        strip = (value, 0, value + 1, alpha.height) if axis == "x" else (0, value, alpha.width, value + 1)
        maxima.append(alpha.crop(strip).getextrema()[1])
    bounds = [0]
    for index in range(1, count):
        nominal = length * index / count
        candidates = [value for value in range(1, length - 1)
                      if abs(value - nominal) <= length / count * .35
                      and maxima[value] <= 1]
        if not candidates:
            raise ValueError(f"No transparent {axis} gutter near {nominal}")
        bounds.append(min(candidates, key=lambda value: abs(value - nominal)))
    bounds.append(length)
    return bounds


def extract(source, columns, rows, destinations):
    image = Image.open(source)
    assert image.size == (1448, 1086) and image.mode == "RGBA", source
    alpha = image.getchannel("A")
    try:
        xs = gutter_bounds(alpha, columns, "x")
        # Row gutters can differ by column (e.g. a tall car beside a lamp).
        ys = [gutter_bounds(alpha.crop((xs[col], 0, xs[col + 1], image.height)), rows, "y")
              for col in range(columns)]
        cells = [(xs[col], ys[col][row], xs[col + 1], ys[col][row + 1])
                 for row in range(rows) for col in range(columns)]
    except ValueError:
        # Office furniture has staggered column gutters, but shared row gutters.
        ys = gutter_bounds(alpha, rows, "y")
        xs = [gutter_bounds(alpha.crop((0, ys[row], image.width, ys[row + 1])), columns, "x")
              for row in range(rows)]
        cells = [(xs[row][col], ys[row], xs[row][col + 1], ys[row + 1])
                 for row in range(rows) for col in range(columns)]
    reconstructed = Image.new("RGBA", image.size)
    outputs = []
    for index, destination in enumerate(destinations):
        bounds = cells[index]
        cell = image.crop(bounds)
        bbox = cell.getchannel("A").getbbox()
        assert bbox is not None, destination
        art = cell.crop(bbox)
        output = Image.new("RGBA", (art.width + PADDING * 2, art.height + PADDING * 2))
        output.paste(art, (PADDING, PADDING))
        reconstructed.paste(art, (bounds[0] + bbox[0], bounds[1] + bbox[1]))
        outputs.append((destination, output, bounds, bbox))
    # Compare all four channels at every pixel with alpha > 0. Invisible RGB is
    # not artwork; transparent padding is intentionally normalized to RGBA 0.
    mask = alpha.point(lambda value: 255 if value else 0)
    for original, recovered in zip(image.split(), reconstructed.split()):
        assert ImageChops.multiply(ImageChops.difference(original, recovered), mask).getbbox() is None, source
    records = []
    for destination, output, bounds, bbox in outputs:
        destination.parent.mkdir(parents=True, exist_ok=True)
        output.save(destination, format="PNG", optimize=True)
        with Image.open(destination) as saved:
            assert saved.mode == "RGBA" and saved.tobytes() == output.tobytes()
        records.append({"path": destination.relative_to(ROOT).as_posix(), "cell": bounds,
                        "alphaBBox": bbox, "size": output.size, "bytes": destination.stat().st_size})
    return {"source": source.name, "sourceBytes": source.stat().st_size,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "outputs": records}


if __name__ == "__main__":
    report = []
    for number, (pack, names) in enumerate(PACKS.items(), 2):
        name = f"pack_{number:02}_{pack}_sheet.png"
        source = ROOT / f"src/assets/scenarios/{pack}/sheets/{name}"
        if not source.exists():
            source = ROOT / f"art-source/scenario-sheets/{name}"
        destinations = [ROOT / f"src/assets/scenarios/{pack}/{'zones' if index < 4 else 'objects'}/{name}.png"
                        for index, name in enumerate(names)]
        report.append(extract(source, 4, 3, destinations))
    source = ROOT / "src/assets/avatar/sheets/avatar_sheet_24.png"
    if not source.exists():
        source = ROOT / "art-source/avatar-sheets/avatar_sheet_24.png"
    report.append(extract(source, 6, 4, [ROOT / f"src/assets/avatar/individuals/avatar_{index:02}.png" for index in range(1, 25)]))
    target = ROOT / "art-source/extraction-report.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"padding": PADDING, "pixelVerification": "all visible RGBA pixels preserved exactly", "sheets": report}, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {sum(len(sheet['outputs']) for sheet in report)} RGBA extracts")
    print(f"Source bytes: {sum(sheet['sourceBytes'] for sheet in report)}")
    print(f"Extracted bytes: {sum(item['bytes'] for sheet in report for item in sheet['outputs'])}")
