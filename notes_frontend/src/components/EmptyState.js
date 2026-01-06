import React from "react";

/**
 * @param {{ onCreate: () => void }} props
 */
export function EmptyState({ onCreate }) {
  return (
    <div className="empty">
      <h2 className="empty__title">No notes yet</h2>
      <p className="empty__desc">
        Create your first note to start capturing ideas.
      </p>
      <button className="btn btn-primary" onClick={onCreate}>
        New note
      </button>
    </div>
  );
}
