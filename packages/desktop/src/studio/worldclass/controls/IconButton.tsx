import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tone?: "default" | "ghost" | "primary" | "live";
};

export function IconButton({
  label,
  children,
  tone = "ghost",
  className = "",
  ...rest
}: IconButtonProps) {
  const toneClass =
    tone === "primary"
      ? "gwc-btn-primary"
      : tone === "live"
        ? "gwc-btn-live"
        : tone === "ghost"
          ? "gwc-btn-ghost"
          : "";
  return (
    <button
      type="button"
      className={`gwc-btn gwc-btn-icon ${toneClass} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}
