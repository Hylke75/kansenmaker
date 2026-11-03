/** Naam van wie iets inbracht: een accountnaam, of een gastnaam met ‘(gast)’. */
export function authorName(item: { authorId: string; guestName?: string }, userName: (id: string) => string) {
  return item.guestName ? `${item.guestName} (gast)` : userName(item.authorId);
}
