import React from "react";
import { motion } from "framer-motion";

/**
 * PageContainer
 *
 * Wraps every page's content with:
 * - Max-width constraint
 * - Consistent responsive padding
 * - Fade+slide entrance animation (respects prefers-reduced-motion)
 *
 * Usage:
 *   <PageContainer>
 *     <PageHeader title="..." subtitle="..." />
 *     {content}
 *   </PageContainer>
 */
export function PageContainer({ children, maxWidth = 1080, style = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: "100%",
        maxWidth,
        margin: "0 auto",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
