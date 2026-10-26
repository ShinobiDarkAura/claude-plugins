// Offline race planner for Dango Derby ad gameplay (capture tooling, not game code).
// Plans "you" and five rivals on a real map with the game's own wasm physics, so the
// filmed replay (driver-capture-v3 --you-tape + --ghosts) crashes, passes and finishes
// exactly where the story needs. A human-like thumb: steady tap rhythm, obstacles only
// dodged once seen + a reaction delay, one lane per press; look-ahead uses the real sim.
//
//   npx vite-node _rec/plan.ts <spec.json> <outDir>
// spec: { seed, motif, tick0, story: <old story dir with you-final.json>, names: [5],
//         margins: {NAME: seconds}, ranks: [[t, rank], ...], crashes: [t, ...], finish: t,
//         oldCup, you?: {cadence, sightSec, react}, seedRng }
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { compileChase } from '../src/chase/course'
import { generatePlan } from '../src/chase/generator'
import { initChaseCore, createChaseSim } from '../src/chase/sim'
import { createTapeCursor, tapeInputAt } from '../src/chase/replay'

type Frame = { tick: number; laneSteps: number; forwardChunk: number; hold: boolean }
type Obs = { s0: number; s1: number; kind: string }

await initChaseCore(new Uint8Array(await readFile(new URL('../src/runner/physics/puttfall_core.wasm', import.meta.url))))
const [specFile, outDir] = process.argv.slice(2)
const spec = JSON.parse(await readFile(specFile, 'utf8'))
await mkdir(outDir, { recursive: true })
const layout = compileChase(generatePlan(spec.seed, spec.motif))
const CUP = layout.cupS, TICK0: number = spec.tick0
const obstacles: Obs[] = layout.sections.flatMap((sec: any) => Object.values(sec.coreObstacles).map((o: any) => ({ s0: o.s0, s1: o.s1, kind: o.kind })))
  .sort((a, b) => a.s0 - b.s0)
const MAXT = TICK0 + 60 * 70

// ---- tape helpers
const merge = (m: Map<number, Frame>, tick: number, lane: number, chunk: number) => {
  const f = m.get(tick) ?? { tick, laneSteps: 0, forwardChunk: 0, hold: false }
  f.laneSteps = Math.max(-2, Math.min(2, f.laneSteps + lane)); f.forwardChunk = Math.min(1, f.forwardChunk + chunk); m.set(tick, f)
}
const TAP = [1, 1, 0.5]
const toFrames = (m: Map<number, Frame>) => [...m.values()].filter(f => f.laneSteps || f.forwardChunk).sort((a, b) => a.tick - b.tick)

/** Re-simulate a tape from tick 0 through `until` and report hits after `from`. */
function run(frames: Frame[], until: number, from = 0) {
  const sim = createChaseSim(layout); sim.start()
  const cur = createTapeCursor(frames)
  const hits: number[] = []; let pj = sim.ball.jellySerial
  while (!sim.ball.finished && sim.ball.ticks < until) {
    const t = sim.ball.ticks
    sim.tick(tapeInputAt(cur, t))
    if (sim.ball.jellySerial > pj && t >= from) hits.push(t)
    pj = sim.ball.jellySerial
  }
  const out = { hits, s: sim.ball.s, finished: sim.ball.finished, ticks: sim.ball.ticks }
  sim.dispose(); return out
}

// seeded rng so a spec always plans the same race
let rs = spec.seedRng ?? 7
const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff }

