export function BootScreen() {
  return (
    <div className="boot-screen" aria-live="polite">
      <div className="boot-screen__grid" aria-hidden="true" />
      <div className="boot-screen__copy">
        <p>RESONANT IS A KINETIC INSTRUMENT</p>
        <p>
          BUILT BY <span className="boot-screen__emph">ADONAY LIZARDO</span> WITH{' '}
          <span className="boot-screen__emph">FORGE</span>.
        </p>
        <p className="boot-screen__gap" />
        <p>DRAG AND RELEASE TO THROW GLOWING</p>
        <p>PARTICLES ACROSS THE STAGE. EVERY</p>
        <p>WALL HIT MAKES A SOUND. LAYER THEM.</p>
        <p>RESHAPE THE PATTERN AS IT PLAYS.</p>
        <p className="boot-screen__gap" />
        <p className="boot-screen__cta">PRESS POWER TO START.</p>
      </div>
    </div>
  )
}
