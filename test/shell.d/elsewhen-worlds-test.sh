#!/bin/bash

set -euo pipefail

source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/base-test.sh"

run_node_test <<'JS'
const { Elsewhere: E, Worlds: W, Model: M, Solar } = requireFromRoot('test/shell.d/elsewhen/worlds.js')
const near = (a, b, eps) => Math.abs(a - b) <= eps
const day = (y, m, d, h) => Date.UTC(y, m - 1, d, h || 0)

// ---- Mars

// The worked example in Allison & McEwen's Mars24 notes: 2000-01-06 00:00 UTC.
const example = day(2000, 1, 6)
assert(near(W.marsSolDate(example), 44795.99976, 0.00001), 'elsewhen Mars Sol Date matches the Mars24 worked example', W.marsSolDate(example))
assert(near(W.marsSolarLongitude(example), 277.18758, 0.0005), 'elsewhen Mars solar longitude matches the Mars24 worked example', W.marsSolarLongitude(example))

// Clancy's Mars Years start at the northern spring equinox.
for (const [year, [y, m, d]] of [[37, [2022, 12, 26]], [38, [2024, 11, 12]], [39, [2026, 9, 30]]]) {
  assertEqual(W.marsYear(day(y, m, d) - 2 * 86400000), year - 1, `elsewhen Mars Year ${year - 1} runs up to its equinox`)
  assertEqual(W.marsYear(day(y, m, d) + 2 * 86400000), year, `elsewhen Mars Year ${year} starts at its equinox`)
}

// The Darian year starts at the same equinox, give or take a sol.
const darianNewYear = W.darianDate(day(2026, 10, 1, 0))
assertDeepEqual([darianNewYear.year, darianNewYear.monthName, darianNewYear.sol], [222, 'Sagittarius', 1], 'elsewhen Darian year 222 opens at the equinox')
assertEqual(W.darianDate(day(2026, 9, 30, 0)).monthName, 'Vrishika', 'elsewhen the sol before is the last month of 221')

// A rover's landing sol is sol 0, counted on its own local mean time.
assertEqual(W.missionSol(day(2021, 2, 18, 21), 77.4509, day(2021, 2, 18, 20, 55)), 0, 'elsewhen Perseverance lands on sol 0')
assertEqual(W.missionSol(day(2012, 8, 6, 6), 137.4417, day(2012, 8, 6, 5)), 0, 'elsewhen Curiosity lands on sol 0')
assert(near(W.missionSol(day(2026, 11, 5, 18), 77.4509, day(2021, 2, 18, 20, 55)), 2030, 1), 'elsewhen Perseverance is past sol 2000 in late 2026')

// Mars at the equator sees about twelve hours of sun.
const equator = W.marsSunHours(day(2026, 11, 5), 0)
assert(near((equator.set - equator.rise + 24) % 24, 12, 0.2), 'elsewhen an equatorial sol is half lit')

// ---- light time, against JPL Horizons (geocentric range in AU; light time in days)

const MARS_RANGE = [
  [[2024, 12, 31], 0.6592884975], [[2025, 3, 14], 0.9729255090], [[2025, 10, 19], 2.3919898813],
  [[2026, 3, 14], 2.3224578751], [[2026, 10, 19], 1.5349904801], [[2027, 3, 14], 0.7301680095]
]
for (const [[y, m, d], au] of MARS_RANGE) {
  const got = W.lightSecondsTo('mars', day(y, m, d)) / 499.004783836
  assert(near(got, au, 0.002), `elsewhen Mars is ${au.toFixed(3)} AU away on ${y}-${m}-${d}`, got)
}

const VOYAGER_LIGHT_DAYS = [[[2026, 11, 1], 0.9983303320], [[2026, 11, 6], 0.9988471182]]
for (const [[y, m, d], lt] of VOYAGER_LIGHT_DAYS) {
  const got = W.lightSecondsTo('voyager1', day(y, m, d)) / 86400
  assert(near(got, lt, 0.00005), `elsewhen Voyager 1's light time matches Horizons on ${y}-${m}-${d}`, got)
}
const crossing = new Date(E.voyagerLightDay())
assert(crossing.getUTCFullYear() === 2026 && crossing.getUTCMonth() === 10 && crossing.getUTCDate() >= 16 && crossing.getUTCDate() <= 19,
  'elsewhen Voyager 1 is a light-day out in mid-November 2026', crossing.toISOString())

