Two self-animating SVGs live here:

    bear.svg    is a waving bear, positioned lower-left-of-center at medium size
    train.svg   is a train, positioned just above the vertical middle. Its own
                  SMIL animation covers small internal details; the left-to-right
                  scroll across the whole screen comes from the CSS
                  `.babyshower-train` keyframe in client/global.css

Both referenced directly via plain `<img>` tags in `BabyShowerCanvas`
(`client/components/Postcard.tsx`) at reduced opacity (~50-55%) so they stay
behind the invitation text. No chroma-key/canvas processing needed, because the
animation is baked into the SVG itself (SMIL) with real transparency. If
either file is missing, that element just hides itself and nothing breaks.
