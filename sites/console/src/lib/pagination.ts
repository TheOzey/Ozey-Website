/**
 * Opaque pagination cursor issued by the server. The browser stores and
 * returns it but never interprets it.
 */
export type PageCursor = string & { readonly __pageCursor: true };

export interface Page<T> {
  items: T[];
  next: PageCursor | null;
}