// ---- the Moon

const NEW_MOON = day(2026, 11, 9, 7)
const FULL_MOON = day(2026, 11, 24, 15)
const tranquility = (ms) => E.rowFor({ label: '', id: '@space/tranquility', clock: 'space/tranquility' }, ms, null, null)
assert(!tranquility(NEW_MOON).strip.lit, 'elsewhen Tranquility Base is in its night at new moon')
assert(tranquility(FULL_MOON).strip.lit, 'elsewhen Tranquility Base is in its day at full moon')
assertEqual(Math.round(W.lunarDayFraction(0.5, 0) * 100) / 100, 0.5, 'elsewhen full moon is noon on the near side')

// ---- Earth time

assert(near(W.gmstHours(Date.UTC(2000, 0, 1, 12)), 18.697374558, 1e-6), 'elsewhen GMST is 18.697h at J2000')
assertEqual(Math.floor(W.swatchBeats(Date.UTC(2026, 0, 1, 23))), 0, 'elsewhen @000 is midnight in Biel')
assertEqual(W.taiMinusUtc(day(2026, 1, 1)), 37, 'elsewhen TAI is 37 seconds ahead')
assertEqual(W.taiMinusUtc(day(2016, 6, 1)), 36, 'elsewhen TAI was 36 seconds ahead before 2017')
assertEqual(W.gpsMinusUtc(day(2026, 1, 1)), 18, 'elsewhen GPS time is 18 seconds ahead')
assert(near(W.julianDay(Date.UTC(2000, 0, 1, 12)), 2451545, 1e-9), 'elsewhen J2000 is JD 2451545')

const maya = W.mayaDate(W.dayNumber(day(2012, 12, 21, 12), 0))
assertDeepEqual([maya.longCount, maya.tzolkin, maya.haab], ['13.0.0.0.0', '4 Ajaw', "3 K'ank'in"], 'elsewhen the Long Count turns over on 21 December 2012')

// Days the Republic dated itself.
for (const [[y, m, d], want] of [[[1794, 7, 27], [2, 'Thermidor', 9]], [[1799, 11, 9], [8, 'Brumaire', 18]], [[1804, 12, 2], [13, 'Frimaire', 11]]]) {
  const r = W.republicanDate(W.dayNumber(day(y, m, d, 12), 0))
  assertDeepEqual([r.year, r.monthName, r.day], want, `elsewhen ${d} ${m} ${y} is ${want[2]} ${want[1]} ${W.romanNumeral(want[0])}`)
}
assertDeepEqual(W.decimalTime(0.5), { hour: 5, minute: 0, second: 0 }, 'elsewhen noon is 5:00 in decimal time')

// ---- fiction

const parts = (y, m, d) => M.zoneParts(day(y, m, d, 12), 0)
assertDeepEqual(W.shireDate(parts(2025, 12, 22)), { name: '2 Yule', weekday: 'Sterday' }, 'elsewhen the Shire year opens on 22 December, a Sterday')
assertDeepEqual(W.shireDate(parts(2026, 11, 5)), { name: '15 Blotmath', weekday: 'Monday' }, 'elsewhen 5 November is 15 Blotmath')
assertEqual(W.shireDate(parts(2026, 6, 22)).weekday, '', "elsewhen Mid-year's Day belongs to no week")
assertEqual(W.shireDate(parts(2026, 6, 22)).name, "Mid-year's Day", "elsewhen Mid-year's Day falls on 22 June")
assertEqual(W.shireDate(parts(2028, 6, 22)).name, 'Overlithe', 'elsewhen a leap year has an Overlithe')
assertEqual(W.shireDate(parts(2026, 12, 21)).name, '1 Yule', 'elsewhen the Shire year closes on 1 Yule')

