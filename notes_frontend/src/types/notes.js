/**
 * @typedef {Object} NoteOut
 * @property {number} id
 * @property {string} title
 * @property {string} content
 * @property {string} created_at ISO datetime
 * @property {string} updated_at ISO datetime
 */

/**
 * @typedef {Object} NoteCreate
 * @property {string} title
 * @property {string} content
 */

/**
 * @typedef {Object} NoteUpdate
 * @property {string | null | undefined} [title]
 * @property {string | null | undefined} [content]
 */

export {};
