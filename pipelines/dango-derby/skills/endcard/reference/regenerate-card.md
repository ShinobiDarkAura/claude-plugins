# Make a new card (owner only)

Only the owner changes the card, and only when its words or offer change. Everyone else uses
`assets/endcard-pink-audio.mp4` as it is.

1. The source is `ad-endcard.html` in the dangoderby repo, at
   `art/mockups/app-store-2026-10/sticker-book-v2/_scenes/` (that folder is gitignored, so it is only on the owner's
   Mac). Change the words there. The pink card is `paper=pink`.
2. Render it with the folder's renderer, 7 s at 60 fps:

   ```bash
   node render2.cjs jobs.json
   ```

   with a job like
   `{"page":"ad-endcard.html","comp":"end","w":1080,"h":1920,"out":"<out>/v4-pink.mp4","kind":"video","dur":7.0,"fps":60,"q":"paper=pink"}`.
3. Put the music back from the current card, so it stays the same:

   ```bash
   ffmpeg -i <out>/v4-pink.mp4 -i assets/endcard-pink-audio.mp4 -map 0:v -map 1:a -c copy <out>/endcard-pink-audio.mp4
   ```

4. Replace `assets/endcard-pink-audio.mp4` and `assets/endcard-preview.png` (the frame at 6.5 s, 360×640). If the
   digit of "3 cosmetics" changes, make the old card's digit a fingerprint in `assets/old-cards/` (the crop
   `34:43:226:1007` of the frame at 6.7 s, grey) and teach `scripts/endcard.py` about it, so `check` catches ads with
   the card you replaced.
5. Run `check` on an ad with the new card, bump the plugin version, and open a PR.
