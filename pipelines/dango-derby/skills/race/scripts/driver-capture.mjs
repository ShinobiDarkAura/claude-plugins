#!/usr/bin/env node
// Gravity Chase driver, HQ: the browser clock is FROZEN between frames (CDP virtual time), so every
// frame is rendered and captured exactly once -> true 60 fps at 1080x1920 with the HUD, no dropped frames.
// The steering code decides while time stands still, so decision latency costs zero game time.
// Beats are in GAME seconds (the on-screen timer).
// v3 (2026-09-29, main 959ce0b63): patches re-pointed at frameTick.dt, the new backdrop call and the new HUD rank update.
// v2 (2026-09-28, main 08faa1179): --port (dev server), --backdrop <map name|course key> paints that map's race
// background behind the SAME course (capture-only patch), and &rivals= keeps the URL course (no server map draw).
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { spawn } from 'node:child_process'
const req = createRequire(path.join(process.cwd(), 'package.json')); const { chromium } = req('playwright')
const argv = process.argv.slice(2); const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1] }
const SECONDS = Number(arg('seconds', 35)), SEED = arg('seed', '3'), MOTIF = arg('motif', 'air')
const BEATS = arg('beats', null) ? JSON.parse(fs.readFileSync(arg('beats'), 'utf8')) : []   // [{t0,t1,intent:'crash'|'clean'}]
const OUT = arg('out', null)
// --follow <old trace.json>: re-play an OLD run's shape: pace to its distance-over-time samples and crash exactly the walls it crashed
const FOLLOW = arg('follow', null) ? JSON.parse(fs.readFileSync(arg('follow'), 'utf8')) : null, WPK = Number(arg('wpk', FOLLOW ? 1 : 1.15)), WP_LEAD = Number(arg('wplead', 0))
const WAYPOINTS = FOLLOW ? FOLLOW.samples.filter(x => FOLLOW.finished == null || x.t <= FOLLOW.finished).map(x => [x.t + WP_LEAD, x.s]).concat(FOLLOW.finished ? [[FOLLOW.finished + WP_LEAD, 1e9]] : []) : arg('waypoints', null) ? JSON.parse(arg('waypoints')) : null   // [[runSeconds, s], ...] for rival runs
const CRASH_S = arg('crashS', null) ? Number(arg('crashS')) : null              // crash into the first gap wall at or after this distance
const SCHED = arg('schedule', null) ? JSON.parse(fs.readFileSync(arg('schedule'), 'utf8')) : null   // {anchorStreak, anchorScript, targets:[{at, crash?, late?}], finishAt}
const LANES = 12, STEP = (2 * Math.PI) / LANES
const laneOf = (phi) => ((Math.round(phi / STEP) % LANES) + LANES) % LANES
const delta = (to, from) => { let d = ((to - from) % LANES + LANES) % LANES; return d > LANES / 2 ? d - LANES : d }

