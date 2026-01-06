import React from "react";

/**
 * @param {{ lines?: number }} props
 */
export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <div className="skeleton__title" />
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className="skeleton__line" />
      ))}
    </div>
  );
}
