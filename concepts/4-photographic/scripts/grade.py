import numpy as np
from PIL import Image
def hexrgb(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],dtype=np.float32)/255
# "Ink & Lamplight" grade — one LUT for the whole shoot
STOPS=[(0.00,'#03060b'),(0.10,'#070e19'),(0.22,'#0c1828'),(0.36,'#1f2836'),(0.50,'#4a4440'),(0.63,'#8a6b45'),(0.77,'#c49a52'),(0.90,'#ebcd8e'),(1.00,'#fbf3e2')]
def gradmap(L):
    xs=np.array([s[0] for s in STOPS]); cs=np.stack([hexrgb(s[1]) for s in STOPS])
    out=np.stack([np.interp(L,xs,cs[:,c]) for c in range(3)],-1)
    return out
def scurve(x,k=1.0):
    # gentle filmic s-curve
    return x+ k*0.18*np.sin(2*np.pi*(x-0.5))*(-1)/(2*np.pi)*2*np.pi*0 + k*(x - 0.5*(1-np.cos(np.pi*x)))*-0.0 if False else np.clip(0.5+ (x-0.5)*(1+0.45*k) - 0.45*k*((x-0.5)**3)*4/1.0,0,1)
def grade_arr_v1(rgb, mix=0.66, exposure=0.0, lift=0.0):
    rgb=np.clip(rgb*(2**exposure),0,1)
    L=0.2126*rgb[...,0]+0.7152*rgb[...,1]+0.0722*rgb[...,2]
    L=scurve(L)
    L=np.clip(L*(1-lift)+lift,0,1)
    g=gradmap(L)
    # keep a little of the original chroma, luminance-matched
    origL=0.2126*rgb[...,0]+0.7152*rgb[...,1]+0.0722*rgb[...,2]+1e-4
    chroma=rgb/origL[...,None]*L[...,None]
    out=g*mix+np.clip(chroma,0,1)*(1-mix)
    return np.clip(out,0,1)
NAVY=hexrgb('#0a1424'); INK=hexrgb('#04070d'); GOLD=hexrgb('#f0c77e'); CREAM=hexrgb('#fbf1de')
def smooth(e0,e1,x):
    t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
def grade_arr(rgb, exposure=0.0, sat=0.85, mix=None, lift=0.0, warmth=1.5):
    # "Ink & Lamplight": split-tone — shadows sink into ink-navy, highlights warm to lamp-gold,
    # midtones keep a restrained share of their own colour (wood stays wood, stone stays stone).
    rgb=np.clip(rgb*(2**exposure),0,1)
    L=0.2126*rgb[...,0]+0.7152*rgb[...,1]+0.0722*rgb[...,2]
    Lc=scurve(L)
    # restrained saturation, re-lit to the curved luminance
    grey=L[...,None]
    col=grey+(rgb-grey)*sat
    col=col*(Lc/(L+1e-4))[...,None]
    col=np.clip(col,0,1)
    ws=(1-smooth(0.0,0.55,Lc))[...,None]          # shadow weight
    wh=smooth(0.45,1.0,Lc)[...,None]              # highlight weight
    # shadows: blend toward navy (keeps blacks deep, never brown)
    sh=NAVY*(Lc[...,None]/0.32)
    col=col*(1-0.72*ws)+np.clip(sh,0,1)*0.72*ws
    # highlights: multiply toward gold, top end toward cream
    g=GOLD*(1-smooth(0.82,1.0,Lc))[...,None]+CREAM*smooth(0.82,1.0,Lc)[...,None]
    tint=col*(1-0.5*wh*warmth)+ (g*Lc[...,None]*1.08)*0.5*wh*warmth
    out=np.clip(tint,0,1)
    out=INK+(1-INK)*out  # ink-black floor
    return np.clip(out,0,1)
def grade_img(im, gnd=0.0, gnd_to=0.45, vignette=0.18, gnd_side=None, **kw):
    a=np.asarray(im.convert('RGB'),dtype=np.float32)/255
    h,w=a.shape[:2]
    if gnd>0:
        # graduated ND filter: darken the top (sky) before the grade, like a real filter
        y=np.linspace(0,1,h)[:,None]
        f=1-gnd*np.clip(1-y/gnd_to,0,1)**1.4
        a=a*f[...,None]
    if gnd_side:
        # side ND for compositions with text on one side ('left'/'right')
        x=np.linspace(0,1,w)[None,:]
        if gnd_side[0]=='left': t=np.clip(1-x/gnd_side[2],0,1)
        else: t=np.clip((x-(1-gnd_side[2]))/gnd_side[2],0,1)
        a=a*(1-gnd_side[1]*t**1.2)[...,None]
    out=grade_arr(a,**kw)
    if vignette>0:
        yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
        d=np.sqrt(((xx/w-0.5)/0.75)**2+((yy/h-0.5)/0.75)**2)
        out=out*(1-vignette*np.clip(d,0,1)**2)[...,None]
    return Image.fromarray((np.clip(out,0,1)*255+0.5).astype(np.uint8))
def write_cube(path, n=33, **kw):
    r=np.linspace(0,1,n)
    b,g,rr=np.meshgrid(r,r,r,indexing='ij')
    rgb=np.stack([rr,g,b],-1).reshape(-1,3)
    out=grade_arr(rgb.reshape(1,-1,3),**kw).reshape(-1,3)
    with open(path,'w') as f:
        f.write(f'TITLE "AlFaisal Ink and Lamplight"\nLUT_3D_SIZE {n}\n')
        for o in out: f.write(f'{o[0]:.6f} {o[1]:.6f} {o[2]:.6f}\n')
if __name__=='__main__':
    import sys
    out=sys.argv[1]; ims=[]
    for p in sys.argv[2:]:
        im=Image.open(p).convert('RGB'); im.thumbnail((420,420))
        ims.append((im,grade_img(im)))
    W=sum(max(a.width,0) for a,_ in ims); H=max(a.height for a,_ in ims)
    sheet=Image.new('RGB',(W,H*2),(0,0,0)); x=0
    for a,g in ims: sheet.paste(a,(x,0)); sheet.paste(g,(x,H)); x+=a.width
    sheet.save(out)
