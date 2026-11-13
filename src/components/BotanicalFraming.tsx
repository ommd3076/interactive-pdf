import React from "react";

export function BotanicalLeftBranch({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 420"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M-10 40 C42 78, 72 132, 64 210 C56 278, 22 336, -12 390"
        stroke="#27402D"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M46 112 C94 98, 138 110, 174 134"
        stroke="#335038"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.68"
      />
      <path
        d="M62 192 C108 182, 154 198, 198 228"
        stroke="#2D4933"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.64"
      />
      <path
        d="M48 274 C92 270, 128 286, 158 316"
        stroke="#38573C"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Painterly organic leaf clusters */}
      {[
        { cx: 52, cy: 74, rx: 24, ry: 12, rot: -32, fill: "#28442E", op: 0.85 },
        { cx: 88, cy: 84, rx: 22, ry: 11, rot: 14, fill: "#3B5B3F", op: 0.82 },
        { cx: 124, cy: 102, rx: 26, ry: 12, rot: -12, fill: "#2E4D34", op: 0.86 },
        { cx: 160, cy: 124, rx: 24, ry: 11, rot: 22, fill: "#4B6B4B", op: 0.78 },
        { cx: 184, cy: 144, rx: 19, ry: 9, rot: 34, fill: "#62805F", op: 0.72 },
        { cx: 34, cy: 138, rx: 25, ry: 12, rot: 28, fill: "#1F3926", op: 0.88 },
        { cx: 78, cy: 146, rx: 23, ry: 11, rot: -24, fill: "#3D5D40", op: 0.84 },
        { cx: 106, cy: 174, rx: 25, ry: 12, rot: 8, fill: "#2C4B33", op: 0.85 },
        { cx: 148, cy: 192, rx: 26, ry: 12, rot: -16, fill: "#4E6D4E", op: 0.8 },
        { cx: 186, cy: 218, rx: 21, ry: 10, rot: 20, fill: "#6B8967", op: 0.74 },
        { cx: 28, cy: 216, rx: 27, ry: 13, rot: -18, fill: "#25402B", op: 0.86 },
        { cx: 68, cy: 234, rx: 22, ry: 11, rot: 24, fill: "#3E5D41", op: 0.82 },
        { cx: 102, cy: 264, rx: 24, ry: 11, rot: -14, fill: "#2F4E35", op: 0.84 },
        { cx: 140, cy: 294, rx: 21, ry: 10, rot: 28, fill: "#537252", op: 0.76 },
        { cx: 42, cy: 312, rx: 26, ry: 12, rot: 16, fill: "#233D29", op: 0.86 },
        { cx: 74, cy: 342, rx: 22, ry: 10, rot: -20, fill: "#416143", op: 0.78 },
      ].map((leaf, idx) => (
        <ellipse
          key={idx}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={leaf.fill}
          opacity={leaf.op}
          transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
      {/* Subtle sunlit blossom highlights matching reference */}
      {[
        { cx: 96, cy: 116, r: 5 },
        { cx: 142, cy: 166, r: 6 },
        { cx: 76, cy: 214, r: 4.5 },
        { cx: 118, cy: 284, r: 5 },
      ].map((dot, idx) => (
        <circle key={`bl_${idx}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill="#EAF1EB" opacity="0.72" />
      ))}
    </svg>
  );
}

export function BotanicalRightBranch({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 420"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M250 70 C200 102, 168 156, 178 230 C188 298, 214 352, 248 396"
        stroke="#27402D"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path
        d="M196 138 C148 126, 108 136, 70 162"
        stroke="#35533A"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.66"
      />
      <path
        d="M180 218 C134 210, 92 224, 52 254"
        stroke="#2D4933"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.64"
      />
      <path
        d="M194 294 C150 288, 114 302, 84 334"
        stroke="#416044"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.58"
      />
      {[
        { cx: 190, cy: 96, rx: 24, ry: 12, rot: 26, fill: "#28442E", op: 0.85 },
        { cx: 152, cy: 110, rx: 22, ry: 11, rot: -18, fill: "#3B5B3F", op: 0.82 },
        { cx: 114, cy: 130, rx: 25, ry: 12, rot: 12, fill: "#2E4D34", op: 0.86 },
        { cx: 80, cy: 150, rx: 23, ry: 11, rot: -26, fill: "#4E6D4E", op: 0.78 },
        { cx: 204, cy: 162, rx: 26, ry: 12, rot: -24, fill: "#1F3926", op: 0.88 },
        { cx: 164, cy: 176, rx: 22, ry: 11, rot: 22, fill: "#3D5D40", op: 0.84 },
        { cx: 128, cy: 202, rx: 24, ry: 12, rot: -8, fill: "#2C4B33", op: 0.85 },
        { cx: 90, cy: 222, rx: 25, ry: 12, rot: 16, fill: "#4B6B4B", op: 0.8 },
        { cx: 56, cy: 246, rx: 20, ry: 9, rot: -28, fill: "#62805F", op: 0.74 },
        { cx: 210, cy: 246, rx: 26, ry: 12, rot: 18, fill: "#25402B", op: 0.86 },
        { cx: 170, cy: 262, rx: 22, ry: 11, rot: -20, fill: "#3E5D41", op: 0.82 },
        { cx: 136, cy: 290, rx: 23, ry: 11, rot: 14, fill: "#2F4E35", op: 0.84 },
        { cx: 100, cy: 318, rx: 20, ry: 10, rot: -26, fill: "#537252", op: 0.76 },
        { cx: 198, cy: 334, rx: 24, ry: 12, rot: -16, fill: "#233D29", op: 0.84 },
      ].map((leaf, idx) => (
        <ellipse
          key={idx}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          fill={leaf.fill}
          opacity={leaf.op}
          transform={`rotate(${leaf.rot} ${leaf.cx} ${leaf.cy})`}
        />
      ))}
      {[
        { cx: 146, cy: 142, r: 5 },
        { cx: 98, cy: 196, r: 5.5 },
        { cx: 162, cy: 238, r: 4.5 },
      ].map((dot, idx) => (
        <circle key={`br_${idx}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill="#EAF1EB" opacity="0.72" />
      ))}
    </svg>
  );
}

export function BotanicalSectionEmblem({
  variant = "sprig",
}: {
  variant?: "sprig" | "compass" | "bee";
}) {
  if (variant === "bee") {
    return (
      <svg width="46" height="36" viewBox="0 0 46 36" fill="none" aria-hidden="true">
        <ellipse cx="16" cy="12" rx="8" ry="4.5" transform="rotate(-24 16 12)" fill="#E7ECE6" stroke="#78716C" strokeWidth="1" />
        <ellipse cx="30" cy="12" rx="8" ry="4.5" transform="rotate(24 30 12)" fill="#E7ECE6" stroke="#78716C" strokeWidth="1" />
        <ellipse cx="23" cy="21" rx="5.5" ry="9" fill="#D4A64A" stroke="#1C1917" strokeWidth="1.2" />
        <path d="M18 19 H28 M18 23 H28 M19 26 H27" stroke="#1C1917" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="23" cy="11" r="3" fill="#1C1917" />
        <path d="M21 9 L19 6 M25 9 L27 6" stroke="#1C1917" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "compass") {
    return (
      <svg width="42" height="36" viewBox="0 0 42 36" fill="none" aria-hidden="true">
        <circle cx="21" cy="18" r="12" stroke="#92400E" strokeWidth="1.2" opacity="0.65" />
        <path d="M21 6 V30 M9 18 H33" stroke="#78716C" strokeWidth="1" opacity="0.5" />
        <polygon points="21,9 24,18 21,27 18,18" fill="#3F4E34" opacity="0.85" />
      </svg>
    );
  }
  return (
    <svg width="46" height="34" viewBox="0 0 46 34" fill="none" aria-hidden="true">
      <path d="M10 26 C18 20, 26 14, 36 8" stroke="#3F4E34" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="18" cy="18" rx="6" ry="3" transform="rotate(-36 18 18)" fill="#3F4E34" opacity="0.78" />
      <ellipse cx="25" cy="19" rx="6" ry="2.8" transform="rotate(14 25 19)" fill="#1E3A2B" opacity="0.74" />
      <ellipse cx="28" cy="11" rx="5.5" ry="2.6" transform="rotate(-30 28 11)" fill="#4E6D4E" opacity="0.75" />
      <circle cx="36" cy="8" r="2.2" fill="#C2410C" opacity="0.8" />
    </svg>
  );
}
