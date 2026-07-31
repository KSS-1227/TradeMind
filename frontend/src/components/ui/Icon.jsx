import React from "react";
import * as LucideIcons from "lucide-react";

export const ICON_SIZES = {
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  32: 32,
};

export function Icon({
  name,
  icon: IconComponent,
  size = 20,
  color,
  className = "",
  style = {},
  ...props
}) {
  const TargetIcon = IconComponent || (name ? LucideIcons[name] : null);

  if (!TargetIcon) {
    console.warn(`[Icon] Icon "${name}" not found in Lucide React.`);
    return null;
  }

  const iconSize = ICON_SIZES[size] || size;

  return (
    <TargetIcon
      size={iconSize}
      color={color}
      className={`ui-icon ${className}`.trim()}
      style={{
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}

export default Icon;
