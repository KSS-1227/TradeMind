import React from "react";

export function Typography({
  children,
  variant = "body", // display | h1 | h2 | h3 | body-lg | body | small | caption | mono
  as,
  color,
  className = "",
  style = {},
  mono = false,
  ...props
}) {
  const getTag = () => {
    if (as) return as;
    switch (variant) {
      case "display":
        return "h1";
      case "h1":
        return "h1";
      case "h2":
        return "h2";
      case "h3":
        return "h3";
      case "caption":
        return "span";
      case "small":
        return "span";
      case "mono":
        return "span";
      case "body-lg":
      case "body":
      default:
        return "p";
    }
  };

  const Component = getTag();
  const variantClass = `typo-${variant}`;
  const monoClass = mono ? "typo-mono" : "";

  return (
    <Component
      className={`${variantClass} ${monoClass} ${className}`.trim()}
      style={{
        ...(color ? { color } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Typography;
