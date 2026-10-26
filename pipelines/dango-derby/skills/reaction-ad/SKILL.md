---
name: reaction-ad
description: Makes 30 s Dango Derby reaction ads — a believable AI actor (face on top) reacting to a real, beat-matched race (gameplay below), split screen — with a game-profile system so the same playbook works for other games. Runs on the user's Mac; every API call goes through Joystick (mcp__joystick__fal_ai), so nobody needs an API key. Use when someone asks for a Dango Derby ad, a UGC or reaction ad, a split-screen ad, a TikTok/Reels creative, or asks to shoot, recut or caption a reaction ad.
---

# Dango Derby UGC Factory

Makes a finished, captioned 30 s reaction ad from a one-line concept. A real-looking, 30+ actor wearing earphones
reacts in one continuous 30 s take (top). A real race (bottom) is planned and filmed so the crashes, place changes and
finish land on their flinches, lines and scream. The payoff lands in the last 2 seconds, when they look into the lens
for the first time. Approved batch, 2026-09-30: Dublin bus, Glasgow maw, Aussie lunch break, his nan, quiet coach.

The skill ends when step 9 has written the video and step 10 passes. Steps after that, such as a re-encode for a
platform, an upload or a launch, are not part of this skill.

`<this skill>` is this skill's folder. `<plugin>` is the plugin folder, two levels up from it. The files that every
Dango Derby skill uses are in `<plugin>`: `scripts/setup.sh`, `scripts/gamesound.py`, `reference/` and `assets/`.
The race in steps 7 and 8 is the plugin's `race` skill, `dango-derby:race`.

The game-specific parts (layout, captions, footer, how gameplay is captured) are one profile:
`<plugin>/reference/games/dango-derby.{md,json}`. To use this playbook for another game, start from
`<plugin>/reference/games/_template.md`.

## Setup and Joystick

Reaction ads run on the user's Mac. Every API call goes through the `joystick` MCP server, on Joystick's shared
keys. The scripts in this skill call no API, and the skill holds no keys. Before the first ad in a session:

1. Run `bash <plugin>/scripts/setup.sh`. It installs what is missing (ffmpeg, node, gh,
   pillow + numpy, the Xcode command line tools, the game at the filmed commit, Playwright's
   Chromium) and registers the `joystick` MCP server. It prints a ✗ line for each thing only
   a person can do. Tell the user those lines, then run it again.
2. Check that the tool `mcp__joystick__fal_ai` is available. If it is not, stop and tell the
   user: connect Tailscale to the cartridge.gg tailnet, restart Claude Code, run `/mcp`,
   select `joystick` and sign in.

The 3 paid steps are `mcp__joystick__fal_ai` calls on Joystick's shared fal key: the start frame (step 2), the take
(step 3) and the word timings (step 4). State the cost of each call and wait for a yes. Everything else is local and
free. Every paid call has 3 parts, because the MCP server stops a tool call after 120 s:

1. `{"method": "submit", "arguments": {"model": "<model>", "arguments": {…}}}`. Keep the `request_id`.
2. `{"method": "status", "arguments": {"model": "<model>", "request_id": "…"}}` until `status` is `COMPLETED`: about
   every 10 s for a frame or a transcription, about every 60 s for a take.
3. `{"method": "result", "arguments": {"model": "<model>", "request_id": "…"}}` returns the output.

Do not use `run`, `generate_image` or `generate_video`: they wait inside one call and can pass the 120 s limit.
`fal_ai` returns `User is locked. Reason: Exhausted balance.` when the shared fal account has no credit. That is not
a setup fault: tell the user, and stop the paid steps.

For status and result, use the model path in the `status_url` that submit returns. For gpt-image-2 and
fal-ai/whisper it is the same path as for submit. For Seedance 2.5 it is the parent path, `bytedance/seedance-2.5`
(step 3).

Not checked yet: fal-ai/whisper word times against the old whisper-1 times, and whether fal charges for a take that
it rejects. Add what you see to the known issues in this skill's `README.md`.

## The run folder

