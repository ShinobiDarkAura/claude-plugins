#!/usr/bin/env python3
"""wipecut.py <anim.mp4> <race.mp4> <out.mp4> [anim_seconds]
Animation -> race with the app-preview ball-roll wipe: a big sticker Sakura dango rolls right->left across the
frame (0.5 s, spinning), the race revealed behind its centre. Anim audio quiet, race audio loud, a whoosh on the roll."""
import sys, os, subprocess, tempfile, math
from PIL import Image
A, R, OUT = sys.argv[1:4]; FPS = 60; W, H = 1080, 1920; WD = 0.5
dur = lambda f: float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
T = float(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else dur(A)
LTR = len(sys.argv) > 5 and sys.argv[5] == 'ltr'   # roll left -> right
tmp = tempfile.mkdtemp(); here = os.path.dirname(os.path.abspath(__file__))
ball = Image.open(f"{here}/wipe/ball.png"); D = 900; ball = ball.resize((D, D), Image.LANCZOS)
def frames(src, ss, t, name):
    os.makedirs(f"{tmp}/{name}")
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(ss),'-t',str(t),'-i',src,'-vf',f'scale={W}:{H},fps={FPS},setsar=1',f'{tmp}/{name}/%04d.png'],check=True)
    return sorted(os.listdir(f"{tmp}/{name}"))
fa = frames(A, max(0, T - WD/2), WD/2, 'a'); fb = frames(R, 0, WD, 'b'); os.makedirs(f"{tmp}/w")
n = int(WD * FPS)
for i in range(n):
    p = i / (n - 1); e = p*p*(3-2*p)                      # smoothstep
    cx = int(-D/2 + e * (W + D)) if LTR else int(W + D/2 - e * (W + D))
    fa_i = fa[min(i, len(fa)-1)]; fb_i = fb[min(i, len(fb)-1)]
    a = Image.open(f"{tmp}/a/{fa_i}").convert("RGB"); b = Image.open(f"{tmp}/b/{fb_i}").convert("RGB")
    x0 = max(0, min(W, cx))
    if LTR: fr = b.copy(); fr.paste(a.crop((x0, 0, W, H)), (x0, 0))
    else: fr = a.copy(); fr.paste(b.crop((x0, 0, W, H)), (x0, 0))
    rb = ball.rotate(-e * 540 if LTR else e * 540, resample=Image.BICUBIC)
    fr.paste(rb, (cx - D//2, H//2 - D//2 - 80), rb); fr.save(f"{tmp}/w/{i:04d}.png")
subprocess.run(['ffmpeg','-v','error','-y','-framerate',str(FPS),'-i',f'{tmp}/w/%04d.png','-c:v','libx264','-crf','16','-pix_fmt','yuv420p',f'{tmp}/w.mp4'],check=True)
cut = T - WD/2; wh = f"{here}/wipe/whoosh.mp3"
fc = (f"[0:v]scale={W}:{H},fps={FPS},setsar=1,trim=0:{cut},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[w];"
      f"[2:v]scale={W}:{H},fps={FPS},setsar=1,trim={WD}:,setpts=PTS-STARTPTS[b];[a][w][b]concat=n=3:v=1:a=0[v];"
      f"[0:a]aresample=44100,atrim=0:{T},asetpts=PTS-STARTPTS{'' if os.environ.get('KEEP_ANIM_MIX') else ',loudnorm=I=-18:TP=-1'}[aa];"
      f"[2:a]aresample=44100,atrim={WD/2}:,asetpts=PTS-STARTPTS,loudnorm=I=-13:TP=-1[ba];[aa][ba]concat=n=2:v=0:a=1[cat];"
      f"[3:a]aresample=44100,volume=0.8,adelay={int(cut*1000)}:all=1[wh];[cat][wh]amix=inputs=2:duration=first:normalize=0[au]")
subprocess.run(['ffmpeg','-v','error','-y','-i',A,'-i',f'{tmp}/w.mp4','-i',R,'-i',wh,'-filter_complex',fc,'-map','[v]','-map','[au]',
                '-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT],check=True)
print(OUT, round(dur(OUT),2))
