import type { SVGProps } from "react";

const paths = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5ZM12 15v2",
  unlock: "M7 11V7a5 5 0 0 1 9-3M5 11h14v10H5ZM12 15v2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  arrow: "M4 12h15M13 6l6 6-6 6",
  external: "M14 3h7v7M21 3l-9 9M10 5H3v16h16v-7",
  warning: "M12 8v5M12 16h.01M12 3 2 21h20L12 3Z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  check: "m5 12 4 4L19 6",
  book: "M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3V4ZM21 4h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5V4Z",
  search: "M15 15l6 6M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4ZM8 12l3 3 5-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
} as const;

export default function AuthIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
