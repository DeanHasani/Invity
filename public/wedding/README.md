Two clips live here, both referenced by `WeddingCanvas` in
`client/components/Postcard.tsx`, both rendered through `ChromaKeyVideo` which
keys out a solid black backdrop to real transparency in real time — no alpha
channel needed in the source file.

    wedding.webm   — big, centered, looped background behind the invitation
                     text at ~24% opacity so it never competes with readability
    flower.webm    — the corner bouquet. Rendered twice: once as-is (top-left)
                     and once mirrored via CSS (bottom-right) so it reads as a
                     different angle without needing a second asset

If either file is missing, that element just hides itself — nothing breaks.
