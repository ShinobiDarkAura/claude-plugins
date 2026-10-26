---
name: endcard
description: Puts the one official Dango Derby end card (the pink sticker-book card, "$1 free play credit + a mystery box, 3 cosmetics, 1 guaranteed epic", 7 s) on finished vertical ads with the ball-roll wipe, checks that ads end on it, and swaps the old 5-cosmetic card out of older ads. Use whenever someone wants to add, check or fix the end card of a Dango Derby video, or asks for "the end card", "the CTA card" or "the download card", even if they don't say "skill".
---

# Dango Derby end card

Every Dango Derby ad ends on the same card: the pink sticker-book card, 7 s, 1080×1920, 60 fps, with its own fading
music tail. It says "$1 free play credit + a mystery box" and "3 cosmetics, 1 guaranteed epic". The ad rolls into it
with the ball-roll wipe: a big Sakura dango rolls right to left across the frame and reveals the card behind it.

**There is one card, and it is the file in `<this skill>/assets/endcard-pink-audio.mp4`.** Never render, edit, crop,
recolour or re-time a card, and never use the lemon or gift-box card. If the card's words must change, that is an
owner job (see `reference/regenerate-card.md`), and a new plugin version ships the new file to everyone.

`<this skill>` is this skill's folder. `<plugin>` is the plugin folder, two levels up from it.

## Setup

The skill needs ffmpeg, ffprobe, python3 and Pillow. If one is missing, run `bash <plugin>/scripts/setup.sh`, or
`brew install ffmpeg` and `python3 -m pip install --user pillow`.

## In and out

In: one or more finished vertical videos (`.mp4`, 9:16, best 1080×1920) with no end card, or a folder of them.

Out: the same videos with the card, in a `With End Card/` folder next to each input (or the folder given with
`--out`). The input files are never changed by `add`.

## Steps

Copy this checklist into your reply, and check off a step when its "Done when" is true.

- [ ] **1. Add the card**
  - **Scope:** join each finished video to the official card with the ball-roll wipe. No other edit.
  - **In:** the finished videos, or a folder of them.
  - **Out:** `With End Card/<same name>.mp4` for each video.
  - **Done when:** every video prints `done`.
  - **Code:** `scripts/endcard.py add`, which runs `scripts/wipecut.py`.
- [ ] **2. Check**
  - **Scope:** check the finished files. No edit.
  - **In:** the files from step 1, or any videos the person names.
  - **Out:** an `OK` or `FAIL` line for each video.
  - **Done when:** every line is `OK` and the script prints `All good.`
  - **Code:** `scripts/endcard.py check`.
- [ ] **3. Fix old cards (only when asked, or when step 2 finds one)**
  - **Scope:** swap the old pink card that says "5 cosmetics" for the official card in videos that have it. Nothing
    else in the video changes.
  - **In:** videos that step 2 reported as `old card that says 5 cosmetics`.
  - **Out:** each video fixed in place; its old version in `_old-endcard/` in the same folder.
  - **Done when:** step 2 on those videos prints `All good.`
  - **Code:** `scripts/endcard.py fix`.

## Step details

### 1. Add the card

```bash
python3 <this skill>/scripts/endcard.py add "<video or folder>" ["<more>" …] [--out "<folder>"]
```

- The ad's own sound stays at its level; the card's music comes in loud, with a whoosh on the roll.
- The wipe starts 0.25 s before the end of the ad, so the last quarter second of the ad is under the ball. If the ad
  ends on a line of dialogue, leave a short beat after it.
- It skips a video that already ends on an end card (it says which card) and a video that is not 9:16.
- A video that is 9:16 but not 1080×1920 is scaled to 1080×1920.

### 2. Check

```bash
python3 <this skill>/scripts/endcard.py check "<video or folder>" ["<more>" …]
```

For each video it checks that:

- the size is 1080×1920;
- the last 7 s match the official card (3 frames, in colour);
- the card says "3 cosmetics", not "5 cosmetics".

Each `FAIL` line says why: `old card that says 5 cosmetics` (fix it with step 3), `old lemon card` or
`old giftbox card` (re-make it with step 1 from the version without an end card), `does not end on the official card`
(it has no card, or a card that was edited), or the wrong size. Run it on a whole folder before you share or upload
ads. It takes about 2 s a video.

### 3. Fix old cards

```bash
python3 <this skill>/scripts/endcard.py fix "<video or folder>" ["<more>" …]
```

It keeps everything up to the end of the ball-roll wipe, replaces the rest of the picture with the official card frame
for frame, and keeps the sound as it was (the old and the new card have the same music). It fixes only the old pink
card. It checks each result before it replaces the file, and moves the old version to `_old-endcard/`. A lemon or
gift-box card cannot be swapped this way: re-make that ad with step 1 from its version without an end card.

## Rules

- One card for every video. Never make a variant for one ad, even "just a different colour".
- The card's words are legal copy ("21+. Where eligible. …"). Never cover or crop the footer.
- Run step 2 on everything you hand over.
