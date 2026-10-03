import type { ComponentProps } from "react";
export function GlassInput({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return <input className={`glass-input ${className}`} {...props} />;
}
export function GlassTextarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea className={`glass-input ${className}`} {...props} />;
}
