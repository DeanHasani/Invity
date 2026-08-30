INVITY: "The Sending" mark
Brand orange #F05A28 · white #FFFFFF · deep #B23D14 · display type Luckiest Guy

SVG (scalable, use these on the web)
  invity-mark-orange.svg    orange on transparent
  invity-mark-white.svg     white on transparent (for orange/dark backgrounds)
  invity-mark-tile.svg      white on rounded orange tile, the app icon
  invity-favicon-*.svg      small-size variant: card sits square, flap cut thickened

PNG
  invity-mark-orange-512.png / invity-mark-white-512.png
  invity-app-icon-512.png    app stores, social avatars
  invity-apple-touch-180.png <link rel="apple-touch-icon">
  invity-favicon-32.png / invity-favicon-16.png

Rendered tile PNGs (generated from invity-favicon-tile.svg, the source of favicon.ico)
  invity-tile-16.png / invity-tile-32.png / invity-tile-48.png

WHAT THE SITE ACTUALLY USES (as of 2026-07-30)
  The TILE variant is the icon everywhere: white mark on the orange rounded
  tile. It holds a solid silhouette on both light and dark browser chrome,
  where the transparent orange mark loses definition and the card element
  reads as detached.

  In every page <head>:
    <link rel="icon" href="/favicon.ico" sizes="48x48">
    <link rel="icon" href="/brand/invity-favicon-tile.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/brand/invity-apple-touch-180.png">

  This folder is the single home for brand assets, and nothing is duplicated at
  the public/ root. Three files live at the root and must stay there:
    /favicon.ico   browsers and crawlers probe this path unconditionally,
                   regardless of what the HTML declares
    /icon.png      the Paddle product image points at this exact URL; renaming
                   it silently breaks the product listing. Contents = the 512
                   app icon.
    /site.webmanifest  conventional location, referenced by <link rel="manifest">

  Rebuilding favicon.ico: render invity-favicon-tile.svg at 16/32/48 and pack
  them as PNG-in-ICO. There is no ImageMagick or sharp in this repo; the tile
  PNGs above were rendered headlessly from the SVG.

Clear space: keep the mark's own height / 4 clear on all sides.
Don't recolour, outline, add gradients, or stretch. Below 24px use the favicon variant.

Google OAuth consent screen
  invity-google-oauth-120.png  120x120, transparent corners. Do NOT flatten it
  onto white: Google's consent screen has a dark theme, where a white-matted
  logo renders as a glaring white square around the tile. Transparent corners
  sit correctly on both themes. Upload at Google Cloud Console -> Google Auth
  Platform -> Branding.
  Uploading a logo triggers Google's brand-verification review, so the name and
  logo will not display on the live consent screen until it is approved, and
  app name / logo / homepage / authorized domain must all be consistent or the
  review is rejected.