type Opts = { cadence: number; sightSec: number; react: number; way: [number, number][]; crashAt: number[]; paceK: number; name: string }
/** Plan one rider. `way` = [videoSec, s] pace targets; `crashAt` = video seconds to get caught out at. */
async function planRider(o: Opts) {
  const m = new Map<number, Frame>()
  const sim = createChaseSim(layout); sim.start()
  const sAt = (sec: number) => { const w = o.way; if (sec <= w[0][0]) return w[0][1]; for (let i = 1; i < w.length; i++) if (w[i][0] >= sec) { const a = w[i - 1], b = w[i]; return a[1] + (b[1] - a[1]) * (sec - a[0]) / Math.max(1e-6, b[0] - a[0]) } return 1e9 }
  let lastTap = -99, lastPress = -99, pj = 0
  const seen = new Map<number, number>()   // obstacle index -> tick first seen
  const crashDone = o.crashAt.map(() => false)
  const hitsLog: number[] = [], samples: { t: number; s: number }[] = [], sPerTick: number[] = []
  let finishSec: number | null = null
  while (sim.ball.ticks < MAXT) {
    const t = sim.ball.ticks, b = sim.ball, sec = (t - TICK0) / 60
    // --- thumb: tap on the rhythm while behind the pace
    if (t >= 1 && t - lastTap >= o.cadence) {   // the game feeds nothing on the race's first tick
      const ahead = sec + 0.5
      const vReq = (sAt(ahead) - b.s) / 0.5
      if (b.vs < vReq * o.paceK || sec + SHIFT < 0.2) { TAP.forEach((c, i) => merge(m, t + i, 0, c)); lastTap = t }
    }
    // --- eyes: which obstacles are in sight, and for how long
    const sight = b.s + Math.max(b.vs, 20) * o.sightSec
    for (let i = 0; i < obstacles.length; i++) { const ob = obstacles[i]; if (ob.s0 > sight) break; if (ob.s1 >= b.s && !seen.has(i)) seen.set(i, t) }
    const known = [...seen.entries()].filter(([i, t0]) => t - t0 >= o.react && obstacles[i].s1 >= b.s - 1)
    const ci = o.crashAt.findIndex((c, k) => !crashDone[k] && sec >= c - 1.4 && sec <= c + 0.35)
    if ((known.length || ci >= 0) && t - lastPress >= 5 && t % 2 === 0) {
      const H = 75
      // candidate thumb plans: k presses in dir, starting after `d` ticks, taps continue on the rhythm
      const plans: { dir: number; k: number; d: number }[] = [{ dir: 0, k: 0, d: 0 }]
      for (const dir of [-1, 1]) for (const k of [1, 2, 3]) for (const d of [0, 8, 16]) plans.push({ dir, k, d })
      const base = toFrames(m)
      const futureTaps = new Map<number, Frame>()
      for (let tt = Math.max(lastTap + o.cadence, t); tt < t + H; tt += o.cadence) TAP.forEach((c, i) => merge(futureTaps, tt + i, 0, c))
      let best: any = null
      for (const p of plans) {
        const mm = new Map<number, Frame>(); for (const f of base) mm.set(f.tick, { ...f })
        for (const f of futureTaps.values()) if (f.tick >= t) merge(mm, f.tick, 0, f.forwardChunk)
        for (let j = 0; j < p.k; j++) merge(mm, t + p.d + j * 5, p.dir, 0)
        const r = run(toFrames(mm), t + H, t)
        let cost: number
        if (ci >= 0) {   // get caught out: a hit as close to the story second as possible, the smallest move
          const tgt = TICK0 + o.crashAt[ci] * 60
          const hit = r.hits.find(h => Math.abs(h - tgt) <= 25)
          cost = hit !== undefined ? Math.abs(hit - tgt) / 60 + p.k * 0.05 + p.d * 0.002 : 100 + r.hits.length
        } else cost = r.hits.length * 100 + p.k + p.d * 0.01
        if (!best || cost < best.cost) best = { ...p, cost }
        if (ci < 0 && p.k === 0 && r.hits.length === 0) break   // staying put is clean: a thumb does nothing
      }
      if (best && best.k > 0 && best.d === 0 && t >= 1) { merge(m, t, best.dir, 0); lastPress = t }
    }
    const f = m.get(t)
    sim.tick(f ? { laneSteps: f.laneSteps, forwardChunk: f.forwardChunk, hold: false } : { laneSteps: 0, forwardChunk: 0, hold: false })
    if (sim.ball.jellySerial > pj) { hitsLog.push(+(sec).toFixed(2)); const k = o.crashAt.findIndex((c, i) => !crashDone[i] && Math.abs(sec - c) < 0.6); if (k >= 0) crashDone[k] = true }
    pj = sim.ball.jellySerial
    sPerTick[t] = sim.ball.s
    if ((t - TICK0) % 15 === 0 && t >= TICK0) samples.push({ t: +sec.toFixed(2), s: Math.round(sim.ball.s) })
    if (sim.ball.finished) { finishSec = +(((sim.ball.ticks) - TICK0) / 60).toFixed(2); break }
  }
  const frames = toFrames(m).filter(f => f.tick < sim.ball.ticks)
  const endTicks = sim.ball.ticks; sim.dispose()
  return { name: o.name, frames, hits: hitsLog, finishSec, finishTicks: endTicks, samples, sPerTick }
}

