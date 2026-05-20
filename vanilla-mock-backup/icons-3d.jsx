// 3D-stylized icons. Each draws a stack of layered SVG shapes with radial
// gradients to fake volumetric shading. All accept a `size` prop (px).
// Each also exports a small `Thumb` variant used in the layers/library panel.

const Icons3D = {};

// Reusable contact shadow ellipse — sits beneath the icon to anchor it.
function ContactShadow({ y = 78, w = 110, opacity = 0.55, color = '#000' }) {
  return <ellipse cx="0" cy={y} rx={w / 2} ry={w / 10} fill={color} opacity={opacity} filter="url(#blur-soft)" />;
}

// ─── HEART ────────────────────────────────────────────────────────────────
Icons3D.Heart = function Heart({ size = 320, tilt = true }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{
      transform: tilt ? 'perspective(800px) rotateX(-12deg) rotateY(18deg)' : 'none',
      transformStyle: 'preserve-3d',
    }}>
      <defs>
        <radialGradient id={`hf${id}`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffc1d7"/>
          <stop offset="0.35" stopColor="#ff6c9c"/>
          <stop offset="0.75" stopColor="#e8326b"/>
          <stop offset="1" stopColor="#8e1340"/>
        </radialGradient>
        <radialGradient id={`hl${id}`} cx="0.35" cy="0.28" r="0.35">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`hd${id}`} cx="0.5" cy="0.85" r="0.5">
          <stop offset="0" stopColor="#5a0a26" stopOpacity="0.55"/>
          <stop offset="1" stopColor="#5a0a26" stopOpacity="0"/>
        </radialGradient>
        <filter id="blur-soft"><feGaussianBlur stdDeviation="3.5"/></filter>
        <filter id={`gl${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ContactShadow y={70} w={150} opacity={0.45}/>
      {/* outer rim shadow */}
      <path d="M0 60 C -55 25 -80 -5 -80 -32 C -80 -58 -60 -76 -38 -76 C -18 -76 -4 -62 0 -50 C 4 -62 18 -76 38 -76 C 60 -76 80 -58 80 -32 C 80 -5 55 25 0 60 Z"
        fill="#5a0a26" transform="translate(2, 6)" opacity="0.6" filter="url(#blur-soft)"/>
      {/* base */}
      <path d="M0 60 C -55 25 -80 -5 -80 -32 C -80 -58 -60 -76 -38 -76 C -18 -76 -4 -62 0 -50 C 4 -62 18 -76 38 -76 C 60 -76 80 -58 80 -32 C 80 -5 55 25 0 60 Z"
        fill={`url(#hf${id})`}/>
      {/* dark undershade */}
      <path d="M0 60 C -55 25 -80 -5 -80 -32 C -80 -58 -60 -76 -38 -76 C -18 -76 -4 -62 0 -50 C 4 -62 18 -76 38 -76 C 60 -76 80 -58 80 -32 C 80 -5 55 25 0 60 Z"
        fill={`url(#hd${id})`}/>
      {/* top-left highlight blob */}
      <ellipse cx="-30" cy="-40" rx="28" ry="18" fill={`url(#hl${id})`} transform="rotate(-25 -30 -40)"/>
      {/* tiny specular */}
      <ellipse cx="-38" cy="-48" rx="6" ry="3" fill="#ffffff" opacity="0.9" transform="rotate(-25 -38 -48)"/>
    </svg>
  );
};

// ─── STAR ─────────────────────────────────────────────────────────────────
Icons3D.Star = function Star({ size = 320, tilt = true }) {
  const id = React.useId().replace(/:/g, '');
  // 5-point star points around origin, outer r=78 inner r=32
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 78 : 32;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    points.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
  }
  const d = points.join(' ');
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{
      transform: tilt ? 'perspective(800px) rotateX(-12deg) rotateY(18deg)' : 'none',
    }}>
      <defs>
        <radialGradient id={`sf${id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff4c1"/>
          <stop offset="0.45" stopColor="#ffcc4d"/>
          <stop offset="0.85" stopColor="#d97a14"/>
          <stop offset="1" stopColor="#7a3d04"/>
        </radialGradient>
        <radialGradient id={`sl${id}`} cx="0.4" cy="0.3" r="0.35">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.8"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
        <filter id="blur-soft2"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse cx="0" cy="72" rx="68" ry="9" fill="#000" opacity="0.4" filter="url(#blur-soft2)"/>
      <polygon points={d} fill="#7a3d04" transform="translate(2, 5)" opacity="0.5" filter="url(#blur-soft2)"/>
      <polygon points={d} fill={`url(#sf${id})`}/>
      {/* faux bevel lines from center to each outer point */}
      {[0,1,2,3,4].map(i => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        return <line key={i} x1="0" y1="0" x2={Math.cos(a)*78} y2={Math.sin(a)*78} stroke="#fff" strokeOpacity="0.18" strokeWidth="1"/>;
      })}
      <ellipse cx="-22" cy="-30" rx="22" ry="14" fill={`url(#sl${id})`} transform="rotate(-20 -22 -30)"/>
    </svg>
  );
};