// --look original = exactly how the approved Don't Talk To Me race was filmed: the game's own quality and resolution, 1080p.
const ORIGINAL = arg('look', 'original') === 'original'
// --human 1 = play like a person: tap at a steady rhythm (--cadence frames between taps, never coasting), and only react
// to a wall once the camera can actually SEE its gap, after a human reaction delay (--react seconds). Crashes then happen
// only where a real player gets caught out (over the brow of a bend, off a jump, a moving gap) — never aimed.
const HUMAN = arg('human', '0') === '1', CADENCE = Number(arg('cadence', 11)), REACT_F = Math.round(Number(arg('react', 0.28)) * 60)
const W = Number(arg('w', 432)), H = Number(arg('h', 768)), DSF = Number(arg('scale', 2.5)), TAIL = Number(arg('tail', 4)), LATE = arg('late', null) === null ? null : Number(arg('late')), AIRSTEER = arg('airsteer', '0') === '1'
const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--use-gl=angle', '--run-all-compositor-stages-before-draw', '--disable-threaded-animation', '--disable-threaded-scrolling', '--disable-checker-imaging'] })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF })
const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page)
const GHOSTS = arg('ghosts', null) ? JSON.parse(fs.readFileSync(arg('ghosts'), 'utf8')) : null, TAPE_OUT = arg('tape', null), TRACE = arg('trace', null)
await page.route('**/src/chase/mountChase.ts*', async (route) => { const r = await route.fetch(); let body = await r.text()
  const patches = [['opts.course?.ghosts ?? []', '(window.__ddGhosts ?? opts.course?.ghosts ?? [])'],
    // CAPTURE ONLY: the race background of another map, behind this course (the course itself is untouched)
    // CAPTURE ONLY: --you-tape replays a recorded player tape tick-exact (the ghosts' own consume rule), so a re-film is the SAME run
    ['const watchTape = opts.watch ? createTapeCursor(opts.watch.frames) : null', 'const watchTape = opts.watch ? createTapeCursor(opts.watch.frames) : null; const __ddYou = window.__ddYouTape ? createTapeCursor(window.__ddYouTape) : null'],
    ['const drained = watchTape === null ? touchDrained : tapeInputAt(watchTape, sim.ball.ticks)', 'const drained = __ddYou !== null ? tapeInputAt(__ddYou, sim.ball.ticks) : watchTape === null ? touchDrained : tapeInputAt(watchTape, sim.ball.ticks)'],
    // CAPTURE ONLY: once frames are stepped, every frame is exactly 1/60 s of game time -> one sim tick per video frame,
    // so a beat's game-clock time IS its video time (the v1 films drifted up to 0.12 s between the two)
    ['let dt = Math.min(frameTick.dt, 0.1)', 'let dt = Math.min(frameTick.dt, 0.1); if (window.__ddFixedDt) dt = 1 / 60'],
    ['chaseBackdropFor(chaseCourseKey(seed0, motif0))', 'chaseBackdropFor(window.__ddBackdropKey ?? chaseCourseKey(seed0, motif0))'], ['window.__chase = debugHook', 'debugHook.recorder = recorder; window.__chase = debugHook'],
    // CAPTURE ONLY: the game caps its 3D buffer at dpr 2 and walks it down on slow frames; a frame-stepped capture has no frame budget, so draw at the full capture scale
    ...(ORIGINAL ? [] : [['const DPR_LADDER = [Math.min(window.devicePixelRatio, 2),', 'const DPR_LADDER = [window.devicePixelRatio,'], ['if (governor.sample(frameMs)) renderer.setPixelRatio(governedRatio())', 'void frameMs']])]
  for (const [a, b2] of patches) { if (!body.includes(a)) console.error('WARN: capture patch missing: ' + a.slice(0, 50)); body = body.replace(a, b2) } await route.fulfill({ response: r, body }) })
// CAPTURE ONLY: --player-trail <id> dresses "you" in that trail (the DEV ?trails=all hook in main.ts; add &trails=all via --extra)
if (arg('player-trail', null)) {
  await page.addInitScript((t) => { window.__ddPlayerTrail = t }, arg('player-trail'))
  await page.route('**/src/main.ts*', async (route) => { const r = await route.fetch(); let body = await r.text()
    for (const [a, b2] of [["if (getEquipped('trail') !== NO_TRAIL_ID) return null;", "if (!window.__ddPlayerTrail && getEquipped('trail') !== NO_TRAIL_ID) return null;"], ['if (getEquipped("trail") !== NO_TRAIL_ID) return null;', 'if (!window.__ddPlayerTrail && getEquipped("trail") !== NO_TRAIL_ID) return null;'], ['return trails[trails.length - 1]?.id ?? null;', 'return window.__ddPlayerTrail ?? trails[trails.length - 1]?.id ?? null;']]) { body = body.replace(a, b2) }
    if (!body.includes('__ddPlayerTrail ??')) console.error('WARN: player trail patch missing')
    await route.fulfill({ response: r, body }) })
}
// CAPTURE ONLY: expose the place the HUD shows (it draws candy SVG numerals, so it is not in the page text)
await page.route('**/src/chase/hud.ts*', async (route) => { const r = await route.fetch(); let body = await r.text(); const a = /const changed = rank !== posRank \|\| total !== posTotal/
  if (!a.test(body)) console.error('WARN: capture patch missing: hud rank'); body = body.replace(a, 'window.__ddHudRank = rank; const changed = rank !== posRank || total !== posTotal'); await route.fulfill({ response: r, body }) })