// ---- "you": the old story's pace, stretched to this course, with each crash landing on an obstacle
const old = JSON.parse(await readFile(path.join(spec.story, 'you-final.json'), 'utf8'))
const k = CUP / spec.oldCup
// --warp: squeeze the stretch after the last beat so the finish lands earlier (the actor celebrates early)
const W0 = spec.warp?.from, OLDFIN = spec.finish, NEWFIN = spec.warp?.finish ?? spec.finish
const warp = (t: number) => W0 != null && t > W0 ? W0 + (t - W0) * (NEWFIN - W0) / (OLDFIN - W0) : t
if (W0 != null) spec.finish = NEWFIN   // only the pace and the finish move: crashes and place changes stay on the acting
// --shift: the video starts `shift` s into the race (a 30 s ad is the race's last 30 s); story times are video times
const SHIFT = spec.shift ?? 0
let way: [number, number][] = old.samples.map((x: any) => [warp(x.t) - SHIFT, x.s * k])
way.push([spec.finish, CUP + 5])
// incidents: hits within 0.35 s are one crash (a stacked wall)
const incidents: number[] = []; for (const c of spec.crashes) if (!incidents.length || c - incidents[incidents.length - 1] > 0.35) incidents.push(c)
const sWay = (sec: number) => { for (let i = 1; i < way.length; i++) if (way[i][0] >= sec) { const a = way[i - 1], b = way[i]; return a[1] + (b[1] - a[1]) * (sec - a[0]) / Math.max(1e-6, b[0] - a[0]) } return CUP }
for (const c of incidents) {   // re-aim the pace so an obstacle is under the ball at the crash second
  const s = sWay(c); const ob = obstacles.reduce((p, q) => Math.abs(q.s0 - s) < Math.abs(p.s0 - s) ? q : p)
  way = way.filter(w => Math.abs(w[0] - c) > 0.9); way.push([c, ob.s0]); way.sort((a, b) => a[0] - b[0])
}
const Y = spec.you ?? {}
let you: ReturnType<typeof planRider> | null = null, youScore = Infinity
const crashErr = (hits: number[]) => {   // each story crash matched to the nearest planned hit; extra incidents cost too
  let e = 0; const used = new Set<number>()
  for (const c of incidents) { let bi = -1, bd = 9; hits.forEach((h, i) => { if (!used.has(i) && Math.abs(h - c) < bd) { bd = Math.abs(h - c); bi = i } }); if (bi >= 0 && bd < 1.2) { used.add(bi); e += bd } else e += 3 }
  const extra = hits.filter((h, i) => !used.has(i) && !incidents.some(c => Math.abs(h - c) < 0.5)).length
  return e + 1.5 * extra
}
outer: for (const [sightSec, react] of [[Y.sightSec ?? 1.1, Y.react ?? 14], [1.3, 10], [0.95, 16], [1.2, 12]]) for (const paceK of [1.12, 1.2, 1.05, 1.3]) {
  const r = await planRider({ name: 'you', cadence: Y.cadence ?? 9, sightSec, react, way, crashAt: incidents, paceK })
  const score = Math.abs((r.finishSec ?? 99) - spec.finish) + crashErr(r.hits)
  if (score < youScore) { you = r; youScore = score }
  if (score < 0.35) break outer
}
console.log(`you: finish ${you!.finishSec} (story ${spec.finish}), hits ${JSON.stringify(you!.hits)} (story ${JSON.stringify(spec.crashes)})`)

// ---- rivals: time-lagged copies of your pace, so the order changes exactly at the story's place changes
const youS = you!.sPerTick, yFin = you!.finishSec!
const youSAt = (sec: number) => { const t = Math.round(TICK0 + sec * 60); if (t <= 0) return 0; if (t >= youS.length) return youS[youS.length - 1] + (t - youS.length) * 2; return youS[t] ?? 0 }
const names: string[] = spec.names
const order = [...names].sort((a, b) => spec.margins[a] - spec.margins[b])   // closest finishers first
{ const R = spec.ranks as [number, number][]; const out: [number, number][] = []
  for (const r of R) { const last = out[out.length - 1]; if (last && r[0] > 1.6 && r[0] - last[0] < 0.35 && out.length >= 2 && out[out.length - 2][1] === r[1]) { out.pop(); continue } out.push(r) }
  spec.ranks = out }
