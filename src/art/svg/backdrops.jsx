// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG chapter backdrops. Same
// allowance/rationale as src/art/svg/pieces.jsx. Flat, unobtrusive
// two-tone compositions since these sit behind gameplay; one static
// composition per chapter (the manifest's far/near pose pair isn't drawn
// as separate parallax layers yet).

function Backdrop({ top, bottom, children }) {
  return (
    <svg
      viewBox="0 0 200 100"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <rect width="200" height="100" fill={top} />
      <rect y="70" width="200" height="30" fill={bottom} />
      {children}
    </svg>
  );
}

// Chapter 1: The Commute -- transit lines, a platform edge.
export function BackdropChapter1() {
  return (
    <Backdrop top="#e8dcc0" bottom="#c9bc94">
      {[10, 40, 70, 100, 130, 160, 190].map((x) => (
        <line
          key={x}
          x1={x}
          y1="0"
          x2={x - 20}
          y2="70"
          stroke="#8a7a52"
          strokeWidth="1"
          opacity="0.35"
        />
      ))}
      <rect y="66" width="200" height="4" fill="#8a7a52" opacity="0.6" />
    </Backdrop>
  );
}

// Chapter 2: The Square -- an arch and a lamppost silhouette.
export function BackdropChapter2() {
  return (
    <Backdrop top="#efe6d2" bottom="#cdbf99">
      <path
        d="M20 70 V40 Q40 20 60 40 V70"
        fill="none"
        stroke="#8a7a52"
        strokeWidth="3"
        opacity="0.5"
      />
      <line
        x1="150"
        y1="70"
        x2="150"
        y2="28"
        stroke="#4a3320"
        strokeWidth="2"
        opacity="0.6"
      />
      <circle cx="150" cy="24" r="5" fill="#c9a227" opacity="0.6" />
    </Backdrop>
  );
}

// Chapter 3: The Tower -- a tall silhouette, a lit window.
export function BackdropChapter3() {
  return (
    <Backdrop top="#20242e" bottom="#141720">
      <rect x="150" y="0" width="30" height="70" fill="#1b1712" opacity="0.8" />
      <rect x="160" y="20" width="6" height="8" fill="#f1d976" opacity="0.7" />
      <rect x="160" y="36" width="6" height="8" fill="#f1d976" opacity="0.4" />
    </Backdrop>
  );
}

export const BACKDROP_SHEETS = {
  backdrop_chapter_1: BackdropChapter1,
  backdrop_chapter_2: BackdropChapter2,
  backdrop_chapter_3: BackdropChapter3,
};