Keep each batch in one folder outside the repo. Each ad has a short `<name>` (for example `coach`), and each step
writes to these files:

```
<batch>/
  <name>.md                    1 the script; 2, 3, 5, 6, 7 add the frame URL, take URL, verdict, beats, shift and map
  takes/<name>-fal.json        4 the fal-ai/whisper result
  takes/<name>.mp4, <name>-words.json, <name>-sheet.png    4 from take.py; 6 fixes the words file
  <name>.ad.json               5 starts it (mute, bleep_words, caption_overrides); 9 adds crop and lost
  specs/, stories/, plans/<name>-<shift>/                 7 from the race skill's plan.sh
  gameplay/<name>.mp4, plans/<name>/film-trace.json        8 from the race skill's film.sh
  out/<name>.mp4               9 the video
```

`<name>.md` is the record of the ad. With it and the files above, a new session can continue from any step.

## The video (1080×1920)

```
┌──────────────────────────┐ 0
│   actor's face (take)    │  top panel: 845 px of the take, a FIXED crop around the face
│                          │
│ ▓▓▓▓ 2nd of 6 ▓▓▓▓▓▓▓▓▓▓ │ 745–945  the game's own place bar, cut from the HUD, straddling the seam half and half
├──────────────────────────┤ 845  seam
│      caption  word       │ 1120  one word at a time
│     the filmed race      │  bottom panel: the game, cropped so the player and track sit centred
│                          │
│     18+ • AI Actor       │ 1856  footer, every ad
└──────────────────────────┘ 1920
```

The place bar leaves when the race finishes, because the results screen has its own. The HUD's pause and sound
buttons ride along in the strip, which reads as authentic. Snapchat-style caption bars, when an ad uses them, sit
**below** the place bar, never on it.

## Anime and other languages

The skill can also make an ad in an anime style, and an ad with dialogue in a language other than English. The test
ad "rooftop" (2026-10-23) went through all 10 steps: an original adult anime duo, Japanese dialogue and English
captions. Do the same 10 steps, with these changes. The step details give each change.

| Step | Change |
|---|---|
| 1. Script | Original adult characters only. Write each line in its language, then its romaji (or other Latin form) and its meaning. Check each language for words that people link to gambling. |
| 2. Start frame | Use the anime frame prompt. If the actor looks into the lens, fix it with one edit call. |
| 3. Take | Name the language in the first line of the prompt, and use the anime lines of the prompt. |
| 4. Transcript | Set `language`. For Japanese and Chinese, expect about 1 chunk for each character. |
| 5. Take review | Look for an early look into the lens. |
| 6. Beats | For captions in a second language, write the caption words file by hand. |
| 9. Compose | Keep the crop from the face finder. It also finds anime faces. |

## Steps

Copy this checklist into your reply for each ad, and check off a step when its "Done when" is true. Do not start a
step before the step before it is checked. Each step has one scope: do only what its Scope says. Before a step,
read its section under "Step details" below; it has the prompts, the rules and the commands.

- [ ] **1. Script**
  - **Scope:** write the script for one ad. No images and no API calls.
  - **In:** the user's one-line brief, `<plugin>/reference/brand-guardrails.md` and, in a batch, the other scripts.
  - **Out:** `<name>.md` with: who (age 30+, which earphones), where (and whether the setting moves), the off-camera
    people, every line on a 0–30 s timing grid, the race event each line maps to, the rival names, the stand-in
    curses to bleep, and the look-to-camera payoff.
  - **Done when:** the user approves the script.
  - **Code:** none.
- [ ] **2. Start frame**
  - **Scope:** make one 1152×2048 still of the actor with gpt-image-2, or edit an approved one. No take.
  - **In:** who and where from `<name>.md`.
  - **Out:** the frame's fal URL, written into `<name>.md`.
  - **Done when:** the user approves the frame: clearly 30+, the earphones in, eyes down, no phone visible, no text
    or logos, and motion blur in the window if the setting moves.
  - **Cost:** about $0.20 per call. Ask first.
  - **Code:** none: one `mcp__joystick__fal_ai` call.
