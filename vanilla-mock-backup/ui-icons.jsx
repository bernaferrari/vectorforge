// UI icons — small line icons used in the chrome. Each is a stateless SVG.
// All accept (size, color, strokeWidth) and render to currentColor by default.

const Ui = {};

const svg = (size = 16, body, vb = 24, strokeWidth = 1.6) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill="none"
    stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {body}
  </svg>
);

Ui.Cursor = (p) => svg(p.size, <><path d="M5 3l5.8 14 2.3-5.6L18.6 9z"/></>);
Ui.Move = (p) => svg(p.size, <><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></>);
Ui.Rotate = (p) => svg(p.size, <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>);
Ui.Scale = (p) => svg(p.size, <><rect x="4" y="4" width="11" height="11" rx="1.5"/><path d="M14 14l6 6M16 20h4v-4"/></>);
Ui.Key = (p) => svg(p.size, <><circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M18 12v3M21 12v3"/></>);
Ui.Swap = (p) => svg(p.size, <><path d="M3 8h13l-3-3M21 16H8l3 3"/></>);
Ui.Camera = (p) => svg(p.size, <><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></>);
Ui.Sparkle = (p) => svg(p.size, <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></>);
Ui.Gear = (p) => svg(p.size, <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
Ui.Layers = (p) => svg(p.size, <><path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5M2 18l10 5 10-5"/></>);
Ui.Grid = (p) => svg(p.size, <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);

Ui.Eye = (p) => svg(p.size, <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
Ui.EyeOff = (p) => svg(p.size, <><path d="M3 3l18 18"/><path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4M6.1 7.5A17.4 17.4 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>);
Ui.Lock = (p) => svg(p.size, <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>);
Ui.LockOpen = (p) => svg(p.size, <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.7-1.5"/></>);

Ui.Play = (p) => svg(p.size, <><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none"/></>);
Ui.Pause = (p) => svg(p.size, <><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" rx="1"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" rx="1"/></>);
Ui.Stepback = (p) => svg(p.size, <><path d="M6 4v16M20 4L8 12l12 8z" fill="currentColor" stroke="none"/></>, 24, 0);
Ui.Stepfwd = (p) => svg(p.size, <><path d="M18 4v16M4 4l12 8-12 8z" fill="currentColor" stroke="none"/></>, 24, 0);
Ui.Loop = (p) => svg(p.size, <><path d="M17 3l3 3-3 3"/><path d="M3 11V9a3 3 0 0 1 3-3h14M7 21l-3-3 3-3"/><path d="M21 13v2a3 3 0 0 1-3 3H4"/></>);

Ui.Plus = (p) => svg(p.size, <><path d="M12 5v14M5 12h14"/></>);
Ui.Caret = (p) => svg(p.size, <><path d="M6 9l6 6 6-6"/></>);
Ui.CaretRight = (p) => svg(p.size, <><path d="M9 6l6 6-6 6"/></>);
Ui.Check = (p) => svg(p.size, <><path d="M5 12l4 4 10-10"/></>);
Ui.X = (p) => svg(p.size, <><path d="M6 6l12 12M6 18L18 6"/></>);
Ui.Search = (p) => svg(p.size, <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>);
Ui.Diamond = (p) => svg(p.size, <><path d="M12 3l8 9-8 9-8-9z" fill="currentColor" stroke="none"/></>);
Ui.Dot = (p) => svg(p.size, <><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></>);
Ui.Folder = (p) => svg(p.size, <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>);
Ui.Image = (p) => svg(p.size, <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 17l5-5 5 5 3-3 5 5"/></>);
Ui.Box = (p) => svg(p.size, <><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>);
Ui.Wand = (p) => svg(p.size, <><path d="M15 4l5 5L9 20l-5 1 1-5z"/><path d="M14 5l5 5"/></>);
Ui.Download = (p) => svg(p.size, <><path d="M12 3v13M6 11l6 6 6-6M4 21h16"/></>);
Ui.Share = (p) => svg(p.size, <><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/></>);
Ui.Save = (p) => svg(p.size, <><path d="M5 3h11l3 3v15a0 0 0 0 1 0 0H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>);

// Trigger icons — used in the Inspector "Trigger" picker.
Ui.Tap = (p) => svg(p.size, <><path d="M9 11V5a2 2 0 1 1 4 0v8"/><path d="M9 11V8a1.5 1.5 0 0 0-3 0v6c0 4 3 7 7 7s7-3 7-7v-3a1.5 1.5 0 0 0-3 0M13 11V7a1.5 1.5 0 0 0-3 0"/></>);
Ui.Hover = (p) => svg(p.size, <><path d="M5 5l5.8 14 2.3-5.6L18.6 9z"/><path d="M14 14l4 4-1.5 1.5L13 16z"/></>);
Ui.Mount = (p) => svg(p.size, <><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>);
Ui.Scroll = (p) => svg(p.size, <><rect x="8" y="3" width="8" height="18" rx="4"/><path d="M12 7v4"/></>);
Ui.Success = (p) => svg(p.size, <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>);
Ui.LoopT = (p) => svg(p.size, <><path d="M17 4l3 3-3 3"/><path d="M4 11V9a2 2 0 0 1 2-2h14"/><path d="M7 20l-3-3 3-3M20 13v2a2 2 0 0 1-2 2H4"/></>);

// Motion preset glyphs — for the preset chip dock.
Ui.PSpin = (p) => svg(p.size, <><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M21 4v5h-5"/></>);
Ui.PPop = (p) => svg(p.size, <><circle cx="12" cy="12" r="4"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M6 18l1.5-1.5"/></>);
Ui.PBounce = (p) => svg(p.size, <><path d="M3 17q3-9 9-9t9 9"/><path d="M3 17h18" strokeDasharray="2 3" opacity="0.5"/></>);
Ui.PWiggle = (p) => svg(p.size, <><path d="M3 12c2 0 2-4 4-4s2 8 4 8 2-8 4-8 2 4 4 4"/></>);
Ui.PDrift = (p) => svg(p.size, <><path d="M4 12h13M13 7l5 5-5 5"/></>);
Ui.PPulse = (p) => svg(p.size, <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity="0.5"/><circle cx="12" cy="12" r="10" opacity="0.25"/></>);
Ui.PWipe = (p) => svg(p.size, <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14" strokeDasharray="0"/><rect x="3" y="5" width="9" height="14" rx="2" fill="currentColor" stroke="none" opacity="0.3"/></>);
Ui.PDissolve = (p) => svg(p.size, <><circle cx="7" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="6" r="1" fill="currentColor" stroke="none" opacity="0.7"/><circle cx="17" cy="11" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" opacity="0.6"/><circle cx="15" cy="17" r="1.3" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="0.9" fill="currentColor" stroke="none" opacity="0.5"/></>);
Ui.PMorph = (p) => svg(p.size, <><circle cx="9" cy="12" r="5"/><rect x="10" y="7" width="10" height="10" rx="1.5" opacity="0.55"/></>);

// Tiny axis chips for transform.
Ui.AxisX = (p) => <span style={{color: 'var(--red)', fontWeight: 600, fontSize: 11, fontFamily: 'JetBrains Mono'}}>X</span>;
Ui.AxisY = (p) => <span style={{color: 'var(--green)', fontWeight: 600, fontSize: 11, fontFamily: 'JetBrains Mono'}}>Y</span>;
Ui.AxisZ = (p) => <span style={{color: 'var(--blue)', fontWeight: 600, fontSize: 11, fontFamily: 'JetBrains Mono'}}>Z</span>;

window.Ui = Ui;
