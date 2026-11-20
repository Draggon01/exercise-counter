/** Lower case without accents ("Übung" → "ubung"), so searching ignores both. */
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Does the name match the search? Case and accents are ignored; every word of the search must appear
 * somewhere in the name ("push up" finds "Push-ups"). An empty search matches everything.
 */
export function matchesSearch(name: string, search: string): boolean {
    const words = normalize(search).split(/\s+/).filter(Boolean);
    const target = normalize(name);
    return words.every(word => target.includes(word));
}