- [ ] **3. Take**
  - **Scope:** make one 30 s take from the approved frame with Seedance 2.5 on its US endpoint. No transcription and
    no review.
  - **In:** the frame URL and the script from `<name>.md`.
  - **Out:** the take URL (`video.url` in the result), written into `<name>.md`.
  - **Done when:** the status is `COMPLETED`. If the filter rejects the take, follow "If the filter rejects the take"
    in step 3's details.
  - **Cost:** about $13.87 per 30 s take at 720p. A take renders for 8–25 min. Ask first.
  - **Code:** none: one `mcp__joystick__fal_ai` call.
- [ ] **4. Transcript**
  - **Scope:** get the word timings and the raw data for the take with fal-ai/whisper. No judgement.
  - **In:** the take URL.
  - **Out:** `takes/<name>-fal.json`, `takes/<name>.mp4`, `takes/<name>-words.json`, `takes/<name>-sheet.png` (one
    frame per second), and the loud onsets that `take.py` prints.
  - **Done when:** the files exist.
  - **Cost:** under $0.01. Ask first.
  - **Code:** `scripts/take.py`.
- [ ] **5. Take review**
  - **Scope:** decide whether to keep the take, and which parts to silence. No timing fixes.
  - **In:** the take, the words file, the contact sheet, and the lips sheet from `lipcheck.py`.
  - **Out:** the verdict (keep or remake) in `<name>.md`, and `<name>.ad.json`, started from
    `reference/ad.example.json` with `face`, `words`, `gameplay`, `trace`, `out`, `mute`, `bleep_words` and
    `caption_overrides`.
  - **Done when:** the user accepts the take. A line the take got wrong (lips that do not move, a stage direction
    read aloud, a robotic background voice) is in `mute`. Do not re-voice it.
  - **Code:** `scripts/lipcheck.py`, with the face finder `scripts/facey.swift`.
- [ ] **6. Beats**
  - **Scope:** fix the word times, and turn the take into race targets. No planning.
  - **In:** the words file, the loud onsets, and the line-to-event map from the script.
  - **Out:** the fixed `takes/<name>-words.json`, and the beats in `<name>.md`: the finish second, the crash seconds,
    the places (`[second, place]` pairs), each rival's margin at the line, and the base story.
  - **Done when:** every race event in the script has a time from the take.
  - **Code:** none.
- [ ] **7. Race plan**
  - **Scope:** choose the map, and plan the race at 3 start offsets ("shifts"). No filming.
  - **In:** the beats and the map.
  - **Out:** `plans/<name>-<shift>/` for each shift, and the chosen shift and map in `<name>.md`.
  - **Done when:** one shift lands the crashes, places and finish within about 0.2 s of the beats.
  - **Code:** step 1 of the `dango-derby:race` skill.
- [ ] **8. Race film**
  - **Scope:** film the chosen plan with its trails in the real game. No compose.
  - **In:** the chosen plan, the map, 1 player trail and 5 rival trails.
  - **Out:** `gameplay/<name>.mp4` (1080×2338, 60 fps) and `plans/<name>/film-trace.json`.
  - **Done when:** the trace line that `film.sh` prints matches the plan within about 0.1 s, and `film.err` has no
    `capture patch missing` line.
  - **Code:** step 2 of the `dango-derby:race` skill.
- [ ] **9. Compose**
  - **Scope:** build the video from the earlier steps' files. No new decision about the take.
  - **In:** `<name>.ad.json` (from step 5), the take, the words file, the film and its trace.
  - **Out:** `out/<name>.mp4`: 30 s, 1080×1920, 60 fps.
  - **Done when:** the file is written.
  - **Code:** `scripts/compose.py`, which uses `<plugin>/scripts/gamesound.py` (the game sound from the film trace),
    the face finders `scripts/facey.swift` and `scripts/facetrack.swift`, and `<plugin>/assets/fonts/Dango.ttf`.
- [ ] **10. Check**
  - **Scope:** check the finished video. Fix nothing in this step.
  - **In:** `out/<name>.mp4` and the plan.
  - **Out:** pass, or the step to go back to.
  - **Done when:** the frames at the beats agree with the plan, `ffprobe` gives 30.0 s, and the user approves the
    video.
  - **Code:** none.

