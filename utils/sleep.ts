/**
 * Simple promise-based sleep utility.
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
