# Geological blocks

Every letter on the board is a block of ground: the Landsat scene as its top
face, displaced into real relief, over the stratigraphic section that place
actually has, with the character cut into the face.

Nothing in the satellite image is regenerated or recoloured. On level ground
the rendered pixel is the pixel NASA shot.

&nbsp;

## The pieces

| file | what it is |
| --- | --- |
| `src/lib/landsat-brick.js` | The block: height field, geometry, shaders. Knows nothing about React. |
| `src/lib/strata.js` | What is *under* a scene — picks a stratigraphic column from real geology, or from the image when there is none. |
| `src/data/geology.js` | Harvested bedrock and elevation, keyed by place name. Generated. |
| `src/data/brick-index.js` | The pixel size of every baked block. Generated. |
| `src/lib/brickView.js` | The one camera every block is seen from, and the layout maths that follows from it. No three.js, so anything may import it. |
| `src/lib/brickAssets.js` | Where a block's picture comes from, and how wide a tile has to be. |
| `src/lib/brickRenderer.js` | One offscreen WebGL context that draws blocks on demand. |
| `src/lib/flocks.js` | Migrating flamingos, over bounds you pass in. |
| `src/components/Tile3D.jsx` | One block as a board tile. |
| `src/components/FlockLayer.jsx` | The flyway across the collage panel. |
| `scripts/harvest-geo.mjs` | Fetches the geology. Run rarely. |
| `scripts/prerender-bricks.mjs` | Bakes every block to an image. Run after changing how blocks look. |

&nbsp;

## Blocks are baked, not drawn

Building one block is roughly fifty blur passes over a height grid plus a
WebGL render. Done live, that is a visible stall on every keystroke — and a
paragraph is a hundred of them.

So every block in the library is rendered once, ahead of time, into
`images/bricks/<CHAR>-<n>.webp`, and a tile is one `<img>`. It costs exactly
what the flat tile it replaced cost. `Tile3D` points at the baked URL on its
first render — no probe, no `await`, no blank frame.

The live renderer is still there as a fallback. If a scene is added to
`letters.js` before the script is re-run, its tile draws itself a moment later
instead of leaving a hole, and `three` is imported lazily so it stays out of
the bundle a first paint has to parse.

**Re-bake after changing** the geometry, the shaders, the strata, the geology
data, or `BRICK_VIEW`:

```bash
npm run dev                                  # in one terminal
node scripts/prerender-bricks.mjs --force    # in another
```

`--only S,R,9` limits it to a few characters while iterating; without
`--force` it only fills in what is missing.

&nbsp;

## Laying blocks in a row

Three things have to agree about the camera — the renderer that bakes the
blocks, the row that lays them out, and the flocks that fly over them — so it
is defined once, in `brickView.js`.

**The camera is rolled** so world +X lands flat on screen. Without it, moving
one block to the right also moves it *down*, and a row laid out level in the
page would not be level in the world it is pretending to be part of. Rolling
turns the picture rather than the blocks, so each is still seen from exactly
the same azimuth and elevation. It cannot be had both ways: under an
orthographic camera the on-screen angle between the row axis and the blocks'
depth axis is fixed by the view direction, and is a right angle only at
azimuth 0.

**Blocks are sized by width, never height.** Every baked frame is the same
width in world units — measured across the library they agree to within one
per cent — while heights differ with how much relief the terrain has. Sizing
by height, as an ordinary square tile does, quietly shrinks a mountain range
against a floodplain and the row stops standing on one line.

**Tiles overlap.** A baked frame is much wider than the block inside it: a
block is a slab seen at three-quarters, so its bounding box is far wider than
the slab is at any given height. Laid out as touching boxes, blocks stand much
further apart than the same blocks in one 3D scene. Each tile therefore pulls
left into its neighbour's frame by the difference, which `brickPitch` works
out from the frame width recorded at bake time and `BRICK_GAP` — the same gap
the `?word` page uses. Right-hand blocks are nearer the camera at this
azimuth, so a later tile belongs in front of an earlier one; DOM order already
paints it that way.

&nbsp;

## What decides the section

`strata.js` picks one of eight archetypes — marine, coast, floodplain, desert,
montane, basement, volcanic, glacial — each with its own beds *and* its own
deformation: how steeply the stack dips, how hard it is folded, and how far it
arches to follow the ground above it.

It decides from two sources, preferring the first:

1. **Real data** in `src/data/geology.js`: the bedrock Macrostrat reports at
   that place, and the spread of SRTM elevations over the surrounding 10 km —
   which is the number that separates a floodplain from a mountain front.
2. **The image itself**: how much of it is water, ice, warm bare ground or
   vegetation, and how much of its contrast survives a heavy blur (real
   landform does; speckle does not).

Two things that are easy to get wrong here, and are handled:

- **False colour lies about colour.** In NIR, vegetation renders red, so a
  forest reads as the most arid ground in the library — Lake Waccamaw scored
  higher on it than Black Rock Desert does. Scenes whose label says
  `false colour` have their colour cues set aside; the real record decides.
- **A fjord is most of the way to being water and is still a mountain range.**
  Ruggedness is checked before the water test.

&nbsp;

## Regenerating the geology

Rarely needed — only if `letters.js` gains places.

```bash
node scripts/harvest-geo.mjs
```

It geocodes each scene label (Nominatim), samples a 5×5 elevation grid
(OpenTopoData/SRTM) and reads the bedrock (Macrostrat), caching as it goes so
it can be re-run safely. Takes a few minutes, mostly waiting on rate limits.

Sources: Nominatim (OSM, ODbL), OpenTopoData/SRTM, Macrostrat (CC-BY 4.0).

**Known gap:** SRTM only covers 60°S–60°N, so high-latitude scenes — the
Mackenzie, Greenland, Iceland — have bedrock but no relief figure and fall
back to the image's own statistics.

&nbsp;

## Pages

| URL | what it shows |
| --- | --- |
| `/` | The board, in blocks. |
| `?cube` | One block, with the camera and the model adjustable, and a readout of where its section came from. |
| `?word` | A whole word as a row of blocks in one scene. |
| `?bricks` | Blocks beside the flat tiles they replaced. |
| `?prerender` | The harness the bake script drives. Not for people. |

&nbsp;

## The flyway

`flocks.js` takes bounds and fills them with skeins. They do not wander: each
holds a formation, keeps one heading for the whole crossing, and re-enters
upwind when it leaves. The wingbeat is phase-shifted down the line so it
ripples back from the leader.

On the board, `FlockLayer` gives it the **panel's** bounds rather than the
word's, so the birds cross the whole collage whatever is written on it. Its
camera is aimed with `BRICK_VIEW` — the same elevation, azimuth and levelling
roll the blocks were baked with — so the birds and the ground agree about
where the camera is.

The layer stops animating when the panel scrolls out of view or the tab goes
to the background.