## Step details

### 1. Script

What made people laugh, ranked:

1. **A named rival who is the joke.** BUBBLES beats the gym bro. KEVO is a photo-finish nemesis. NAN, his actual
   nan, wins and then says "Language." Put the name on screen: the game shows rival names, so the race proves it.
2. **A situation with stakes and a twist at the end.** Quiet coach → a loud outburst → a passenger's glare → "I've
   missed my stop." Waiting for a partner, a lunch break, the son heckling. The last line reframes the 30 s.
3. **Loud, subtle cursing against a cute game.** One or two curses per ad, bleeped. A flinch-curse mid-race is
   funnier than a curse at the win.
4. **Real accents, lightly.** Dublin, Glasgow, broad Aussie, South London / Black British slang, Mancunian. Natural,
   never a caricature: write "Natural, not a caricature" into the voice line.

Rules:

- **Average-looking people, clearly 30+.** Not models. Older faces also pass Seedance's filter (step 3).
- **Every actor wears earphones**: AirPods, wired buds or over-ears, varied per actor. Write which ones into the
  script. Steps 2 and 3 put them in the frame and the prompt.
- **It must feel unscripted.** Glib, punchy, written-sounding lines read fake ("Sixth. That's fine. That's tactics."
  was rejected). Better: a first-time player who is genuinely confused ("which one's me? …the wee pink one?"),
  figures it out with pauses and half-sentences, and gets louder as they realise they're winning.
- **Don't reuse a structure across a batch.** The first NAN script was the gym-bro script with a new name, and it
  was rejected. Same idea is fine; same beats and lines are not.
- **Each line maps to something the race can show**: a flinch is a crash, "second!" is 2nd place, "who's that?" is a
  rival appearing, the scream is the finish. Write those beats into the script; step 6 times them, and steps 7 and 8
  build the race to them.
- **The look to camera is the payoff.** Eyes stay DOWN on the phone (never visible) until the last line, then they
  look straight into the lens for the first time.
- **Say if the setting moves.** A bus or train that sits still kills "I've missed my stop". Steps 2 and 3 show the
  motion.
- **Background people**: one off-camera voice is plenty. A stranger walking past behind them with a hard look, and the
  actor mouthing "sorry!", works well.
- **Never**: a money or earnings angle, real brands, celebrities, IP or characters (no Family Guy), golf, gambling
  words. Check the game's guardrails.
- **Original adult characters only, in every style** (brand rule 9). If the user asks for a character from an anime
  or other IP, or for characters in school uniform, decline and offer an original adult design. A request for
  Jujutsu Kaisen's Gojo and Geto in school became KAITO and REN, 32, on their office roof.
- **A curse that could trip the filter**: write a stand-in ("absolute WEAPON!", "for FECK'S sake") and list it to
  bleep (step 3).
- **Dialogue in another language**: write each line in its language, then its romaji (or other Latin form) and its
  meaning, so that the user can check it. Look for the words that people in that language link to gambling, not
  only the English words. The rooftop ad did not use 「差せ」 ("overtake!"): it is the horse-racing call, and in
  Japan, people link horse racing to betting. Its stand-in curse was 「ちくしょう」 ("damn it").

### 2. Start frame

```json
mcp__joystick__fal_ai  {"method": "submit", "arguments": {"model": "gpt-image-2", "arguments": {
  "prompt": "<the prompt below>", "image_size": {"width": 1152, "height": 2048}, "quality": "high", "num_images": 1}}}
```

Then `status` and `result` (see "Setup and Joystick"). The result is `{"images": [{"url": …}]}`. Keep the URL: the take
uses it, and fal hosts it, so there is no upload. Download it (`curl -o frame.png <url>`) to look at it.

