import React, { useMemo } from 'react';
import {
  AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender,
} from 'remotion';

/**
 * « Comment l'eau devient douce » : coupe schématique d'un adoucisseur.
 * La séquence est lue au défilement (image par image), donc chaque image doit être lisible seule
 * et l'animation doit se lire aussi à l'envers. 120 images, 4 temps de 30 images :
 *  0–29  l'eau dure arrive          30–59  la résine capte le calcaire
 * 60–89  l'eau adoucie sort         90–119 régénération par la saumure, rinçage à l'égout
 */

export type Layout = 'wide' | 'tall';
export type SoftenerProps = { layout: Layout };

const C = {
  bg: '#0F1D24', bg2: '#0A1419', panel: '#16282F', line: 'rgba(243,242,238,.22)', lineStrong: 'rgba(243,242,238,.5)',
  text: '#F3F2EE', muted: 'rgba(243,242,238,.62)', amber: '#D9A25F', amberDeep: '#A8692A', amberLight: '#F0C68C',
  chalk: '#E9E3D5', water: '#9DB8C2', red: '#E8212B',
};

type Pt = [number, number];
type Geo = {
  W: number; H: number;
  tank: { x: number; y: number; w: number; h: number }; bedTop: number;
  valve: { x: number; y: number; w: number; h: number };
  inlet: Pt[]; outlet: Pt[]; brine: { x: number; y: number; w: number; h: number }; brineLine: Pt[]; drain: Pt[];
  gauge: { x: number; y: number; len: number; vertical: boolean };
  tap: Pt; basinY: number;
  focus: Pt; zoom: number;
};

const GEO: Record<Layout, Geo> = {
  wide: {
    W: 1600, H: 900,
    tank: { x: 560, y: 336, w: 320, h: 492 }, bedTop: 440,
    valve: { x: 610, y: 258, w: 220, h: 84 },
    inlet: [[-20, 300], [620, 300]],
    outlet: [[820, 300], [1190, 300], [1190, 540], [1262, 540]],
    brine: { x: 930, y: 536, w: 200, h: 292 },
    brineLine: [[960, 536], [960, 380], [790, 380], [790, 342]],
    drain: [[620, 326], [480, 326], [480, 826], [480, 860]],
    gauge: { x: 1468, y: 400, len: 400, vertical: true },
    tap: [1262, 540], basinY: 800,
    focus: [720, 600], zoom: 1.22,
  },
  tall: {
    W: 900, H: 1200,
    tank: { x: 300, y: 390, w: 300, h: 560 }, bedTop: 500,
    valve: { x: 345, y: 312, w: 210, h: 82 },
    inlet: [[-20, 352], [355, 352]],
    outlet: [[545, 352], [920, 352]],
    brine: { x: 650, y: 680, w: 200, h: 270 },
    brineLine: [[680, 680], [680, 432], [530, 432], [530, 394]],
    drain: [[355, 378], [220, 378], [220, 950], [220, 975]],
    gauge: { x: 120, y: 1110, len: 660, vertical: false },
    tap: [920, 352], basinY: 0,
    focus: [450, 680], zoom: 1.2,
  },
};

// Pseudo-aléatoire déterministe (même image à chaque rendu)
const rand = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

// Position le long d'une ligne brisée, t dans [0,1]
function along(path: Pt[], t: number): Pt {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const k = segs[i] ? d / segs[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    d -= segs[i];
  }
  return path[path.length - 1];
}

const Pipe: React.FC<{ path: Pt[]; width: number; glow?: number }> = ({ path, width, glow = 0 }) => {
  const d = 'M' + path.map((p) => p.join(' ')).join(' L');
  return (
    <g>
      <path d={d} stroke={C.lineStrong} strokeWidth={width + 2} fill="none" strokeLinejoin="round" />
      <path d={d} stroke={C.bg2} strokeWidth={width - 2} fill="none" strokeLinejoin="round" />
      {glow > 0 && <path d={d} stroke={C.water} strokeOpacity={glow * 0.22} strokeWidth={width - 10} fill="none" strokeLinejoin="round" />}
    </g>
  );
};

const useFonts = () => {
  useMemo(() => {
    if (typeof document === 'undefined') return;
    const handle = delayRender('fonts');
    const fonts = [
      new FontFace('Newsreader', `url(${staticFile('newsreader.woff2')})`, { weight: '200 800' }),
      new FontFace('Hanken', `url(${staticFile('hanken.woff2')})`, { weight: '100 900' }),
    ];
    Promise.all(fonts.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    });
  }, []);
};