const rankAt = (sec: number) => { let r = spec.ranks[0][1]; for (const [t, k2] of spec.ranks) if (t <= sec) r = k2; return r }
// the story after the start scramble (first 1.6 s)
const changes: number[] = spec.ranks.map((x: number[]) => x[0]).filter((t: number) => t > 1.6)
const rivals: any[] = []
const flipsOf = (rs: number[]) => {   // seconds (after the start scramble, before your finish) where this rider and you swap order
  const out: number[] = []; let prev: boolean | null = null
  for (let sec = 1.6; sec < yFin; sec = +(sec + 0.02).toFixed(2)) { const t = Math.round(TICK0 + sec * 60); if (t >= rs.length) break; const a = (rs[t] ?? rs[rs.length - 1]) > (youS[t] ?? youS[youS.length - 1]); if (prev !== null && a !== prev) out.push(sec); prev = a }
  return out
}
for (let j = 0; j < order.length; j++) {
  const name = order[j], margin = spec.margins[name]
  const aheadAt = (sec: number) => j < rankAt(sec) - 1
  const want = changes.filter(c => aheadAt(c - 0.05) !== aheadAt(c + 0.05))   // the swaps this rider owns
  let marginAdj = 0; const shift = want.map(() => 0); let best: any = null
  for (let iter = 0; iter < 4; iter++) {
    const cs = want.map((c, i) => c + shift[i])
    const aheadS = (sec: number) => { let a = aheadAt(1.7); for (const c of cs) if (sec >= c) a = !a; return a }
    // lag in seconds: negative = ahead of you. Crosses zero at each (shifted) swap.
    const lagAt = (sec: number) => {
      const base = aheadS(sec) ? -(spec.leadLag ?? 0.9) - 0.15 * j : (spec.trailLag ?? 0.9) + 0.2 * j
      let lag = base
      for (const c of cs) if (Math.abs(sec - c) < 1.5) { const after = aheadS(c + 0.01); lag = (after ? -1 : 1) * Math.abs(base) * ((sec - c) / 1.5) }
      const endBlend = Math.max(0, Math.min(1, (sec - (yFin - 7)) / 7)); lag = lag * (1 - endBlend) + (margin + marginAdj) * endBlend
      const startBlend = Math.max(0, Math.min(1, (sec + SHIFT) / 3)); return lag * startBlend
    }
    const w: [number, number][] = []
    for (let sec = -SHIFT; sec <= yFin + Math.max(0, margin + marginAdj) + 2; sec += 0.25) w.push([sec, youSAt(sec - lagAt(sec))])
    w.push([yFin + margin + marginAdj, CUP + 5]); w.sort((a, b) => a[0] - b[0])
    const R = spec.rivals?.[name] ?? {}
    const r = await planRider({ name, cadence: R.cadence ?? 8 + (j % 3), sightSec: R.sightSec ?? 1.0 + 0.1 * (j % 2), react: R.react ?? 12 + 2 * j, way: w, crashAt: R.crashAt ?? [], paceK: 1.12 })
    const finErr = (r.finishSec ?? 99) - (yFin + margin), got = flipsOf(r.sPerTick)
    const flipErr = got.length === want.length ? want.reduce((s2, c, i) => s2 + Math.abs(got[i] - c), 0) : 5 * Math.abs(got.length - want.length) + 5
    const score = Math.abs(finErr) + flipErr
    if (!best || score < best.score) best = { ...r, margin, score, finErr, got, want }
    if (score < 0.3) break
    marginAdj -= finErr
    if (got.length === want.length) want.forEach((c, i) => { shift[i] += c - got[i] })
  }
  rivals.push(best)
  console.log(`${name}: finish ${best.finishSec} (want ${(yFin + margin).toFixed(2)}), swaps ${JSON.stringify(best.got)} (want ${JSON.stringify(best.want)}), hits ${best.hits.length}`)
}

// ---- the place you'd see, from the planned runs (the HUD ranks by distance)
const ranks: [number, number][] = []
for (let sec = 0; sec <= yFin + 0.5; sec = +(sec + 0.02).toFixed(2)) {
  const t = Math.round(TICK0 + sec * 60); const ys = youS[Math.min(t, youS.length - 1)]
  let r = 1; for (const rv of rivals) { const rs2 = rv.sPerTick[Math.min(t, rv.sPerTick.length - 1)] ?? 0; const rf = rv.finishSec != null && rv.finishSec <= sec; if (sec < yFin && (rf || rs2 > ys)) r++; if (sec >= yFin && rv.finishSec != null && rv.finishSec < yFin) r++ }
  if (!ranks.length || ranks[ranks.length - 1][1] !== r) ranks.push([sec, r])
}
console.log('planned places:', JSON.stringify(ranks))
console.log('story places:  ', JSON.stringify(spec.ranks))

// ---- write: you tape (shifted to start recording at TICK0), rival field, trace
const youTape = { recordId: 'you', accountId: 'you', tick0: TICK0, finishTicks: you!.finishTicks, frames: you!.frames }
await writeFile(path.join(outDir, 'you-tape.json'), JSON.stringify(youTape))
const field = rivals.map(r => ({ recordId: r.name, accountId: r.name, finishTicks: r.finishTicks, frames: r.frames }))
await writeFile(path.join(outDir, 'field.json'), JSON.stringify(field))
await writeFile(path.join(outDir, 'plan.json'), JSON.stringify({ map: spec.mapName, seed: spec.seed, motif: spec.motif, you: { finish: you!.finishSec, hits: you!.hits, samples: you!.samples }, rivals: rivals.map(r => ({ name: r.name, finish: r.finishSec, hits: r.hits })), ranks, storyRanks: spec.ranks }, null, 1))