```
Vertical 9:16 photorealistic still from a candid front-camera phone video, slightly low angle, natural handheld
framing, real everyday phone-camera quality, natural skin texture, not a model, average-looking real person, clearly
an adult. Eyes looking DOWN at a phone held just below the frame; the phone is NOT visible. Head and shoulders fill
the upper two thirds of the frame. Fully clothed, relaxed everyday moment. No text, no logos, no brand names, no
watermark. Subject: <who, age 30+, earphones, clothes> <where, light, what's behind them>.
```

- Put the script's earphones in the subject line.
- If the setting moves, put motion blur in its window.
- Make the actor clearly 30+: Seedance's filter rejects faces that read under ~25 (step 3).
- **The eyes must be on the phone.** The look into the lens is the payoff, so the frame must not have it. If the
  actor looks into the lens, do not approve the frame. Fix it with one `fal-ai/gpt-image-2/edit` call (below):
  "Change only this: their eyes look DOWN at a phone that they hold in both hands just below the bottom edge of the
  frame, and their arms bend down toward it. The phone is NOT visible. They do not look at the camera."

**Anime style.** Use this prompt. It made the rooftop frame. Anime faces can read young, so give the age and write
"not a teenager":

```
Vertical 9:16 still frame from a modern anime TV series, clean cel-shaded anime art with soft lighting. The frame
looks like a candid front-camera phone video: slightly low angle, natural handheld framing. An original adult
character, clearly <a man or a woman> in <their> early 30s, not a teenager. Eyes looking DOWN at a phone held just
below the frame; the phone is NOT visible. They do not look at the camera. Head and shoulders fill the upper two
thirds of the frame. No text, no logos, no brand names, no watermark. Original character design, not based on any
existing anime or manga character. Subject: <who, age 30+, earphones, clothes> <where, light, what's behind them>.
```

The first rooftop frame looked into the lens, and one edit call fixed it. The sentence "They do not look at the
camera." was added after that run, and is not tested yet.

