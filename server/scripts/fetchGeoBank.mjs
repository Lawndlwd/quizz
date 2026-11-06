// Builds server/assets/geo-bank.json: map questions with coordinates from Wikidata (CC0).
// Run with: node server/scripts/fetchGeoBank.mjs
// Question wording and landmark choice are hand-written below, so review new entries by hand.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const OUT = path.join(import.meta.dirname, '..', 'assets', 'geo-bank.json');

// Sovereign states whose capital is disputed: a party quiz shouldn't take a side.
const SKIP_COUNTRIES = new Set(['Q801', 'Q219060', 'Q1246', 'Q865']);

// Wikidata lacks an English or French label for these, so the main query misses them.
const NAMED_BY_HAND = {
  Q20: ['Oslo', 'Oslo', 'Norway', 'Norvège'],
  Q781: ["St. John's", 'Saint John', 'Antigua and Barbuda', 'Antigua-et-Barbuda'],
};

// Official-sounding Wikidata labels, shortened to what people say.
const COUNTRY_NAMES = {
  Q756617: ['Denmark', 'Danemark'],
  Q29999: ['Netherlands', 'Pays-Bas'],
  Q148: ['China', 'Chine'],
  Q702: ['Micronesia', 'Micronésie'],
  Q778: ['Bahamas', 'Bahamas'],
  Q1005: ['Gambia', 'Gambie'],
};

