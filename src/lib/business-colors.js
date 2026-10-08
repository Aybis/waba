// BU identity colors are independent of row order, filters and current health.
const definitions = [
  ["TSO", "#288255", "#d8eee0"],
  ["DSO", "#6b50ad", "#e5dcf5"],
  ["ISO", "#277bb5", "#d7eafb"],
  ["UDSO", "#a15a23", "#f2dfca"],
  ["LSO", "#b34286", "#f3ddeb"],
  ["HSO", "#238c91", "#d3edec"],
  ["HO", "#657725", "#e4ebcd"],
  ["AWO", "#5057a5", "#dfe1f7"],
  ["ACC", "#9259a2", "#ecdff2"],
  ["FIF", "#846749", "#ecdfce"],
  ["Bank Saqu", "#42788c", "#d9e8ed"],
];
export function businessTheme(id, name = "") {
  let match = definitions.find(
    ([label]) => label.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    let hash = 0;
    for (const c of id || name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    match = definitions[hash % definitions.length];
  }
  return { accent: match[1], edge: match[1], dark: match[1], floor: match[2] };
}