**To keep an actor and change one thing** (add earbuds, move them to their nan's front room, blur the train window),
edit the approved frame instead of regenerating it, with the frame's fal URL:

```json
mcp__joystick__fal_ai  {"method": "submit", "arguments": {"model": "fal-ai/gpt-image-2/edit", "arguments": {
  "prompt": "Keep the SAME person … Change only this: …", "image_urls": ["<approved frame url>"], "quality": "high"}}}
```

The tool cannot upload a file from this Mac. Start from a fal URL: a frame made in this step, or a frame from an
earlier fal result.

### 3. Take

```json
mcp__joystick__fal_ai  {"method": "submit", "arguments": {"model": "bytedance/seedance-2.5/us/image-to-video", "arguments": {
  "image_url": "<start frame url>", "prompt": "…", "duration": "30", "resolution": "720p", "generate_audio": true}}}
```

Then `status` about every 60 s, and `result`, with `"model": "bytedance/seedance-2.5"`: the parent path that is in
the `status_url` the submit returns. The start image is the first frame, and the aspect ratio comes from it, so a
1152×2048 frame gives a 9:16 take. `duration` is a string.

**Use the US endpoint.** The default endpoint, `bytedance/seedance-2.5/image-to-video` (Joystick's preset
`seedance-2.5-i2v`), rejects every start frame with a realistic face, AI-generated faces too (see below). On
2026-10-23 the same frame passed on `bytedance/seedance-2.5/us/image-to-video` and rendered in about 8 min.

Prompt, in this order:

```
ALL DIALOGUE IS SPOKEN ALOUD IN ENGLISH. Only the words inside quotation marks are spoken; everything else is silent direction.

One continuous 30-second take. Handheld front-camera selfie video, exactly the framing of the start image: <who,
earphones, where>. The shot begins EXACTLY on the start image; the camera stays on this framing with slight natural
handheld movement. <motion of the place, if any>. Their eyes stay DOWN on a phone held below the frame (the phone is
never visible) until the very last line. Natural healthy skin with real texture, sharp detail. They never stop moving
naturally: <2–3 specific fidgets>. The earphones stay in the whole time.

PERFORMANCE: <only if it needs it, e.g. "completely UNSCRIPTED … first time playing … slow and confused at first">

VOICE(S): <accent, energy arc>. Natural, not a caricature. <OFF-CAMERA person: never seen, who they are>

TIMING:
0-2.5s: <direction>: "<line>"
…every second accounted for, silent stretches included…
28-30s: they look straight into the camera for the first time, <how>: "<payoff>"

SOUND: <room tone by name>, faint tinny game sounds. No music.

NEGATIONS: no visible phone screen, no phone in frame, no text or logos, no brand names, <no X visible on screen>,
no grey or blotchy skin, no painterly texture, no cartoonish voice, no cuts, no looking at the camera before the last line.
```

- The line "Only the words inside quotation marks are spoken" matters: without it a take read the stage direction
  "talking herself down" aloud.
- If the setting moves, say so in capitals: "THE BUS IS CLEARLY DRIVING the whole time … no stationary bus".
- In a batch, submit the takes in parallel: each `submit` gives its own `request_id`. Poll them in turn.

**Anime style or another language.** Change these parts of the prompt:

- In the first line, name the language: "ALL DIALOGUE IS SPOKEN ALOUD IN JAPANESE." Write the lines in quotation
  marks in that language and its own script. In VOICE(S), give the speech, for example "casual Tokyo Japanese".
- For anime, start with "One continuous 30-second take in the anime art style of the start image: clean cel-shaded
  2D anime, kept the same in every frame." Delete "Natural healthy skin with real texture, sharp detail."
- In NEGATIONS, put "no subtitles". For anime, put "no change of art style, no photorealism" in place of "no grey or
  blotchy skin, no painterly texture, no cartoonish voice".

On 2026-10-23 the US endpoint accepted the anime rooftop frame on the first try. The take still looked into the lens
from 6.6 s to 8 s, at the crash, although the prompt said "no looking at the camera before the last line". Step 5
looks for this.

#### If the filter rejects the take (status "nsfw", refunded)

Learned over ~45 submissions:

| Rejected | Passed |
|---|---|
| **Text-to-video, every time** (7 of 7) | Start frames of **clearly 30+** adults (about 1 in 3) |
| Faces that read under ~25 | The same actor re-edited (earbuds, new room) passed first try |
| Real curses in some contexts ("for fuck's sake" in a quiet coach) | A **stand-in curse bleeped in the edit**: "absolute WEAPON!", "for FECK'S sake", "FLIPPING kidding me" |
| A barbershop (cape, clippers by the neck), 7 tries | A frame taken from an earlier passing Seedance clip |
| "I've crashed!" in a parked car (a car-crash reading?) | |

- Always use a start image.
- If a take with a real curse is rejected, swap in a stand-in word, and list it in the script to bleep. On screen it
  is `#####` plus a tone, so it plays exactly like a curse.
- After about 3 rejections, change the setting, not the wording (back to step 1 or 2).
- A `failed` status (not `nsfw`) is usually transient, so resubmit as-is.
- The table above is from runs of the same model before it moved to fal.

**How fal reports a rejected take.** The status still becomes `COMPLETED`. The result then has no `video`; it has a
`detail` list with `"type": "content_policy_violation"`. Read its reason:

- `partner_validation_failed` ("may contain likenesses of real people or other private information"): the endpoint
  rejected the realistic face in `image_url`. This happens on the default endpoint, not on the US endpoint. Submit
  the same frame to `bytedance/seedance-2.5/us/image-to-video`.
- Any other reason: the content filter rejected the take. Follow the rules above.

Whether fal charges for a rejected take is not known.

### 4. Transcript

fal reads the take's URL directly:

```json
mcp__joystick__fal_ai  {"method": "submit", "arguments": {"model": "fal-ai/whisper", "arguments": {
  "audio_url": "<take url>", "chunk_level": "word", "language": "en"}}}
```

Then `status` and `result`. Save the whole result as `takes/<name>-fal.json` (Write tool). Then:

```bash
python3 scripts/take.py <name> <take url> --dir takes --fal-words takes/<name>-fal.json
```

It downloads the take, writes the words file, prints the words and the loud onsets, and writes the contact sheet.

For dialogue in another language, set `language` to its code, for example `"ja"`. For Japanese and Chinese,
fal-ai/whisper gives about 1 chunk for each character, not for each word: the rooftop take gave 110 chunks.
`take.py` writes each chunk as one word. Use those chunks for the times in step 6.

### 5. Take review

```bash
python3 scripts/lipcheck.py takes/<name>.mp4 takes/<name>-words.json
```

Look at both sheets:

- **Frozen bystanders**: friends standing motionless for seconds read as AI. Remake the take (step 3).
- **Lips don't move on a line**: put the line in `mute`. A silent wide-eyed stare reads better than a re-voiced line.
  In the Aussie take three lines went this way and the ad improved.
- **A stage direction read aloud**: `mute` it.
- **A robotic background voice**: `mute` it. The actor's own reaction (a "sorry", a look) can carry the moment.
- A phone edge visible low in the take is fine: the top panel crop usually removes it.
- **The lips sheet shows the chin, not the mouth**: the camera moved, and the sheet crops at the median face
  position. Check those seconds on full frames (`ffmpeg -ss <second> -i takes/<name>.mp4 -frames:v 1 frame.png`).
- **An early look into the lens**: the actor looks at the camera before the last line, often at a crash or a shout.
  The rooftop take did it from 6.6 s to 8 s, against the prompt. Look for it on the contact sheet, and tell the user
  its seconds. `mute` does not hide it: the user keeps the take or asks for a new one (step 3).

Put the script's stand-in curses in `bleep_words`, and any caption spelling in `caption_overrides` (for example
`"bubbles": "BUBBLES?!"`). If the captions are in a second language, put both in the caption language (step 6).