// [English Wikipedia title, English phrase, French phrase, difficulty, category]
const NATURE = 'Natural wonders';
const PLACES = 'Landmarks';
const LANDMARKS = [
  ['Eiffel Tower', 'the Eiffel Tower', 'la tour Eiffel', 'easy', PLACES],
  ['Statue of Liberty', 'the Statue of Liberty', 'la statue de la Liberté', 'easy', PLACES],
  ['Colosseum', 'the Colosseum', 'le Colisée', 'easy', PLACES],
  ['Taj Mahal', 'the Taj Mahal', 'le Taj Mahal', 'easy', PLACES],
  ['Great Pyramid of Giza', 'the Great Pyramid of Giza', 'la pyramide de Khéops', 'easy', PLACES],
  ['Big Ben', 'Big Ben', 'Big Ben', 'easy', PLACES],
  ['Sydney Opera House', 'the Sydney Opera House', "l'opéra de Sydney", 'easy', PLACES],
  ['Machu Picchu', 'Machu Picchu', 'le Machu Picchu', 'easy', PLACES],
  ['Christ the Redeemer (statue)', 'Christ the Redeemer', 'le Christ Rédempteur', 'easy', PLACES],
  ['Golden Gate Bridge', 'the Golden Gate Bridge', 'le Golden Gate', 'easy', PLACES],
  ['Burj Khalifa', 'the Burj Khalifa', 'la Burj Khalifa', 'easy', PLACES],
  ['Stonehenge', 'Stonehenge', 'Stonehenge', 'easy', PLACES],
  ['Leaning Tower of Pisa', 'the Leaning Tower of Pisa', 'la tour de Pise', 'easy', PLACES],
  ['Acropolis of Athens', 'the Acropolis of Athens', "l'Acropole d'Athènes", 'easy', PLACES],
  ['Sagrada Família', 'the Sagrada Família', 'la Sagrada Família', 'easy', PLACES],
  ['Times Square', 'Times Square', 'Times Square', 'easy', PLACES],
  ['White House', 'the White House', 'la Maison-Blanche', 'easy', PLACES],
  ['Louvre', 'the Louvre', 'le Louvre', 'easy', PLACES],
  ['Petra', 'Petra', 'Pétra', 'easy', PLACES],
  ['Angkor Wat', 'Angkor Wat', 'Angkor Vat', 'easy', PLACES],
  ['Forbidden City', 'the Forbidden City', 'la Cité interdite', 'easy', PLACES],
  ['Mont-Saint-Michel', 'Mont-Saint-Michel', 'le Mont-Saint-Michel', 'easy', PLACES],
  ['Hagia Sophia', 'the Hagia Sophia', 'Sainte-Sophie', 'easy', PLACES],
  ['Buckingham Palace', 'Buckingham Palace', 'le palais de Buckingham', 'easy', PLACES],
  ['Brandenburg Gate', 'the Brandenburg Gate', 'la porte de Brandebourg', 'easy', PLACES],
  ['Mount Fuji', 'Mount Fuji', 'le mont Fuji', 'easy', NATURE],
  ['Mount Everest', 'Mount Everest', "l'Everest", 'easy', NATURE],
  ['Niagara Falls', 'Niagara Falls', 'les chutes du Niagara', 'easy', NATURE],
  ['Grand Canyon', 'the Grand Canyon', 'le Grand Canyon', 'easy', NATURE],
  ['Chichen Itza', 'Chichen Itza', 'Chichén Itzá', 'medium', PLACES],
  ['Neuschwanstein Castle', 'Neuschwanstein Castle', 'le château de Neuschwanstein', 'medium', PLACES],
  ['Alhambra', 'the Alhambra', "l'Alhambra", 'medium', PLACES],
  ['Palace of Versailles', 'the Palace of Versailles', 'le château de Versailles', 'medium', PLACES],
  ['Tower Bridge', 'Tower Bridge', 'le Tower Bridge', 'medium', PLACES],
  ['Empire State Building', 'the Empire State Building', "l'Empire State Building", 'medium', PLACES],
  ["Saint Basil's Cathedral", "Saint Basil's Cathedral", 'la cathédrale Saint-Basile', 'medium', PLACES],
  ["St. Peter's Basilica", "St. Peter's Basilica", 'la basilique Saint-Pierre', 'medium', PLACES],
  ['Cologne Cathedral', 'Cologne Cathedral', 'la cathédrale de Cologne', 'medium', PLACES],
  ['Notre-Dame de Paris', 'Notre-Dame de Paris', 'Notre-Dame de Paris', 'medium', PLACES],
  ['Blue Mosque, Istanbul', 'the Blue Mosque', 'la Mosquée bleue', 'medium', PLACES],
  ['Terracotta Army', 'the Terracotta Army', "l'armée de terre cuite", 'medium', PLACES],
  ['Potala Palace', 'the Potala Palace', 'le palais du Potala', 'medium', PLACES],
  ['Borobudur', 'Borobudur', 'Borobudur', 'medium', PLACES],
  ['Bagan', 'Bagan', 'Bagan', 'medium', PLACES],
  ['Pompeii', 'Pompeii', 'Pompéi', 'medium', PLACES],
  ['Tower of London', 'the Tower of London', 'la tour de Londres', 'medium', PLACES],
  ['Edinburgh Castle', 'Edinburgh Castle', "le château d'Édimbourg", 'medium', PLACES],
  ['CN Tower', 'the CN Tower', 'la tour CN', 'medium', PLACES],
  ['Tokyo Tower', 'Tokyo Tower', 'la tour de Tokyo', 'medium', PLACES],
  ['Petronas Towers', 'the Petronas Towers', 'les tours Petronas', 'medium', PLACES],
  ['Marina Bay Sands', 'Marina Bay Sands', 'le Marina Bay Sands', 'medium', PLACES],
  ['Mount Rushmore', 'Mount Rushmore', 'le mont Rushmore', 'medium', PLACES],
  ['Hollywood Sign', 'the Hollywood Sign', "l'enseigne Hollywood", 'medium', PLACES],
  ['Space Needle', 'the Space Needle', 'la Space Needle', 'medium', PLACES],
  ['Hoover Dam', 'the Hoover Dam', 'le barrage Hoover', 'medium', PLACES],
  ['Burj Al Arab', 'the Burj Al Arab', 'le Burj Al Arab', 'medium', PLACES],
  ['Arc de Triomphe', 'the Arc de Triomphe', "l'Arc de triomphe", 'medium', PLACES],
  ['Pantheon, Rome', 'the Pantheon in Rome', 'le Panthéon de Rome', 'medium', PLACES],
  ['Golden Temple', 'the Golden Temple', "le Temple d'or", 'medium', PLACES],
  ['Red Fort', 'the Red Fort', 'le Fort rouge', 'medium', PLACES],
  ['Mount Kilimanjaro', 'Mount Kilimanjaro', 'le Kilimandjaro', 'medium', NATURE],
  ['Victoria Falls', 'Victoria Falls', 'les chutes Victoria', 'medium', NATURE],
  ['Iguazu Falls', 'Iguazu Falls', "les chutes d'Iguazú", 'medium', NATURE],
  ['Uluru', 'Uluru', 'Uluru', 'medium', NATURE],
  ['Matterhorn', 'the Matterhorn', 'le Cervin', 'medium', NATURE],
  ['Mount Vesuvius', 'Mount Vesuvius', 'le Vésuve', 'medium', NATURE],
  ['Mont Blanc', 'Mont Blanc', 'le mont Blanc', 'medium', NATURE],
  ['Table Mountain', 'Table Mountain', 'la montagne de la Table', 'medium', NATURE],
  ['Easter Island', 'Easter Island', "l'île de Pâques", 'medium', NATURE],
  ['Galápagos Islands', 'the Galápagos Islands', 'les îles Galápagos', 'medium', NATURE],
  ["Giant's Causeway", "the Giant's Causeway", 'la Chaussée des Géants', 'medium', NATURE],
  ['Cliffs of Moher', 'the Cliffs of Moher', 'les falaises de Moher', 'medium', NATURE],
  ['Old Faithful', 'Old Faithful', 'Old Faithful', 'medium', NATURE],
  ['Prague Castle', 'Prague Castle', 'le château de Prague', 'hard', PLACES],
  ['Stari Most', 'the Stari Most bridge', 'le pont de Mostar', 'hard', PLACES],
  ['Tikal', 'Tikal', 'Tikal', 'hard', PLACES],
  ['Teotihuacan', 'Teotihuacan', 'Teotihuacan', 'hard', PLACES],
  ['Persepolis', 'Persepolis', 'Persépolis', 'hard', PLACES],
  ['Sigiriya', 'Sigiriya', 'Sigiriya', 'hard', PLACES],
  ['Paro Taktsang', "the Tiger's Nest monastery", 'le monastère de Taktshang', 'hard', PLACES],
  ['Lalibela', 'Lalibela', 'Lalibela', 'hard', PLACES],
  ['Great Zimbabwe', 'Great Zimbabwe', 'le Grand Zimbabwe', 'hard', PLACES],
  ['Great Mosque of Djenné', 'the Great Mosque of Djenné', 'la grande mosquée de Djenné', 'hard', PLACES],
  ['Timbuktu', 'Timbuktu', 'Tombouctou', 'hard', PLACES],
  ['Meteora', 'Meteora', 'les Météores', 'hard', PLACES],
  ['Hallgrímskirkja', 'Hallgrímskirkja', 'Hallgrímskirkja', 'hard', PLACES],
  ['Atomium', 'the Atomium', "l'Atomium", 'hard', PLACES],
  ['The Little Mermaid (statue)', 'the Little Mermaid statue', 'la statue de la Petite Sirène', 'hard', PLACES],
  ['Manneken Pis', 'Manneken Pis', 'Manneken-Pis', 'hard', PLACES],
  ['Kronborg', 'Kronborg Castle', 'le château de Kronborg', 'hard', PLACES],
  ['Mount Elbrus', 'Mount Elbrus', "l'Elbrouz", 'hard', NATURE],
  ['Aconcagua', 'Aconcagua', "l'Aconcagua", 'hard', NATURE],
  ['Angel Falls', 'Angel Falls', 'le salto Ángel', 'hard', NATURE],
  ['Lake Baikal', 'Lake Baikal', 'le lac Baïkal', 'hard', NATURE],
  ['Lake Titicaca', 'Lake Titicaca', 'le lac Titicaca', 'hard', NATURE],
  ['Salar de Uyuni', 'the Salar de Uyuni', "le salar d'Uyuni", 'hard', NATURE],
  ['Cappadocia', 'Cappadocia', 'la Cappadoce', 'hard', NATURE],
  ['Mount Ararat', 'Mount Ararat', 'le mont Ararat', 'hard', NATURE],
  ['Mount Etna', 'Mount Etna', "l'Etna", 'hard', NATURE],
  ['Krakatoa', 'Krakatoa', 'le Krakatoa', 'hard', NATURE],
  ['Denali', 'Denali', 'le Denali', 'hard', NATURE],
  ['Sugarloaf Mountain', 'Sugarloaf Mountain', 'le Pain de Sucre', 'hard', NATURE],
];

