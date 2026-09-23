/**
 * brickView — the one camera every block is seen from.
 *
 * Three things have to agree about this or the scene comes apart: the renderer
 * that bakes the blocks, the layout that lays them in a row, and the flocks
 * that fly over them. It lives in its own module, free of three.js, so all
 * three can read it without dragging a 3D library into a first paint.
 *
 * Changing anything here means re-baking: `npm run bricks -- --force`.
 */

export const BRICK_VIEW = {
  /** Degrees around the vertical axis. 0 looks square at the front face. */
  azimuth: 20,

  /** Degrees above the horizon. */
  elevation: 42,

  /**
   * Roll the camera about its own view axis until world +X lands flat on
   * screen.
   *
   * Without it, moving one block to the right also moves it down the screen,
   * and a row laid out level in the page would not be level in the world it is
   * pretending to be part of. Rolling turns the picture rather than the
   * blocks, so each is still seen from exactly this azimuth and elevation.
   *
   * It cannot be had both ways: under an orthographic camera the on-screen
   * angle between the row axis and the blocks' depth axis is fixed by the view
   * direction, and is only a right angle at azimuth 0. Levelling the row is
   * the half worth keeping.
   */
  levelRow: true,

  /** What the block itself is built as. Baked in. */
  model: { relief: 0.13, depth: 0.68 },
}

/**
 * How much of a world unit along +X survives the projection to screen.
 *
 * With the roll applied, a step along +X is a purely horizontal step on
 * screen, foreshortened by this much and nothing else — which is what lets a
 * row of pictures be spaced as if it were a row of blocks.
 */
export const X_ON_SCREEN = Math.sqrt(
  1 -
    Math.cos((BRICK_VIEW.elevation * Math.PI) / 180) ** 2 *
      Math.sin((BRICK_VIEW.azimuth * Math.PI) / 180) ** 2
)