### 6. Beats

The race is built to the take, never the other way round. Fix the words file by hand:

- Whisper drifts on whispers, shouts and long words. Trust the loudness onsets over its times. For hard stretches,
  fix the times by hand from the onsets. (The Joystick tool cannot upload a local cut, so Whisper cannot run again on
  part of a take.)
- Fix dialect spellings and names it mangles ("Weeshed" → "wheesht", "freak's" → "feck's", "yarry" → "ya wee",
  "Tuesday day" → "Tuesday, Dai").
- It can miss a short off-camera word (a "Mm-hm"). That is not a fault, so do not add it.
- Delete its invented repeat of the last line at 30.0 s.

**Captions in a second language** (for example English captions on Japanese dialogue). `compose.py` makes the
captions and the bleeps from one words file, the `words` file in `<name>.ad.json`. So:

1. Fix the words file of the dialogue language, `takes/<name>-words.json`, as above. The beats come from it.
2. Write the caption words file by hand, `takes/<name>-words-<lang>.json` (for example `rooftop-words-en.json`), in
   the same format: `{"text": "…", "words": [{"word": "…", "start": 0.0, "end": 0.5}, …]}`. Time each caption word
   on the dialogue words of the same line.
3. Time a bleeped caption word over the whole curse. `compose.py` bleeps from 0.02 s before the word to 0.03 s after
   it. The rooftop caption "damn" is at 6.8–7.6 s, on 「ちくしょう」 (6.75–7.63 s), and the bleep is 6.78–7.63 s.
4. Set `words` in `<name>.ad.json` to the caption words file. Put `bleep_words` and `caption_overrides` in the caption
   language: the rooftop ad has `"bleep_words": ["damn"]`.

Then write the beats:

| In the take | In the race |
|---|---|
| a flinch / "no no no" / the curse | a crash, 0.1–0.3 s before the sound |
| "second!", "am I third?" | that place, just before the word |
| "who's that?" / a name | that rival appears / is 2nd behind |
| "go on go on" | closing in, still 2nd |
| the scream / "I WON" / "GET IN" | the finish, 0.2–0.5 s **before** it — never after |
| a rival steals it | the pass lands on the panic line |

**Celebrating before the finish is the most visible fault.** Earlier cuts had actors cheering 1–2 s before the
line. Plan the finish to the reaction.

Pick the base story: a comeback, a photo-finish win, or a loss at the line. The race skill lists the stories.

