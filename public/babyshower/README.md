Drop the two baby shower animations here as:

    wavingbear.webm   — a waving bear, positioned lower-left-of-center at medium size
    train.webm        — a train, positioned just above the vertical middle,
                        scrolls left → right across the screen on a loop

Both referenced by `BabyShowerCanvas` in `client/components/Postcard.tsx` at
reduced opacity (~50-55%) so they stay behind the invitation text. If either
file is missing, that video element just hides itself — nothing breaks.
