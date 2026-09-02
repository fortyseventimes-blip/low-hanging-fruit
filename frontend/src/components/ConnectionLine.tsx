import type { ConnectionVisualState } from "../lib/skill-connections";

interface ConnectionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  state: ConnectionVisualState;
  muted: boolean;
}

// design-brief-ui-elements.md §3: thin/low-contrast by default (barely
// visible until a node is selected, MSFS-style), thickens + glows with the
// source domain's color when active, solid steady glow once both ends have
// cleared cohort ("path already walked").
export function ConnectionLine({ x1, y1, x2, y2, color, state, muted }: ConnectionLineProps) {
  const strokeWidth = state === "active" ? 0.6 : state === "passed" ? 0.45 : 0.25;
  const stroke = state === "default" ? "#334155" : color;
  const opacity = muted ? 0.1 : state === "default" ? 0.4 : 1;
  const style = state !== "default" ? { filter: `drop-shadow(0 0 1.5px ${color})` } : undefined;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      opacity={opacity}
      style={style}
      className="transition-[opacity,stroke-width] duration-150 ease-out"
    />
  );
}