### 7. Race plan

**Never generate gameplay. Record the real game.** Load the `dango-derby:race` skill, and do its step 1 (Race plan)
with these inputs:

- the batch folder and `<name>`;
- the beats and the base story from `<name>.md` (step 6);
- the rival names from the script. The game shows them, so the race proves the joke.

Do not copy the race skill's checklist into your reply. Steps 7 and 8 of this checklist are its 2 steps.

### 8. Race film

Do step 2 (Race film) of the `dango-derby:race` skill. Give the player and each rival a different trail, and do not
use the trails of the batch's other ads.

### 9. Compose

Add `crop` and `lost` to `<name>.ad.json`, then run:

```bash
python3 scripts/compose.py <name>.ad.json
```

Every field is in `reference/ad.example.json`.

- **Crop: fixed by default.** A face that drifts part-way out of the panel when they lean in or throw their head
  back reads as a real phone recording, so keep it. Use a fixed integer (e.g. `90`) to keep a passer-by's face in
  shot. Use `"track"` only when a key line's mouth is lost for seconds.
- **Start with the face finder's crop** (`"crop": null`). It also finds anime faces. `compose.py` prints the crop
  that it used. Do not set an integer before you look at frames with that crop. After you set one, look at frames
  across the take: the place bar (745–945) must not hide the face. In the rooftop ad, a crop of `60` hid the face
  behind the place bar from 10 s to 20 s, and the face finder's crop (471) was correct.
- **`lost`**: the seconds where the player loses a place, from the film trace. The game sound plays its "lost" cue
  there.
- **Captions**: one word per card in the profile's caption style, on the seam. Curses become `#####` with a 1 kHz bleep.
- **Caption extras, sparingly**:
  - `*excited noises*`-style captions only where the actor audibly makes the noise.
  - Big emoji rows (😭 / 💀 ×25) only in ads that already use Snapchat-bar captions, in 1–2 ads per batch at
    most, and never on the first frame.
  - **No colour-commentary lines** ("she's cooking"): they were tried and removed.
- **Sound**: the take's voice on top, and the game's music and SFX ducked under it. `compose.py` builds the game
  sound from the film trace with the profile's builder (`gamesound.py` for Dango).
- **Footer**: "18+ • AI Actor" on every ad, white, in the game's font. It is a disclosure; don't drop it.

### 10. Check

**Check frames, not just the file.** Tile 6–7 frames at the beats (a crash, each place change, the finish, the
payoff) and look at them. Are captions and HUD place in agreement? Is the passer-by in shot? Does the podium show the
right winner? Use `ffprobe` for duration (30.0) and streams.

If a check fails, go back to the step that owns the fault:

| Fault | Go back to |
|---|---|
| A caption, the crop, a bleep or the sound | 9. Compose |
| The race does not show what the line says | 6. Beats |
| A crash, a place or the finish lands at the wrong time | 7. Race plan |
| The film differs from the plan | 8. Race film |
| The take itself (a frozen person, the wrong line) | 3. Take |

Keep the ad reproducible: `<name>.md`, `<name>.ad.json`, the take, the words file and the plan folder rebuild it in a
minute.

## Guardrails

**Gameplay is always real.** Record the race from the real game and composite it. Never let a model generate
gameplay, game UI or the wordmark (brand rule 8).

**Spend.** State the cost of each paid call and wait for a yes. Never submit more takes than the user approved.

**Compliance is legally material.** Full list in `<plugin>/reference/brand-guardrails.md`. The
four most often missed:
1. No *gambling, casino, bet, wager, jackpot, odds* — ever.
2. No golf of anything. No putt, hole, tee, flag, golf ball. Check *locations*, not
   just dialogue — coastal cliffs and manicured parkland drift golf-shaped with no
   golf word present.
3. Paid races are asynchronous against frozen recordings. Never imply a live opponent.
4. Prizes are fixed and company-funded. Never imply a player-funded pool, guaranteed
   winnings, or income.

**Show the work.** Show the user every start frame and take before the next paid step. Never say "the frames are
ready" without showing them.