export const Softener: React.FC<SoftenerProps> = ({ layout }) => {
  useFonts();
  const { width, height, durationInFrames } = useVideoConfig();
  // Le récit est écrit sur 120 « temps » ; plus d'images = mêmes étapes, découpées plus finement.
  const frame = useCurrentFrame() * (120 / durationInFrames);
  const g = GEO[layout];
  const { tank, bedTop } = g;
  const bedBottom = tank.y + tank.h - 34;
  const riserX = tank.x + tank.w / 2;

  // Phases
  const pService = interpolate(frame, [0, 6, 84, 92], [0, 1, 1, 0], clamp);
  const pRegen = interpolate(frame, [88, 98, 116, 119], [0, 1, 1, 0.6], clamp);
  const pOut = interpolate(frame, [52, 66, 86, 94], [0, 1, 1, 0], clamp);
  const zoom = interpolate(frame, [22, 44, 60, 76], [1, g.zoom, g.zoom, 1], { ...clamp, easing: ease });
  const th = Math.round(interpolate(frame, [58, 82], [32, 12], { ...clamp, easing: ease }));

  // Billes de résine (fixes)
  const beads = useMemo(() => {
    const out: { x: number; y: number; r: number; c: string }[] = [];
    const cols = Math.floor((tank.w - 40) / 22);
    const rows = Math.floor((bedBottom - bedTop) / 20);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = tank.x + 24 + c * 22 + (r % 2) * 11 + (rand(i, 1) - 0.5) * 5;
      if (Math.abs(x - riserX) < 16 || x > tank.x + tank.w - 18) continue;
      const shade = rand(i, 2);
      out.push({ x, y: bedTop + 12 + r * 20 + (rand(i, 3) - 0.5) * 5, r: 8 + rand(i, 4) * 2.2, c: shade < 0.33 ? C.amberDeep : shade < 0.8 ? C.amber : C.amberLight });
    }
    return out;
  }, [layout]);

  // Ions calcium : entrent par l'arrivée, descendent dans la résine, sont captés ; repartent à l'égout en régénération.
  const N = 34;
  const ions = Array.from({ length: N }, (_, i) => {
    const enter = 2 + i * 1.7;                    // image où l'ion entre dans le tuyau
    const tIn = (frame - enter) / 22;            // trajet dans le tuyau d'arrivée
    const capY = bedTop + 30 + rand(i, 7) * (bedBottom - bedTop - 70);
    const capX = tank.x + 30 + rand(i, 8) * (tank.w - 60);
    const x = Math.abs(capX - riserX) < 22 ? capX + 30 : capX;
    let pos: Pt | null = null; let captured = false; let alpha = 1;
    if (tIn < 0) pos = null;
    else if (tIn < 1) pos = along([...g.inlet, [x, g.valve.y + g.valve.h + 20]], tIn);
    else {
      const fall = (frame - enter - 22) / 18;      // descente dans la résine
      const y = interpolate(fall, [0, 1], [tank.y + 40, capY], { ...clamp, easing: Easing.out(Easing.quad) });
      pos = [x + Math.sin(frame * 0.2 + i) * 3 * (1 - Math.min(1, fall)), y];
      captured = fall >= 1;
    }
    // Régénération : départ vers l'égout
    const leave = (frame - 94 - rand(i, 9) * 10) / 14;
    if (pos && leave > 0) {
      const path: Pt[] = [pos, [x, tank.y + 30], [g.drain[0][0], g.drain[0][1]], ...g.drain.slice(1)];
      pos = along(path, leave);
      captured = false;
      alpha = interpolate(leave, [0.85, 1], [1, 0], clamp);
    }
    return { pos, captured, alpha, i };
  });

  // Eau (petites particules) : arrivée, puis eau douce en sortie
  const waterIn = Array.from({ length: 22 }, (_, i) => {
    const t = ((frame * 0.035 + rand(i, 11)) % 1);
    return along(g.inlet, t);
  });
  const riser: Pt[] = [[riserX, bedBottom], [riserX, g.valve.y + g.valve.h], ...g.outlet];
  const waterOut = Array.from({ length: 30 }, (_, i) => along(riser, (frame * 0.022 + rand(i, 12)) % 1));
  const sodium = Array.from({ length: 26 }, (_, i) => {
    const t = ((frame - 34) * 0.03 + rand(i, 13)) % 1;
    return [tank.x + 26 + rand(i, 14) * (tank.w - 52), bedTop + t * (bedBottom - bedTop)] as Pt;
  });
  const brine = Array.from({ length: 16 }, (_, i) => along([...g.brineLine, [g.brineLine[3][0], bedBottom]], (frame * 0.04 + rand(i, 15)) % 1));

  const gaugeT = (th - 0) / 50;
  const gg = g.gauge;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${C.panel} 0%, ${C.bg} 55%, ${C.bg2} 100%)` }}>
      <svg width={width} height={height} viewBox={`0 0 ${g.W} ${g.H}`}>
        <defs>
          <clipPath id="tank"><rect x={tank.x + 4} y={tank.y + 4} width={tank.w - 8} height={tank.h - 8} rx={46} /></clipPath>
          <linearGradient id="glass" x1="0" x2="1">
            <stop offset="0" stopColor="#F3F2EE" stopOpacity=".07" /><stop offset=".5" stopColor="#F3F2EE" stopOpacity=".02" /><stop offset="1" stopColor="#F3F2EE" stopOpacity=".08" />
          </linearGradient>
        </defs>
        <g transform={`translate(${g.focus[0]} ${g.focus[1]}) scale(${zoom}) translate(${-g.focus[0]} ${-g.focus[1]})`}>
          {/* Canalisations */}
          <Pipe path={g.drain} width={18} />
          <Pipe path={g.brineLine} width={14} />
          <Pipe path={g.inlet} width={40} />
          <Pipe path={g.outlet} width={40} glow={pOut} />

          {brine.map((p, i) => p[1] <= g.valve.y + g.valve.h && (
            <circle key={'b' + i} cx={p[0]} cy={p[1]} r={3} fill={C.amberLight} opacity={pRegen * 0.85} />
          ))}
          {/* Grille d'égout */}
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={g.drain[3][0] - 26 + k * 14} y={g.drain[3][1] - 4} width={8} height={18} fill={C.line} />
          ))}

          {/* Bac à sel */}
          <rect x={g.brine.x} y={g.brine.y} width={g.brine.w} height={g.brine.h} rx={14} fill={C.bg2} stroke={C.lineStrong} strokeWidth={2} />
          {Array.from({ length: 24 }, (_, i) => (
            <rect key={i} x={g.brine.x + 18 + (i % 6) * ((g.brine.w - 36) / 6)} y={g.brine.y + g.brine.h - 30 - Math.floor(i / 6) * 26}
              width={(g.brine.w - 36) / 6 - 6} height={20} rx={4} fill={C.chalk} opacity={0.18 + rand(i, 20) * 0.2} />
          ))}
          <rect x={g.brine.x + 8} y={g.brine.y + g.brine.h * 0.42} width={g.brine.w - 16} height={g.brine.h * 0.55} rx={8}
            fill={C.amberLight} opacity={0.06 + pRegen * 0.12} />

          {/* Bouteille de résine */}
          <rect x={tank.x} y={tank.y} width={tank.w} height={tank.h} rx={50} fill={C.bg2} stroke={C.lineStrong} strokeWidth={2.5} />
          <g clipPath="url(#tank)">
            <rect x={tank.x} y={tank.y} width={tank.w} height={tank.h} fill="url(#glass)" />
            {beads.map((b, i) => (
              <g key={i} opacity={interpolate(frame, [0, 10], [0.6, 0.94], clamp)}>
                <circle cx={b.x} cy={b.y} r={b.r} fill={b.c} />
                <circle cx={b.x - b.r * 0.32} cy={b.y - b.r * 0.32} r={b.r * 0.34} fill="#FFF6E6" opacity={0.28} />
              </g>
            ))}
            {/* Tube central (remontée de l'eau douce) */}
            <rect x={riserX - 9} y={g.valve.y + g.valve.h - 6} width={18} height={bedBottom - g.valve.y - g.valve.h + 10} fill={C.bg} stroke={C.line} />
            {sodium.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={C.amberLight}
                opacity={interpolate(frame, [34, 44, 84, 92], [0, 0.85, 0.85, 0], clamp)} />
            ))}
            <rect x={tank.x} y={bedTop - 10} width={tank.w} height={bedBottom - bedTop + 30} fill={C.amberLight} opacity={pRegen * 0.12} />
            {brine.map((p, i) => p[1] > tank.y && (
              <circle key={i} cx={p[0] - (rand(i, 16) - 0.5) * tank.w * 0.7} cy={p[1]} r={3.6} fill={C.amberLight} opacity={pRegen * 0.7} />
            ))}
          </g>

          {/* Tête de vanne */}
          <rect x={g.valve.x} y={g.valve.y} width={g.valve.w} height={g.valve.h} rx={10} fill={C.panel} stroke={C.lineStrong} strokeWidth={2} />
          <rect x={g.valve.x + g.valve.w - 46} y={g.valve.y + 22} width={26} height={8} rx={4} fill={C.red} opacity={0.9} />
          <rect x={g.valve.x + 20} y={g.valve.y + 20} width={70} height={42} rx={6} fill={C.bg2} stroke={C.line} />

          {/* Eau */}
          {waterIn.map((p, i) => <circle key={i} cx={p[0]} cy={p[1] + (rand(i, 17) - 0.5) * 22} r={3} fill={C.water} opacity={0.55 * pService} />)}
          {waterOut.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.4} fill={C.water} opacity={0.9 * pOut} />)}
          {g.basinY > 0 && (
            <g>
              <rect x={g.tap[0] - 6} y={g.tap[1] - 26} width={34} height={52} rx={8} fill={C.panel} stroke={C.lineStrong} strokeWidth={2} />
              <rect x={g.tap[0] + 6} y={g.tap[1] + 26} width={12} height={14} rx={3} fill={C.panel} stroke={C.lineStrong} strokeWidth={2} />
              <line x1={g.tap[0] - 60} x2={g.tap[0] + 100} y1={g.basinY} y2={g.basinY} stroke={C.lineStrong} strokeWidth={2} />
              <path d={`M${g.tap[0] - 60} ${g.basinY} q 80 46 160 0`} fill="none" stroke={C.line} strokeWidth={2} />
              <rect x={g.tap[0] + 9} y={g.tap[1] + 40} width={6} height={(g.basinY - g.tap[1] - 40) * pOut} rx={3} fill={C.water} opacity={0.55 * pOut} />
              {Array.from({ length: 6 }, (_, i) => {
                const k = (frame * 0.06 + i / 6) % 1;
                return <circle key={i} cx={g.tap[0] + 12 + (rand(i, 21) - 0.5) * 30 * k} cy={g.basinY - 6 - Math.sin(k * Math.PI) * 26} r={2.6} fill={C.water} opacity={pOut * (1 - k)} />;
              })}
            </g>
          )}

          {/* Calcium */}
          {ions.map(({ pos, captured, alpha, i }) => pos && (
            <g key={i} opacity={alpha}>
              <circle cx={pos[0]} cy={pos[1]} r={captured ? 5.5 : 7} fill={C.chalk} />
              {!captured && <circle cx={pos[0]} cy={pos[1]} r={11} fill="none" stroke={C.chalk} strokeOpacity={0.25} />}
            </g>
          ))}
        </g>

        {/* Jauge de dureté (hors zoom) */}
        <g>
          {gg.vertical ? (
            <>
              <rect x={gg.x} y={gg.y} width={10} height={gg.len} rx={5} fill={C.panel} />
              <rect x={gg.x} y={gg.y + gg.len * (1 - gaugeT)} width={10} height={gg.len * gaugeT} rx={5} fill={th > 20 ? C.chalk : C.amber} />
              {[0, 10, 20, 30, 40, 50].map((v) => (
                <g key={v}>
                  <line x1={gg.x + 18} x2={gg.x + 30} y1={gg.y + gg.len * (1 - v / 50)} y2={gg.y + gg.len * (1 - v / 50)} stroke={C.line} strokeWidth={2} />
                  <text x={gg.x + 40} y={gg.y + gg.len * (1 - v / 50) + 6} fill={C.muted} fontFamily="Hanken" fontSize={17}>{v}</text>
                </g>
              ))}
              <text x={gg.x - 6} y={gg.y - 70} fill={C.text} fontFamily="Newsreader" fontSize={84} fontWeight={360} textAnchor="start">{th}<tspan fontSize={30} dx={6}>°f</tspan></text>
              <text x={gg.x - 4} y={gg.y - 34} fill={C.muted} fontFamily="Hanken" fontSize={18}>dureté (exemple)</text>
            </>
          ) : (
            <>
              <rect x={gg.x} y={gg.y} width={gg.len} height={10} rx={5} fill={C.panel} />
              <rect x={gg.x} y={gg.y} width={gg.len * gaugeT} height={10} rx={5} fill={th > 20 ? C.chalk : C.amber} />
              {[0, 10, 20, 30, 40, 50].map((v) => (
                <text key={v} x={gg.x + gg.len * (v / 50)} y={gg.y + 40} fill={C.muted} fontFamily="Hanken" fontSize={20} textAnchor="middle">{v}</text>
              ))}
              <text x={gg.x} y={gg.y - 26} fill={C.text} fontFamily="Newsreader" fontSize={64} fontWeight={360}>{th}<tspan fontSize={26} dx={6}>°f</tspan></text>
              <text x={gg.x + gg.len} y={gg.y - 26} fill={C.muted} fontFamily="Hanken" fontSize={20} textAnchor="end">dureté (exemple)</text>
            </>
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
