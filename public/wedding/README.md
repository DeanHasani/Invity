Two self-animating SVGs live here, both referenced directly via plain
`<img>` tags in `WeddingCanvas` (`client/components/Postcard.tsx`) — the
animation is baked into the SVG itself (SMIL), so no chroma-key/canvas
processing is needed; native transparency, no edge artifacts.

    wedding.svg   — big, centered, looped background behind the invitation
                    text at ~24% opacity so it never competes with readability
    flower.svg    — the corner bouquet. Rendered twice: once as-is (top-left)
                    and once mirrored via CSS (bottom-right) so it reads as a
                    different angle without needing a second asset

If either file is missing, that element just hides itself — nothing breaks.