const sparql = async (query) => {
  const url = `${ENDPOINT}?${new URLSearchParams({ query, format: 'json' })}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'quizz-question-bank/1.0' } });
    if (res.ok) return (await res.json()).results.bindings;
    if (attempt === 4) throw new Error(`Wikidata responded ${res.status}`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 15000));
  }
};
const qid = (uri) => uri.split('/').pop();
const point = (wkt) => {
  const [lng, lat] = wkt.slice(6, -1).split(' ').map(Number);
  return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) };
};

const capitalRows = await sparql(`SELECT ?c ?cap ?cen ?cfr ?en ?fr ?co ?s WHERE {
  ?c wdt:P31 wd:Q3624078; wdt:P36 ?cap.
  FILTER NOT EXISTS {?c wdt:P31 wd:Q3024240} FILTER NOT EXISTS {?c wdt:P576 ?x}
  ?cap wdt:P625 ?co; wikibase:sitelinks ?s.
  ?c rdfs:label ?cen FILTER(LANG(?cen)="en") ?c rdfs:label ?cfr FILTER(LANG(?cfr)="fr")
  ?cap rdfs:label ?en FILTER(LANG(?en)="en") ?cap rdfs:label ?fr FILTER(LANG(?fr)="fr")
}`);
const namedRows = await sparql(`SELECT ?c ?cap ?co ?s WHERE {
  VALUES ?c { ${Object.keys(NAMED_BY_HAND)
    .map((q) => `wd:${q}`)
    .join(' ')} }
  ?c wdt:P36 ?cap. ?cap wdt:P625 ?co; wikibase:sitelinks ?s.
}`);
for (const row of namedRows) {
  const [en, fr, cen, cfr] = NAMED_BY_HAND[qid(row.c.value)];
  capitalRows.push({
    ...row,
    en: { value: en },
    fr: { value: fr },
    cen: { value: cen },
    cfr: { value: cfr },
  });
}

const capitals = new Map();
for (const row of capitalRows) {
  const country = qid(row.c.value);
  const capital = qid(row.cap.value);
  if (SKIP_COUNTRIES.has(country)) continue;
  const key = `${country}:${capital}`;
  if (capitals.has(key)) continue;
  const [countryEn, countryFr] = COUNTRY_NAMES[country] ?? [row.cen.value, row.cfr.value];
  capitals.set(key, {
    popularity: Number(row.s.value),
    question: {
      category: 'Capitals',
      type: 'geo',
      text: `Where is ${row.en.value.replace(/ District$/, '')} (${countryEn})?`,
      textFr: `Où se trouve ${row.fr.value} (${countryFr}) ?`,
      geo: point(row.co.value),
    },
  });
}

// Rough levels: the most-linked third of capitals is easy, the least-linked third is hard.
const ranked = [...capitals.values()].sort((a, b) => b.popularity - a.popularity);
const capitalQuestions = ranked.map(({ question }, i) => ({
  ...question,
  difficulty: i < ranked.length / 3 ? 'easy' : i < (ranked.length * 2) / 3 ? 'medium' : 'hard',
}));

const titles = LANDMARKS.map(([title]) => `"${title}"@en`).join(' ');
const landmarkRows = await sparql(`SELECT ?title ?co WHERE {
  VALUES ?title { ${titles} }
  ?a schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
  ?i wdt:P625 ?co.
}`);
const coords = new Map();
for (const row of landmarkRows) {
  if (!coords.has(row.title.value)) coords.set(row.title.value, point(row.co.value));
}
const missing = LANDMARKS.filter(([title]) => !coords.has(title)).map(([title]) => title);
if (missing.length > 0) console.warn(`No coordinates for: ${missing.join(', ')}`);
const landmarkQuestions = LANDMARKS.filter(([title]) => coords.has(title)).map(
  ([title, en, fr, difficulty, category]) => ({
    category,
    difficulty,
    type: 'geo',
    text: `Where is ${en}?`,
    textFr: `Où se trouve ${fr} ?`,
    geo: coords.get(title),
  }),
);

const questions = [...capitalQuestions, ...landmarkQuestions];
await writeFile(
  OUT,
  `${JSON.stringify({
    source: 'Wikidata',
    sourceUrl: 'https://www.wikidata.org',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    fetchedAt: new Date().toISOString().slice(0, 10),
    questions,
  })}\n`,
);
console.log(`Wrote ${questions.length} map questions to ${OUT}`);
