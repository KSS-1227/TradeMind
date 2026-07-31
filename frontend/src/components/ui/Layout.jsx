import React from "react";

/**
 * Container — Max-width responsive container wrapper
 */
export function Container({
  children,
  maxWidth = "1280px",
  padding = "0 var(--space-6)",
  className = "",
  style = {},
  ...props
}) {
  return (
    <div
      className={`layout-container ${className}`.trim()}
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        padding,
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Grid — Flexible CSS Grid container
 */
export function Grid({
  children,
  cols = 12,
  gap = "var(--space-4)",
  responsiveCols = {}, // e.g. { sm: 1, md: 2, lg: 3 }
  className = "",
  style = {},
  ...props
}) {
  const getGridTemplateColumns = () => {
    if (typeof cols === "number") {
      return `repeat(${cols}, minmax(0, 1fr))`;
    }
    return cols; // Custom string like "250px 1fr"
  };

  return (
    <div
      className={`layout-grid ${className}`.trim()}
      style={{
        display: "grid",
        gridTemplateColumns: getGridTemplateColumns(),
        gap,
        width: "100%",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Flex — Flexbox layout primitive
 */
export function Flex({
  children,
  direction = "row",
  align = "center",
  justify = "flex-start",
  gap = "var(--space-4)",
  wrap = "nowrap",
  fullWidth = true,
  className = "",
  style = {},
  ...props
}) {
  return (
    <div
      className={`layout-flex ${className}`.trim()}
      style={{
        display: "flex",
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap,
        flexWrap: wrap,
        width: fullWidth ? "100%" : "auto",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stack — Vertical or Horizontal stack primitive
 */
export function Stack({
  children,
  direction = "column",
  gap = "var(--space-4)",
  align = "stretch",
  justify = "flex-start",
  className = "",
  style = {},
  ...props
}) {
  return (
    <Flex
      direction={direction}
      align={align}
      justify={justify}
      gap={gap}
      className={`layout-stack ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </Flex>
  );
}

/**
 * Spacer — Expressive whitespace spacing element
 */
export function Spacer({
  size = "var(--space-4)",
  axis = "vertical", // vertical | horizontal
  style = {},
  ...props
}) {
  const isVertical = axis === "vertical";
  const spacingValue = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className="layout-spacer"
      style={{
        width: isVertical ? "100%" : spacingValue,
        height: isVertical ? spacingValue : "100%",
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}

export default {
  Container,
  Grid,
  Flex,
  Stack,
  Spacer,
};
