import type { ComponentProps } from "react";
export function GlassSelect({
  className = "",
  ...props
}: ComponentProps<"select">) {
  return (
    <select className={`glass-input glass-select ${className}`} {...props} />
  );
}