assertDeepEqual(W.tamrielDate(parts(2026, 11, 5)), { weekday: 'Turdas', name: "5th of Sun's Dusk", year: '4E 216' }, 'elsewhen 5 November is Turdas, 5th of Sun\'s Dusk')
assertEqual(W.imperialDate(Date.UTC(2026, 0, 1)), '0 000 026.M3', 'elsewhen the Imperial year starts at 000')
assertEqual(W.imperialDate(Date.UTC(2000, 6, 2)), '0 500 000.M3', 'elsewhen 2000 is year 000 of M3')
assertEqual(W.kelvinStardate(parts(2026, 11, 5)), '2026.309', 'elsewhen the Kelvin stardate is year.day')
assert(near(W.tngStardate(Date.UTC(2364, 0, 1)), 41000, 1e-6), 'elsewhen the fan stardate puts 2364 at 41000')
assertDeepEqual(W.galacticDate(day(1977, 5, 25, 12)), { year: 0, day: 1, era: 'ABY' }, 'elsewhen 0 ABY opens with the film')
assertDeepEqual(W.galacticDate(day(1977, 5, 25, 12) + 368 * 86400000), { year: 1, day: 1, era: 'ABY' }, 'elsewhen a galactic year is 368 days')

// ---- rate clocks

assertEqual(E.duration(W.elapsedAtRate(day(2033, 1, 1), day(2026, 1, 1), W.MILLER_RATE), null), '1h 0m', "elsewhen seven years here is an hour on Miller's planet")
assertEqual(W.elapsedAtRate(day(2026, 1, 1), day(2026, 2, 1), 20), 0, 'elsewhen a rate clock does not run before its anchor')
const miller = E.rowFor({ label: '', id: '@rate/miller', clock: 'rate/miller', since: day(2026, 1, 1) }, day(2026, 1, 2), null, null)
assertEqual(miller.time, '1.408s', "elsewhen a day here is under a second and a half on Miller's planet")

// ---- every row

const ctx = { here: parts(2026, 11, 5), hereLon: -80.14, hereLabel: 'Fort Lauderdale', offsetMinutes: -300 }
for (const c of E.CLOCKS) {
  const row = E.rowFor({ label: 'x', id: '@' + c.clock, clock: c.clock, since: day(2026, 11, 1) }, day(2026, 11, 5, 18), ctx, null)
  assert(row.ready && row.time !== '' && row.note !== '', `elsewhen ${c.clock} has a value and a note`, JSON.stringify(row))
  if (row.strip) assert(row.strip.progress >= 0 && row.strip.progress < 1 && row.strip.periodMs > 0, `elsewhen ${c.clock}'s strip has a place for now`)
  assert(E.clockLabel(c.clock, null) !== 'Unknown clock', `elsewhen ${c.clock} has a name`)
}
const unknown = E.rowFor({ label: 'Pluto', id: '@pluto/base', clock: 'pluto/base' }, day(2026, 11, 5), ctx, null)
assertEqual(unknown.time, '--:--', 'elsewhen a clock from a newer build shows no time rather than a wrong one')

// Scrubbing a sol-long strip moves the clocks by Mars time, the short way round.
const sol = W.MARS_SOL_MS / 60000
assert(near(E.scrubDeltaMinutes(0.75, 0.5, W.MARS_SOL_MS), sol / 4, 1e-6), 'elsewhen a quarter of a sol forward')
assert(near(E.scrubDeltaMinutes(0.05, 0.95, W.MARS_SOL_MS), sol / 10, 1e-6), 'elsewhen across the end of the sol, the short way')

// ---- storage