// ─── BELL ─────────────────────────────────────────────────────────────────
Icons3D.Bell = function Bell({ size = 320, tilt = true }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{
      transform: tilt ? 'perspective(800px) rotateX(-12deg) rotateY(18deg)' : 'none',
    }}>
      <defs>
        <linearGradient id={`bf${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe7a4"/>
          <stop offset="0.5" stopColor="#f1ad36"/>
          <stop offset="1" stopColor="#8a560f"/>
        </linearGradient>
        <radialGradient id={`bl${id}`} cx="0.35" cy="0.25" r="0.4">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
        <filter id="blur-soft3"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse cx="0" cy="78" rx="70" ry="9" fill="#000" opacity="0.4" filter="url(#blur-soft3)"/>
      {/* bell body */}
      <path d="M -55 40 Q -55 -50 0 -65 Q 55 -50 55 40 L 60 50 L -60 50 Z" fill={`url(#bf${id})`}/>
      {/* base lip */}
      <rect x="-62" y="50" width="124" height="12" rx="3" fill="#7a4a0c"/>
      <rect x="-62" y="50" width="124" height="3" fill="#ffd884" opacity="0.6"/>
      {/* clapper hanger */}
      <rect x="-6" y="-75" width="12" height="14" rx="3" fill="#5a3309"/>
      {/* highlight blob */}
      <ellipse cx="-26" cy="-25" rx="18" ry="32" fill={`url(#bl${id})`}/>
      {/* dimmed underside */}
      <path d="M -55 40 Q -55 50 -45 55 L 45 55 Q 55 50 55 40 Z" fill="#000" opacity="0.22"/>
    </svg>
  );
};

// ─── CLOUD ────────────────────────────────────────────────────────────────
Icons3D.Cloud = function Cloud({ size = 320, tilt = true }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{
      transform: tilt ? 'perspective(800px) rotateX(-12deg) rotateY(18deg)' : 'none',
    }}>
      <defs>
        <radialGradient id={`cf${id}`} cx="0.4" cy="0.25" r="0.95">
          <stop offset="0" stopColor="#ffffff"/>
          <stop offset="0.6" stopColor="#e2ecff"/>
          <stop offset="1" stopColor="#8aa5d4"/>
        </radialGradient>
        <filter id="blur-soft4"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse cx="0" cy="60" rx="74" ry="9" fill="#000" opacity="0.35" filter="url(#blur-soft4)"/>
      <g fill={`url(#cf${id})`}>
        <circle cx="-42" cy="10" r="30"/>
        <circle cx="-10" cy="-20" r="38"/>
        <circle cx="30" cy="-8" r="34"/>
        <circle cx="48" cy="20" r="22"/>
        <rect x="-55" y="20" width="110" height="28" rx="14"/>
      </g>
      {/* highlights */}
      <ellipse cx="-15" cy="-32" rx="20" ry="9" fill="#ffffff" opacity="0.7"/>
      <ellipse cx="22" cy="-20" rx="14" ry="6" fill="#ffffff" opacity="0.5"/>
    </svg>
  );
};

// ─── GIFT ─────────────────────────────────────────────────────────────────
Icons3D.Gift = function Gift({ size = 320, tilt = true }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{
      transform: tilt ? 'perspective(800px) rotateX(-12deg) rotateY(18deg)' : 'none',
    }}>
      <defs>
        <linearGradient id={`gf${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#a48bff"/>
          <stop offset="1" stopColor="#4b32b5"/>
        </linearGradient>
        <linearGradient id={`gt${id}`} x1="0" x2="1" y1="0" y2="0.3">
          <stop offset="0" stopColor="#c8b5ff"/>
          <stop offset="1" stopColor="#6e4fdb"/>
        </linearGradient>
        <linearGradient id={`gr${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff8fc5"/>
          <stop offset="1" stopColor="#c8266f"/>
        </linearGradient>
        <filter id="blur-soft5"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <ellipse cx="0" cy="76" rx="70" ry="9" fill="#000" opacity="0.45" filter="url(#blur-soft5)"/>
      {/* box body */}
      <path d="M -60 -10 L 60 -10 L 60 65 L -60 65 Z" fill={`url(#gf${id})`}/>
      {/* lid */}
      <path d="M -68 -28 L 68 -28 L 68 -8 L -68 -8 Z" fill={`url(#gt${id})`}/>
      {/* ribbon vertical */}
      <rect x="-10" y="-28" width="20" height="93" fill={`url(#gr${id})`}/>
      {/* bow */}
      <path d="M 0 -28 C -25 -52 -45 -42 -38 -28 Z" fill={`url(#gr${id})`}/>
      <path d="M 0 -28 C 25 -52 45 -42 38 -28 Z" fill={`url(#gr${id})`}/>
      <circle cx="0" cy="-28" r="5" fill="#ff5b9a"/>
      {/* top highlight */}
      <rect x="-68" y="-28" width="136" height="6" fill="#ffffff" opacity="0.3"/>
    </svg>
  );
};

window.Icons3D = Icons3D;