// Capture only: once the race starts, the recorder hands the game exactly ONE animation frame per recorded frame (like
// real 60 fps play). Chrome's frozen-clock capture otherwise delivers frames irregularly (1-2 per recorded frame), which
// makes every per-frame HUD effect (bounces, puffs, glows) run up to 2x fast. Before the switch, frames run normally.
await page.addInitScript(() => {
  const native = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window)
  let manual = false, queue = new Map(), nextId = 1e6
  window.requestAnimationFrame = (cb) => { if (!manual) return native(cb); const id = nextId++; queue.set(id, cb); return id }
  window.cancelAnimationFrame = (id) => { if (queue.delete(id)) return; nativeCancel(id) }
  window.__ddManualFrames = () => { manual = true; window.__ddFixedDt = true }
  window.__ddFrame = (t) => { const run = queue; queue = new Map(); for (const cb of run.values()) { try { cb(t) } catch (e) { setTimeout(() => { throw e }) } } }
})
// Line of sight: can the camera see this point on the course, or is the core rod (radius rCore) in the way?
await page.addInitScript(() => {
  window.__ddCanSee = (s0, phi, rho, rCore) => {
    const H = window.__chase; if (!H || !H.camera || !H.layout) return false
    const cam = H.camera; cam.updateMatrixWorld(); const V = cam.position.constructor
    const c = new V(); cam.getWorldPosition(c); const sp = H.layout.spine; const t = sp.worldPoint(s0, phi, rho)
    const v = new V(t.x, t.y, t.z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return false   // off screen
    const F = sp.frames, step = sp.frameStep, sCam = Math.max(0, H.sim.ball.s - 12)
    for (let i = 1; i < 32; i++) { const u = i / 32, px = c.x + (t.x - c.x) * u, py = c.y + (t.y - c.y) * u, pz = c.z + (t.z - c.z) * u
      const k0 = Math.round((sCam + (s0 - sCam) * u) / step); let best = Infinity
      for (let k = Math.max(0, k0 - 60); k <= Math.min(F.length - 1, k0 + 60); k += 2) { const q = F[k].pos, d = (q.x - px) ** 2 + (q.y - py) ** 2 + (q.z - pz) ** 2; if (d < best) best = d }
      if (Math.sqrt(best) < rCore * 0.97) return false }   // the rod blocks the view
    return true
  }
})
// --dress 1: rivals wear a ball, face and trail (cosmetic only, the tapes are untouched), as a served field does since #1343
if (GHOSTS && arg('dress', '0') === '1') { const TR = (arg('rival-trails', 'thunder-arc,sakura-drift,rainbow,lumen,hanabi')).split(','), BA = ['peach', 'jp-kitsune-mask', 'honey', 'fuji', 'mochi'], FA = ['face-smile', 'face-beam', 'face-wink', 'dm-kiss', 'dm-rage']
  GHOSTS.forEach((g, i) => { g.loadout ??= { ball: BA[i % 5], face: FA[i % 5], trail: TR[i % 5] } }) }
if (GHOSTS) await page.addInitScript((g) => { window.__ddGhosts = g }, GHOSTS)
// --you-tape <tape.json>: the player's inputs come from a tape (recorded with --tape), recording starts at its tick0
const YOU_TAPE = arg('you-tape', null) ? JSON.parse(fs.readFileSync(arg('you-tape'), 'utf8')) : null
if (YOU_TAPE) await page.addInitScript((f) => { window.__ddYouTape = f }, YOU_TAPE.frames)
// --start-tick N: a deterministic start (frozen clock from the tap), the probe step lands on race tick N
const START_TICK = YOU_TAPE ? null : arg('start-tick', null) === null ? null : Number(arg('start-tick'))
// the twenty maps (web/src/chase/mapStyles.ts CHASE_MAPS): name -> course key
const MAPS = { 'Sugar Street': 's101', 'Mochi Mile': 's202', 'Lantern Lane': 's303', 'Sakura Loop': 's404', 'Windmill Row': 's505~rotor', 'Whirlpool Gates': 's606~spin', 'Pendulum Pass': 's707~osc', 'Piston Works': 's808~rhythm', 'Cloud Hop': 's909~air', 'Festival Run': 's1001',
  'Golden Mile': 's1111', 'Jade Circuit': 's1212', 'Crown Loop': 's1313', 'Silk Road': 's1414', 'Typhoon Mill': 's1515~rotor', 'Maelstrom Gates': 's1616~spin', 'Tempest Swing': 's1717~osc', 'Iron Foundry': 's1818~rhythm', 'Skybridge': 's1919~air', 'Imperial Cup': 's2020' }
const BACKDROP = arg('backdrop', null) ? (MAPS[arg('backdrop')] ?? arg('backdrop')) : null   // a map name ('Sakura Loop') or course key ('s404')
if (BACKDROP) await page.addInitScript((k) => { window.__ddBackdropKey = k }, BACKDROP)
await page.goto(`http://localhost:${arg('port', '5179')}/?chase=1&seed=${SEED}&motif=${MOTIF}&rivals=&tut=off&draw=off&noframe=1&solo=${arg('solo','1')}${arg('extra', '')}&splash=0${ORIGINAL ? '' : `&q=${arg('q','ultra')}`}&fx=${arg('fx','streaks,lanePulse,cameraKick,rivalHeat')}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForFunction(() => window.__chase && window.__chase.layout, null, { timeout: 90000 })
try { await page.waitForFunction(() => !document.body.hasAttribute('data-race-cover'), null, { timeout: 20000, polling: 100 }) } catch {}
// Capture only: hide the game's 'a newer version is out' banner (it covers the place counter when this checkout is behind the server)
await page.addStyleTag({ content: '#dd-update-banner{display:none!important}' })

// Gates: every wall, with the set of lanes that get you through it.
const gates = await page.evaluate(({ LANES, STEP }) => {
  const L = window.__chase.layout, out = []
  const lanesIn = (phi, half) => { const r = []; for (let k = 0; k < LANES; k++) { let d = Math.abs(((k * STEP - phi + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d <= half - 0.05) r.push(k) } return r }
  for (const sec of L.sections) {
    const pads = Object.values(sec.furniture).filter(f => f.kind === 'jump')
    for (const w of Object.values(sec.coreObstacles)) {
      if (w.kind !== 'wall') continue
      let safe = [], act = w.s0
      if (w.notches.length) safe = [...new Set(w.notches.flatMap(n => lanesIn(n.phi, n.half)))]
      else { const near = pads.filter(p => p.s1 <= w.s0 && w.s0 - p.s1 < 30); safe = [...new Set(near.flatMap(p => lanesIn(p.phi, p.half)))]; if (near.length) act = near[0].s0 }
      out.push({ s: act, wallS: w.s0, type: w.notches.length ? 'gap wall' : 'jump pad', safe: safe.sort((a, b) => a - b) })
    }
  }
  return out.sort((a, b) => a.s - b.s)
}, { LANES, STEP })

// STACKS: walls a few units apart can't be threaded one at a time at speed. Aim each wall at a lane that is open through the whole stack.
if (arg('stacks', '1') === '1') for (let i = 0; i < gates.length; i++) { if (gates[i].type !== 'gap wall') continue; let safe = gates[i].safe
  for (let j = i + 1; j < gates.length && gates[j].wallS - gates[i].wallS < 40; j++) { if (gates[j].type !== 'gap wall') continue; const inter = safe.filter(l => gates[j].safe.includes(l)); if (inter.length) safe = inter }
  gates[i].safe = safe }
const CRASH_SET = new Set()   // the wall each old HIT was logged against, and every wall stacked with it (a pad pair, a triple)
if (FOLLOW) for (const h of FOLLOW.gates.filter(q => q.result === 'HIT')) { let k = -1; gates.forEach((q, i) => { if (q.wallS <= h.s + 2) k = i })
  if (k < 0) continue; const hit = gates.map((q, i) => i).filter(i => Math.abs(gates[i].wallS - h.s) <= 3); if (!hit.length) hit.push(k)
  for (const i of hit) { CRASH_SET.add(i); if (gates[i].type === 'jump pad') gates.forEach((q, j) => { if (q.type === 'jump pad' && Math.abs(q.wallS - gates[i].wallS) < 14) CRASH_SET.add(j) }) } }
if (arg('gates', null)) console.error('GATES ' + JSON.stringify(gates.map(g => [Math.round(g.wallS), g.type === 'gap wall' ? 'G' : 'P', g.safe])))
const read = () => page.evaluate(() => { const b = window.__chase.sim.ball; const m = (document.body.innerText || '').match(/[×x](\d+)/); const rk = (document.body.innerText || '').match(/(\d+)(?:st|nd|rd|th)\s*of\s*(\d+)/i); return { rank: window.__ddHudRank ?? (rk ? Number(rk[1]) : 0), field: rk ? Number(rk[2]) : 0, streak: m ? Number(m[1]) : 0, cup: window.__chase.layout.cupS, s: b.s, lane: b.lane, vs: b.vs, surf: b.surface, hit: b.jellySerial, clear: b.clearSerial, fin: b.finished, started: b.started, ticks: b.ticks } })
const FROZEN_START = YOU_TAPE || START_TICK !== null
if (FROZEN_START) { await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' }); await page.evaluate(() => window.__ddManualFrames()); await page.keyboard.press('Space') }
else {
await page.keyboard.press('Space')
await page.waitForFunction(() => window.__chase.sim.ball.started, null, { timeout: 60000, polling: 40 })
await page.evaluate(() => window.__ddManualFrames())   // from here on, one animation frame per recorded frame
}


const ff = OUT ? spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', arg('crf', '15'), '-preset', 'medium', '-profile:v', 'high', '-vf', `scale=${arg('outw', Math.round(W * DSF))}:${arg('outh', Math.round(H * DSF))}:flags=lanczos`, '-r', '60', '-movflags', '+faststart', OUT]) : null
const frame = async (capture = true) => {
  const done = new Promise(r => cdp.once('Emulation.virtualTimeBudgetExpired', r))
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 1000 / 60 }); await done
  // CSS/Web animations run on the REAL clock, not the frozen game clock: without this every HUD pop (streak tick, +1 GEM, boost) plays ~4-8x fast in the capture.
  // Pause each one and move it exactly one frame per game frame.
  await page.evaluate(() => { window.__ddFrame?.(performance.now()); const S = window.__ddSeen ??= new WeakSet(); for (const a of document.getAnimations()) { if (!S.has(a)) { S.add(a); a.pause(); a.currentTime = 0 } else if (a.playState !== 'finished') { if (a.playState === 'running') a.pause(); a.currentTime = (a.currentTime || 0) + 1000 / 60
    // a stepped (paused) animation never fires 'finish' on its own: finish it at its end so onfinish / animationend handlers run (the speed bolt removes itself and boosts the gauge there)
    const end = a.effect?.getComputedTiming?.().endTime; if (typeof end === 'number' && isFinite(end) && a.currentTime >= end) { try { a.finish() } catch {} } } } })
  if (capture && ff) { const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 96 }); ff.stdin.write(Buffer.from(data, 'base64')) }
  else await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 20, clip: { x: 0, y: 0, width: 16, height: 16, scale: 1 } })   // a capture is what forces the frame to actually render; without one the sim does not tick once per budget
}
// which arrow raises the lane number? (probe for 14 uncaptured frames, then the run is recorded from here)
let st
if (FROZEN_START) { for (let i = 0; i < 6000; i++) { st = await read(); if (st.started && st.ticks >= (YOU_TAPE ? YOU_TAPE.tick0 : START_TICK)) break; await frame(false) } }
let RIGHT_IS = 1
if (!YOU_TAPE) { st = await read(); const l0 = st.lane; await page.keyboard.press('ArrowRight'); for (let i = 0; i < 14; i++) await frame(false); st = await read(); RIGHT_IS = delta(st.lane, l0) >= 0 ? +1 : -1 }
const press = (k) => YOU_TAPE ? null : page.keyboard.press(k)   // replay: the tape is the thumb
const step = async (dir) => press(dir * RIGHT_IS > 0 ? 'ArrowRight' : 'ArrowLeft')
const log = { seed: SEED, motif: MOTIF, gates: [] }
let lastHitF = -99; const trace = [], hudRanks = []; let hudRank = 0, finTicks = null
let T0 = null, anchorGate = 0, lastTapF = -99, crashNow = false, crashed = false
let gi = 0, lastStepF = -99, prevHit = st.hit, prevClear = st.clear, F = 0, finF = null
const tick0 = st.ticks; const intentAt = (sec) => (BEATS.find(b => sec >= b.t0 && sec < b.t1) || {}).intent || 'clean'
const wall0 = Date.now()
while (F < SECONDS * 60) {
  await frame(); F++
  let b; try { b = await read() } catch { break }
  const sec = (b.ticks - tick0) / 60
  if (F % 15 === 0) trace.push({ t: +sec.toFixed(2), s: Math.round(b.s), streak: b.streak })
  if (b.rank && b.rank !== hudRank && !b.fin) { hudRanks.push({ t: +sec.toFixed(2), rank: b.rank }); hudRank = b.rank }   // the place the HUD shows
  if (b.fin) { if (finF === null) { finTicks = b.ticks - tick0; finF = F; log.finished = +sec.toFixed(2) } if (F - finF > TAIL * 60) break; continue }
  if (b.hit > prevHit) { lastHitF = F; if (crashNow) crashed = true; const gh = [...gates].reverse().find(q => q.wallS <= b.s + 2) || {}; log.gates.push({ seenT: gh.seenT ?? null, seenEta: gh.seenEta ?? null, stepsAtSeen: gh.stepsAtSeen ?? null, t: +sec.toFixed(2), s: Math.round(b.s), result: 'HIT', intent: intentAt(sec), streak: b.streak, script: T0 === null ? null : +(sec - T0).toFixed(2) }); prevHit = b.hit }
  if (b.clear > prevClear) { const gh = [...gates].reverse().find(q => q.wallS <= b.s + 2) || {}; log.gates.push({ seenT: gh.seenT ?? null, seenEta: gh.seenEta ?? null, stepsAtSeen: gh.stepsAtSeen ?? null, t: +sec.toFixed(2), s: Math.round(b.s), result: 'clear', intent: intentAt(sec), streak: b.streak, script: T0 === null ? null : +(sec - T0).toFixed(2) }); prevClear = b.clear }
  // ---- pacing: before the anchor, flat out; after it, arrive at each gate / the finish ON the scripted second
  if (SCHED && T0 === null && b.streak >= SCHED.anchorStreak) { T0 = sec - SCHED.anchorScript; anchorGate = gi; log.T0 = +T0.toFixed(2) }
  let wantTap = true, tgt = null
  if (SCHED && T0 !== null) {
    const k = gi - anchorGate; tgt = SCHED.targets[k] || null
    const gN = gates[gi]; const etaS = gN ? (sec - T0) + (gN.s - b.s) / Math.max(b.vs, 1) : 0
    crashNow = !crashed && SCHED.crashAt != null && gN && gN.type === 'gap wall' && etaS >= SCHED.crashAt - 0.9
    if (crashNow) tgt = { at: Math.max(SCHED.crashAt, etaS - 0.2), crash: true }
    const goalS = tgt ? (gates[gi] ? gates[gi].wallS : b.cup) : b.cup, goalT = T0 + (tgt ? tgt.at : SCHED.finishAt)
    const left = goalT - sec; const vReq = left > 0.08 ? (goalS - b.s) / left : 999
    wantTap = b.vs < vReq * 1.22
    // a jump pad only clears the sealed wall behind it at speed: never arrive at one slow
    const gp = gates[gi]; if (gp && gp.type === 'jump pad' && gp.s - b.s < 80 && !crashNow) wantTap = wantTap || b.vs < 118
  }
  if (WAYPOINTS) { const wp = WAYPOINTS.find(w => w[0] > sec); wantTap = wp ? b.vs < ((wp[1] - b.s) / Math.max(wp[0] - sec, 0.08)) * WPK : true
    const gq = gates[gi]; if (gq && gq.type === 'jump pad' && gq.s - b.s < 80 && !crashNow) wantTap = wantTap || b.vs < 118 }
  if (CRASH_S !== null && !crashed) { const gc = gates[gi]; crashNow = !!(gc && gc.type === 'gap wall' && gc.wallS >= CRASH_S); if (crashNow) tgt = { crash: true } }
  const CADTAP = Number(arg('cadtap', 0))   // follow: keep the old run's steady thumb rhythm (every N frames) instead of pacing to waypoints
  if (HUMAN || CADTAP) { if (F - lastTapF >= (CADTAP || CADENCE)) { await press('Space'); lastTapF = F } }   // a thumb keeps its rhythm, in the air too
  else if (wantTap && F - lastTapF >= Number(arg('tapgap', 8)) && (b.surf !== 'air' || arg('airtap', '0') === '1')) { await press('Space'); lastTapF = F }
  while (gi < gates.length && b.s > gates[gi].s) gi++
  const g = gates[gi]
  if ((HUMAN || FOLLOW) && g && !g.seenF && g.s - b.s < 400) {   // has the camera seen this wall's gap yet? (its nearest open lane)
    let near = g.safe[0], nb = 99; for (const l of g.safe) { const d = Math.abs(delta(l, b.lane)); if (d < nb) { nb = d; near = l } }
    // what a player must spot: the gap of a wall, or the pad itself for a jump (not the sealed wall behind it)
    const spotS = g.type === 'jump pad' ? g.s : g.wallS
    if (await page.evaluate(([s0, phi, rho, rc]) => window.__ddCanSee(s0, phi, rho, rc), [spotS, near * STEP, 4.95, 4.15])) {
      const seen = { seenF: F, seenT: +sec.toFixed(2), seenEta: +((spotS - b.s) / Math.max(b.vs, 1)).toFixed(2), stepsAtSeen: nb }
      // a stack of walls a few units apart is one sighting
      for (let j = gi; j < gates.length && gates[j].wallS - g.wallS < 40; j++) if (gates[j].seenF == null) Object.assign(gates[j], seen)
    }
  }
  const humanReady = !HUMAN || (g && g.seenF != null && F - g.seenF >= REACT_F)
  // --escape 1 (follow): right after a planned crash, get out of the blocked lane at once (the wall stacked behind it is not in the plan)
  const urgent = FOLLOW && arg('escape', '0') === '1' && F - lastHitF < 30 && g && !CRASH_SET.has(gi)
  if (g && humanReady && (F % 6 === 0 || urgent) && g.s - b.s < (crashNow ? 260 : (HUMAN ? 400 : 150)) && (b.surf === 'core' || AIRSTEER) && (F - lastStepF >= 12 || (urgent && F - lastStepF >= 4))) {
    const eta = (g.s - b.s) / Math.max(b.vs, 1); const intent = (tgt && tgt.crash) || CRASH_SET.has(gi) ? 'crash' : intentAt(sec + eta)
    if (tgt && tgt.late && eta > 0.6) continue
    // --handsoff 1: after a planned crash, the walls stacked right behind it get no steering (a caught-out thumb is still reacting)
    if (FOLLOW && arg('handsoff', '0') === '1' && intent !== 'crash' && [...CRASH_SET].some(i => gates[i].wallS < g.wallS && g.wallS - gates[i].wallS < 14)) continue
    const targets = intent === 'crash' ? [...Array(LANES).keys()].filter(l => !g.safe.includes(l)) : g.safe
    let dir = 0, bestAbs = Infinity
    if (intent === 'crash' && FOLLOW && arg('crashnear', '1') === '1') { for (const l of targets) { const d = delta(l, b.lane); if (Math.abs(d) < bestAbs) { bestAbs = Math.abs(d); dir = d } } }   // follow: crash where a caught-out player is, the nearest blocked lane
    else if (intent === 'crash') {   // aim for the MIDDLE of the wall: the blocked lane farthest from any gap, nearest first among equals
      let bestDepth = -1; for (const l of targets) { const depth = Math.min(...g.safe.map(sf => Math.abs(delta(sf, l)))), d = delta(l, b.lane)
        if (depth > bestDepth || (depth === bestDepth && Math.abs(d) < bestAbs)) { bestDepth = depth; bestAbs = Math.abs(d); dir = d } }
    } else for (const l of targets) { const d = delta(l, b.lane); if (Math.abs(d) < bestAbs) { bestAbs = Math.abs(d); dir = d } }
    if (LATE !== null && intent !== 'crash' && dir !== 0 && eta > Math.abs(dir) * 0.2 + LATE) continue   // last-second dodge: wait until there is only just time to make it
    const m = Math.sign(dir)
    if (m) { await step(m); lastStepF = F }
  }
}
log.frames = F; log.wall_s = Math.round((Date.now() - wall0) / 1000)

if (TAPE_OUT) { const tp = await page.evaluate(() => ({ frames: window.__chase.recorder ? [...window.__chase.recorder.frames] : null, gems: window.__chase.sim.ball.gemSerial })).catch(() => null); if (tp && tp.frames) fs.writeFileSync(TAPE_OUT, JSON.stringify({ recordId: path.basename(TAPE_OUT, '.json'), accountId: path.basename(TAPE_OUT, '.json'), finishTicks: finTicks, tick0, gems: tp.gems, frames: tp.frames })) }
if (TRACE) fs.writeFileSync(TRACE, JSON.stringify({ samples: trace, gates: log.gates, finished: log.finished ?? null, finishTicks: finTicks, tick0, hudRanks }))
const fin = await read().catch(() => null)
log.distance = fin ? Math.round(fin.s) : null; log.hits = log.gates.filter(g => g.result === 'HIT').length; log.clears = log.gates.filter(g => g.result === 'clear').length
if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)) } await browser.close()
const beatsOk = BEATS.length ? BEATS.filter(bt => bt.intent === 'crash').map(bt => ({ window: [bt.t0, bt.t1], hit_at: (log.gates.find(g => g.result === 'HIT' && g.t >= bt.t0 - 0.5 && g.t <= bt.t1 + 0.5) || {}).t ?? null })) : undefined
console.log(JSON.stringify({ T0: log.T0 ?? null, finished_script: (log.finished != null && log.T0 != null) ? +(log.finished - log.T0).toFixed(2) : null, frames: log.frames, wall_s: log.wall_s, distance: log.distance, clears: log.clears, hits: log.hits, finished: log.finished ?? null, beats: beatsOk, timeline: log.gates.map(g => `${g.t}s[script ${g.script}] ${g.result} x${g.streak}`).join(' | ') }, null, 1))