const stored = [
  { name: 'Mars Time', clock: 'mars/time' },
  { name: "Miller's planet", clock: 'rate/miller', since: 1790000000000 },
  { name: 'Gotham', zone: 'America/New_York', lat: 40.7128, lon: -74.006, fiction: 'gotham' },
  { name: 'Pluto', clock: 'pluto/base' },
  { name: 'Bad', clock: 'not a clock' }
]
const list = M.parseCities(stored, '')
assertEqual(list.length, 4, 'elsewhen keeps clocks, places and a newer build\'s clocks, and drops junk')
assertDeepEqual(M.serializeCities(list), stored.slice(0, 4), 'elsewhen writes clocks back as it read them')
assertDeepEqual(M.addZone([], '@mars/jezero', 'Jezero Crater'), [{ label: 'Jezero Crater', id: '@mars/jezero', clock: 'mars/jezero' }], 'elsewhen adds a clock')
assertEqual(M.addZone(list, '@mars/time', 'Mars Time'), list, 'elsewhen adds a clock once')
assertEqual(M.addZone([], '@Mars Time', 'x').length, 0, 'elsewhen refuses a clock id that could not be one')
const hogwarts = M.addZone([], 'Europe/London', 'Hogwarts', { lat: 56.8763, lon: -5.4319, region: 'Fiction, Glenfinnan time', fiction: 'hogwarts' })[0]
assertDeepEqual(hogwarts, { label: 'Hogwarts', id: 'Europe/London', lat: 56.8763, lon: -5.4319, fiction: 'hogwarts' }, 'elsewhen keeps a fictional place\'s slug and not its caption')
assertEqual(E.clockIdFor('mars/jezero'), '@mars/jezero', 'elsewhen IPC names a clock without its @')
assertEqual(E.clockIdFor('Europe/Paris'), '', 'elsewhen IPC still takes a zone as a zone')

// ---- search

const worlds = E.worldOptions([], null)
function gothamValue() { return worlds.find((o) => o.fiction === 'gotham') }
const cities = [{ label: 'Marseille', value: 'Europe/Paris' }, { label: 'Martinique', value: 'America/Martinique' }]
const labels = (q) => E.combinedMatches(worlds, cities, q, 6).matches.map((m) => m.label)
assertEqual(labels('mars')[0], 'Mars Time', 'elsewhen "mars" finds Mars before Marseille')
assertDeepEqual(labels('mar').slice(0, 2), ['Marseille', 'Martinique'], 'elsewhen "mar" still finds the cities first')
assertDeepEqual(E.searchWorlds(worlds, 'fiction trek').exact.map((m) => m.clock), ['fiction/kelvin', 'fiction/tng'], 'elsewhen words narrow one another')
assertDeepEqual(E.searchWorlds(worlds, '').exact.concat(E.searchWorlds(worlds, '').loose), [], 'elsewhen an empty search keeps the clocks hidden')
assertDeepEqual(E.seedClocks(null).map((c) => c.id), ['@mars/time', '@fiction/kelvin'], 'elsewhen a fresh list gets a taste of two clocks')
assertDeepEqual(M.serializeCities(E.seedClocks(null)), [{ name: 'Mars Time', clock: 'mars/time' }, { name: 'Stardate, Kelvin', clock: 'fiction/kelvin' }], 'elsewhen the seeded clocks are stored like any other')
assert(E.placeOptions(null).length === E.PLACES.length && E.placeOptions(null).every((o) => o.lat !== undefined && o.fiction), 'elsewhen the globe can jump to every fictional place')
const jumped = M.addZone([], gothamValue().value, 'Gotham', { lat: 40.7128, lon: -74.006, region: 'x', fiction: 'gotham' })[0]
assertEqual(jumped.fiction, 'gotham', 'elsewhen a fictional place jumped to on the globe keeps its slug')
assertEqual(E.combinedMatches(worlds, cities, 'fiction', 6).more, E.searchWorlds(worlds, 'fiction').exact.length - 6, 'elsewhen counts what did not fit')
const tracked = M.parseCities([{ name: E.clockLabel('mars/time', null), clock: 'mars/time' }], '')
assert(!E.worldOptions(tracked, null).some((o) => o.clock === 'mars/time'), 'elsewhen does not offer a clock already on the list')
const gotham = gothamValue()
assertDeepEqual([gotham.value, gotham.region], ['America/New_York', 'Fiction, New York time'], 'elsewhen a fictional place keeps its host\'s zone and says so')
JS
