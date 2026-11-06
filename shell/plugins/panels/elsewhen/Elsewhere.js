.pragma library

.import "Worlds.js" as Worlds
.import "Model.js" as Model
.import "GlobeModel.js" as Solar

// The rows that are not a city: what each one is called, what it shows in a
// city row's slots, and how the add-a-city search finds it. The arithmetic
// lives in Worlds.js; this file only arranges it.
//
// A clock row is stored as { name, clock } and lives in the list as
// { label, id: "@" + clock, clock }. The "@" keeps it out of everything that
// takes `id` for a zone: the date probe, the geocoder, the globe.
// A fictional place is a city row on a real zone with `fiction` set to its slug.

var CLOCK_ID = /^[a-z0-9]+\/[a-z0-9-]+$/

function isClockId(id) { return String(id || "").charAt(0) === "@" }

// ---- the catalogue

// tier: "exact" (a published rule),
// "approx" (a model of something real), "fan" (an anchor somebody chose),
// "joke". kind: "time" rows keep a day strip.
var CLOCKS = [
  { clock: "mars/time", tier: "exact", keys: "mars mtc airy nasa sol darian space planet" },
  { clock: "mars/jezero", tier: "exact", keys: "mars perseverance jezero rover nasa sol lmst space" },
  { clock: "mars/gale", tier: "exact", keys: "mars curiosity gale rover nasa sol lmst space" },
  { clock: "mars/light", tier: "approx", keys: "mars light delay distance space" },
  { clock: "space/iss", tier: "exact", keys: "space iss station orbit nasa astronaut" },
  { clock: "space/tranquility", tier: "approx", keys: "space moon lunar apollo tranquility" },
  { clock: "space/voyager", tier: "approx", keys: "space voyager nasa light probe" },
  { clock: "space/sidereal", tier: "exact", keys: "space sidereal stars lst gmst astronomy" },
  { clock: "earth/swatch", tier: "exact", keys: "earth swatch beats internet" },
  { clock: "earth/tai", tier: "exact", keys: "earth tai atomic" },
  { clock: "earth/gps", tier: "exact", keys: "earth gps satellite" },
  { clock: "earth/julian", tier: "exact", keys: "earth julian jd astronomy" },
  { clock: "earth/unix", tier: "exact", keys: "earth unix epoch posix computer" },
  { clock: "earth/decimal", tier: "exact", keys: "earth decimal french republican revolution paris" },
  { clock: "earth/maya", tier: "exact", keys: "earth maya mayan long count calendar" },
  { clock: "fiction/shire", tier: "exact", keys: "fiction tolkien shire hobbit lotr middle-earth" },
  { clock: "fiction/tamriel", tier: "fan", keys: "fiction tamriel elder scrolls skyrim game" },
  { clock: "fiction/imperium", tier: "exact", keys: "fiction 40k warhammer imperium imperial game" },
  { clock: "fiction/kelvin", tier: "exact", keys: "fiction trek star stardate kelvin" },
  { clock: "fiction/tng", tier: "fan", keys: "fiction trek star stardate tng" },
  { clock: "fiction/galactic", tier: "fan", keys: "fiction star wars galactic aby coruscant" },
  { clock: "fiction/westeros", tier: "joke", keys: "fiction westeros thrones got" },
  { clock: "fiction/dune", tier: "fan", keys: "fiction dune arrakis" },
  { clock: "fiction/springfield", tier: "joke", keys: "fiction simpsons springfield" },
  { clock: "rate/miller", tier: "exact", rate: Worlds.MILLER_RATE, keys: "fiction interstellar miller dilation" },
  { clock: "rate/narnia", tier: "approx", rate: Worlds.NARNIA_RATE, keys: "fiction narnia lewis wardrobe" },
  { clock: "rate/inception-1", tier: "exact", rate: 20, keys: "fiction inception dream" },
  { clock: "rate/inception-2", tier: "exact", rate: 400, keys: "fiction inception dream" },
  { clock: "rate/inception-3", tier: "exact", rate: 8000, keys: "fiction inception dream" }
]

// Places from fiction, kept on a real city's clock and weather. They stay off
// the globe: a dot for Wakanda on Nairobi would be a geography lie.
var PLACES = [
  { slug: "gotham", label: "Gotham", zone: "America/New_York", host: "New York", lat: 40.7128, lon: -74.006, keys: "batman dc" },
  { slug: "metropolis", label: "Metropolis", zone: "America/New_York", host: "New York", lat: 40.7128, lon: -74.006, keys: "superman dc" },
  { slug: "hogwarts", label: "Hogwarts", zone: "Europe/London", host: "Glenfinnan", lat: 56.8763, lon: -5.4319, keys: "harry potter wizard" },
  { slug: "twin-peaks", label: "Twin Peaks", zone: "America/Los_Angeles", host: "Snoqualmie", lat: 47.5287, lon: -121.8254, keys: "lynch" },
  { slug: "hill-valley", label: "Hill Valley", zone: "America/Los_Angeles", host: "Los Angeles", lat: 34.0522, lon: -118.2437, keys: "back future" },
  { slug: "stars-hollow", label: "Stars Hollow", zone: "America/New_York", host: "Washington Depot", lat: 41.6501, lon: -73.3229, keys: "gilmore girls" },
  { slug: "wakanda", label: "Wakanda", zone: "Africa/Nairobi", host: "Nairobi", lat: -1.2864, lon: 36.8172, keys: "marvel black panther" }
]

function clockEntry(clock) {
  for (var i = 0; i < CLOCKS.length; i++) if (CLOCKS[i].clock === clock) return CLOCKS[i]
  return null
}

function placeEntry(slug) {
  for (var i = 0; i < PLACES.length; i++) if (PLACES[i].slug === slug) return PLACES[i]
  return null
}

// Each string is spelled out with its key, so the catalogue check can find it.
function clockLabel(clock, words) {
  var t = Model.word(words, "t")
  switch (clock) {
  case "mars/time": return t("elsewhen.world.marsTime", "Mars Time")
  case "mars/jezero": return t("elsewhen.world.jezero", "Jezero Crater")
  case "mars/gale": return t("elsewhen.world.gale", "Gale Crater")
  case "mars/light": return t("elsewhen.world.marsLight", "Light to Mars")
  case "space/iss": return t("elsewhen.world.iss", "Space Station")
  case "space/tranquility": return t("elsewhen.world.tranquility", "Tranquility Base")
  case "space/voyager": return t("elsewhen.world.voyager", "Voyager 1")
  case "space/sidereal": return t("elsewhen.world.sidereal", "Sidereal time")
  case "earth/swatch": return t("elsewhen.world.swatch", "Internet Time")
  case "earth/tai": return t("elsewhen.world.tai", "Atomic time")
  case "earth/gps": return t("elsewhen.world.gps", "GPS time")
  case "earth/julian": return t("elsewhen.world.julian", "Julian Date")
  case "earth/unix": return t("elsewhen.world.unix", "Unix time")
  case "earth/decimal": return t("elsewhen.world.decimal", "Decimal time")
  case "earth/maya": return t("elsewhen.world.maya", "Long Count")
  case "fiction/shire": return t("elsewhen.world.shire", "The Shire")
  case "fiction/tamriel": return t("elsewhen.world.tamriel", "Tamriel")
  case "fiction/imperium": return t("elsewhen.world.imperium", "Imperial date")
  case "fiction/kelvin": return t("elsewhen.world.kelvin", "Stardate, Kelvin")
  case "fiction/tng": return t("elsewhen.world.tng", "Stardate, TNG")
  case "fiction/galactic": return t("elsewhen.world.galactic", "Galactic Standard")
  case "fiction/westeros": return t("elsewhen.world.westeros", "Westeros")
  case "fiction/dune": return t("elsewhen.world.dune", "Arrakis")
  case "fiction/springfield": return t("elsewhen.world.springfield", "Springfield, Simpsons")
  case "rate/miller": return t("elsewhen.world.miller", "Miller's planet")
  case "rate/narnia": return t("elsewhen.world.narnia", "Narnia")
  case "rate/inception-1": return t("elsewhen.world.dream1", "Dream, level 1")
  case "rate/inception-2": return t("elsewhen.world.dream2", "Dream, level 2")
  case "rate/inception-3": return t("elsewhen.world.dream3", "Dream, level 3")
  }
  return t("elsewhen.world.unknown", "Unknown clock")
}

// The caption beside a search result, as a city's region tells Portland from Portland.
function clockRegion(clock, words) {
  var t = Model.word(words, "t")
  switch (clock) {
  case "mars/time": return t("elsewhen.world.marsTimeWhere", "Mars, Airy-0")
  case "mars/jezero": return t("elsewhen.world.jezeroWhere", "Mars, Perseverance")
  case "mars/gale": return t("elsewhen.world.galeWhere", "Mars, Curiosity")
  case "mars/light": return t("elsewhen.world.marsLightWhere", "Mars, one way")
  case "space/iss": return t("elsewhen.world.issWhere", "Space, in orbit")
  case "space/tranquility": return t("elsewhen.world.tranquilityWhere", "Moon, Apollo 11")
  case "space/voyager": return t("elsewhen.world.voyagerWhere", "Space, light time")
  case "space/sidereal": return t("elsewhen.world.siderealWhere", "Space, star time")
  case "fiction/shire": return t("elsewhen.world.shireWhere", "Fiction, Tolkien")
  case "fiction/tamriel": return t("elsewhen.world.tamrielWhere", "Fiction, Elder Scrolls")
  case "fiction/imperium": return t("elsewhen.world.imperiumWhere", "Fiction, Warhammer 40,000")
  case "fiction/kelvin": return t("elsewhen.world.kelvinWhere", "Fiction, Star Trek 2009")
  case "fiction/tng": return t("elsewhen.world.tngWhere", "Fiction, Star Trek")
  case "fiction/galactic": return t("elsewhen.world.galacticWhere", "Fiction, Star Wars")
  case "fiction/westeros": return t("elsewhen.world.westerosWhere", "Fiction, Game of Thrones")
  case "fiction/dune": return t("elsewhen.world.duneWhere", "Fiction, Dune")
  case "fiction/springfield": return t("elsewhen.world.springfieldWhere", "Fiction, The Simpsons")
  case "rate/miller": return t("elsewhen.world.millerWhere", "Fiction, Interstellar")
  case "rate/narnia": return t("elsewhen.world.narniaWhere", "Fiction, C. S. Lewis")
  case "rate/inception-1":
  case "rate/inception-2":
  case "rate/inception-3": return t("elsewhen.world.dreamWhere", "Fiction, Inception")
  }
  return t("elsewhen.world.earthWhere", "Earth")
}

// Where the number comes from, in the slot the greeting takes on a city row.
function clockNote(clock, words) {
  var t = Model.word(words, "t")
  switch (clock) {
  case "mars/time": return t("elsewhen.world.marsTimeNote", "Mars24, NASA GISS")
  case "mars/jezero":
  case "mars/gale": return t("elsewhen.world.roverNote", "Sol 0 was landing day")
  case "mars/light": return t("elsewhen.world.marsLightNote", "From mean orbits, to seconds")
  case "space/iss": return t("elsewhen.world.issNote", "The crew keeps UTC")
  case "space/tranquility": return t("elsewhen.world.tranquilityNote", "Mean phase, within a day")
  case "space/voyager": return t("elsewhen.world.voyagerNote", "Fitted to JPL Horizons")
  case "earth/swatch": return t("elsewhen.world.swatchNote", "1000 beats a day, from Biel")
  case "earth/tai": return t("elsewhen.world.taiNote", "Never takes a leap second")
  case "earth/gps": return t("elsewhen.world.gpsNote", "TAI less 19s, since 1980")
  case "earth/julian": return t("elsewhen.world.julianNote", "Days since 4713 BC, from noon")
  case "earth/unix": return t("elsewhen.world.unixNote", "Skips leap seconds")
  case "earth/decimal": return t("elsewhen.world.decimalNote", "Paris Mean Time, Romme's rule")
  case "earth/maya": return t("elsewhen.world.mayaNote", "GMT correlation, 584283")
  case "fiction/shire": return t("elsewhen.world.shireNote", "Appendix D; no year given")
  case "fiction/tamriel": return t("elsewhen.world.tamrielNote", "Year from Skyrim: 4E 201 = 2011")
  case "fiction/imperium": return t("elsewhen.world.imperiumNote", "Check, fraction, year, millennium")
  case "fiction/kelvin": return t("elsewhen.world.kelvinNote", "The films' rule: year.day")
  case "fiction/tng": return t("elsewhen.world.tngNote", "Fan rule: 1000 a year, 2323 = 0")
  case "fiction/galactic": return t("elsewhen.world.galacticNote", "Fan rule: 0 ABY = 25 May 1977")
  case "fiction/westeros": return t("elsewhen.world.westerosNote", "No rule: 298 AC was 2011")
  case "fiction/dune": return t("elsewhen.world.duneNote", "Fan rule: 10191 AG = 1965")
  case "fiction/springfield": return t("elsewhen.world.springfieldNote", "Nobody knows which state")
  case "rate/miller": return t("elsewhen.world.millerNote", "An hour there, 7 years here")
  case "rate/narnia": return t("elsewhen.world.narniaNote", "Lewis's average; it isn't steady")
  case "rate/inception-1":
  case "rate/inception-2":
  case "rate/inception-3": return t("elsewhen.world.dreamNote", "20 times the level above")
  }
  return t("elsewhen.world.unknownNote", "Needs a newer Elsewhen")
}

// "Fiction, New York time": a fictional place's caption and its note.
function placeRegion(place, words) {
  var t = Model.word(words, "t")
  return Model.fill(t("elsewhen.world.placeWhere", "Fiction, %1 time"), place.host)
}

function placeNote(slug, words) {
  var t = Model.word(words, "t")
  var place = placeEntry(slug)
  if (!place) return ""
  return Model.fill(t("elsewhen.world.placeNote", "On %1's clock and weather"), place.host)
}

// ---- formatting

function pad2(n) { return (n < 10 ? "0" : "") + n }

function hhmm(hours, words) {
  var total = Math.floor(((hours % 24) + 24) % 24 * 60)
  return Model.digits(pad2(Math.floor(total / 60)) + ":" + pad2(total % 60), words)
}

function hhmmss(ms, words) {
  var d = new Date(Number(ms))
  return Model.digits(pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes()) + ":" + pad2(d.getUTCSeconds()), words)
}

// A span of time, as short as it can be said: "41.2s", "12m 41s", "23h 58m",
// "3d 4h", "8y 41d".
function duration(ms, words) {
  var secs = Math.max(0, Number(ms)) / 1000
  var fmt = Model.word(words, "fmt")
  var t = Model.word(words, "t")
  var y = Math.floor(secs / (365.25 * 86400))
  var d = Math.floor(secs / 86400)
  var h = Math.floor(secs / 3600)
  var m = Math.floor(secs / 60)
  var s = function(n) { return Model.fill(t("elsewhen.secondsShort", "%1s"), n) }
  var mm = function(n) { return Model.fill(t("elsewhen.minutesShort", "%1m"), fmt(n)) }
  var hh = function(n) { return Model.fill(t("elsewhen.hoursShort", "%1h"), fmt(n)) }
  var dd = function(n) { return Model.fill(t("elsewhen.daysShort", "%1d"), fmt(n)) }
  // A rate clock spends its first hours in fractions of a second.
  if (secs < 10) return s(fmt(Math.floor(secs * 1000) / 1000, 3))
  if (secs < 60) return s(fmt(Math.floor(secs * 10) / 10, 1))
  if (secs < 3600) return mm(m) + " " + s(fmt(Math.floor(secs % 60)))
  if (secs < 86400) return hh(h) + " " + mm(m % 60)
  if (y < 1) return dd(d) + " " + hh(h % 24)
  return Model.fill(t("elsewhen.yearsShort", "%1y"), fmt(y)) + " " + dd(Math.floor((secs - y * 365.25 * 86400) / 86400))
}

// ---- rows

var JEZERO = { lat: 18.4447, lon: 77.4509, landed: Date.UTC(2021, 1, 18, 20, 55) }
var GALE = { lat: -4.5895, lon: 137.4417, landed: Date.UTC(2012, 7, 6, 5, 17, 57) }
var TRANQUILITY_LON = 23.4729
var PARIS = { lat: 48.8566, lon: 2.3522, offsetMinutes: 9 }  // Paris Mean Time, UTC+0:09:21
var DECADE_DAYS = ["Primidi", "Duodi", "Tridi", "Quartidi", "Quintidi", "Sextidi", "Septidi", "Octidi", "Nonidi", "Décadi"]

// A strip of `periodMs` with its lit spans, the marker at `progress`, and
// what the marker shows by night: a phase, or -1 for a plain dark disc.
function strip(periodMs, progress, spans, lit, nightPhase) {
  return { periodMs: periodMs, progress: progress, spans: spans, lit: lit, nightPhase: nightPhase }
}

// Rise and set as fractions of the bar, split where they wrap.
function spansFor(rise, set) {
  if (rise <= set) return [{ x0: rise, x1: set }]
  return [{ x0: 0, x1: set }, { x0: rise, x1: 1 }]
}

function litIn(spans, p) {
  for (var i = 0; i < spans.length; i++) if (p >= spans[i].x0 && p < spans[i].x1) return true
  return false
}

function marsStrip(ms, lat, lon) {
  var hours = Worlds.marsMeanSolarHours(ms, lon)
  var sun = Worlds.marsSunHours(ms, lat)
  var spans = sun.kind === "polarDay" ? [{ x0: 0, x1: 1 }] : sun.kind === "polarNight" ? []
    : spansFor(sun.rise / 24, sun.set / 24)
  return strip(Worlds.MARS_SOL_MS, hours / 24, spans, litIn(spans, hours / 24), 0)
}

// The first instant Voyager 1 is a light-day out, found once by bisection.
var voyagerDayMs = null
function voyagerLightDay() {
  if (voyagerDayMs !== null) return voyagerDayMs
  var lo = Date.UTC(2026, 0, 1), hi = Date.UTC(2028, 0, 1)
  for (var i = 0; i < 40; i++) {
    var mid = (lo + hi) / 2
    if (Worlds.lightSecondsTo("voyager1", mid) < 86400) lo = mid
    else hi = mid
  }
  voyagerDayMs = hi
  return hi
}

// ctx: { here: civil date parts where you are, hereLon (or null), hereLabel,
//        offsetMinutes: yours, since: the row's anchor for rate clocks }.
// Returns the fields a city row reads, plus `clock`, `note`, `approx` and
// `strip` (null where there is no day to draw).
function rowFor(zone, ms, ctx, words) {
  var clock = zone.clock
  var entry = clockEntry(clock)
  var row = {
    label: zone.label, id: zone.id, clock: clock, people: zone.people || [], ready: true,
    time: "", meridiem: "", date: "", dayLabel: "", abbr: "", detail: "",
    note: clockNote(entry ? clock : "", words), tier: entry ? entry.tier : "joke",
    strip: null, long: false, hour: 12, phase: "day"
  }
  if (!entry) { row.time = "--:--"; return row }
  fillRow(row, clock, entry, zone, ms, ctx, words)
  // Dimmed by night like a city row, where the clock has a sun to go by.
  if (row.strip) row.phase = row.strip.lit ? "day" : "night"
  return row
}

function fillRow(row, clock, entry, zone, ms, ctx, words) {
  var t = Model.word(words, "t")
  var fmt = Model.word(words, "fmt")
  var here = ctx && ctx.here ? ctx.here : Model.zoneParts(ms, 0)
  var jdn = function(offset) { return Worlds.dayNumber(ms, offset) }
  switch (clock) {
  case "mars/time": {
    var d = Worlds.darianDate(ms)
    var ls = Worlds.marsSolarLongitude(ms)
    row.time = hhmm(Worlds.marsMeanSolarHours(ms, 0), words)
    row.date = Model.digits(d.sol + " " + d.monthName + " " + d.year, words)
    row.abbr = "MTC"
    row.detail = "MSD " + Model.digits(Math.floor(Worlds.marsSolDate(ms)), words)
    row.note = t("elsewhen.world.marsYear", "Mars Year %1, Ls %2°")
      .replace("%1", fmt(Worlds.marsYear(ms))).replace("%2", fmt(Math.round(ls)))
    row.strip = marsStrip(ms, 0, 0)
    break
  }
  case "mars/jezero":
  case "mars/gale": {
    var site = clock === "mars/jezero" ? JEZERO : GALE
    row.time = hhmm(Worlds.marsMeanSolarHours(ms, site.lon), words)
    row.date = clock === "mars/jezero" ? "Perseverance" : "Curiosity"  // i18n: ignore
    row.abbr = "LMST"
    row.detail = Model.fill(t("elsewhen.world.sol", "Sol %1"), fmt(Worlds.missionSol(ms, site.lon, site.landed)))
    row.strip = marsStrip(ms, site.lat, site.lon)
    break
  }
  case "mars/light": {
    var seconds = Worlds.lightSecondsTo("mars", ms)
    row.time = "~" + duration(seconds * 1000, words)
    row.date = t("elsewhen.world.oneWay", "one way, Earth to Mars")
    row.detail = Model.fill(t("elsewhen.world.au", "%1 AU"), fmt(Math.round(seconds / 499.004784 * 100) / 100, 2))
    break
  }
  case "space/iss":
    row.time = hhmm(((ms / 3600000) % 24 + 24) % 24, words)
    row.date = t("elsewhen.world.issSunrises", "16 sunrises a day")
    row.abbr = "GMT"
    break
  case "space/tranquility": {
    var synodic = Solar.SYNODIC_MONTH * 86400000
    var f = Worlds.lunarDayFraction(Solar.moonPhase(ms), TRANQUILITY_LON)
    var lit = f >= 0.25 && f < 0.75
    var into = lit ? f - 0.25 : ((f - 0.75) % 1 + 1) % 1
    var left = 0.5 - into
    row.time = Model.fill(lit ? t("elsewhen.world.lunarDay", "Day %1") : t("elsewhen.world.lunarNight", "Night %1"),
      fmt(Math.floor(into * Solar.SYNODIC_MONTH) + 1))
    row.date = Model.fill(lit ? t("elsewhen.world.sunsetIn", "sunset in %1") : t("elsewhen.world.sunriseIn", "sunrise in %1"),
      duration(left * synodic, words))
    row.abbr = "Apollo 11"  // i18n: ignore
    // By lunar night the marker is Earth, at the phase it shows the Moon.
    row.strip = strip(synodic, f, [{ x0: 0.25, x1: 0.75 }], lit, (Solar.moonPhase(ms) + 0.5) % 1)
    break
  }
  case "space/voyager": {
    var light = Worlds.lightSecondsTo("voyager1", ms)
    var crossing = voyagerLightDay()
    row.time = "~" + duration(light * 1000, words)
    if (ms < crossing)
      row.date = Model.fill(t("elsewhen.world.lightDayIn", "a light-day out in %1"), duration(crossing - ms, words))
    else
      row.date = Model.fill(t("elsewhen.world.lightDaySince", "a light-day out since %1"),
        Model.formatDate(Model.zoneParts(crossing, ctx ? ctx.offsetMinutes || 0 : 0), words))
    row.detail = Model.fill(t("elsewhen.world.au", "%1 AU"), fmt(Math.round(light / 499.004784 * 10) / 10, 1))
    break
  }
  case "space/sidereal": {
    var lon = ctx && ctx.hereLon !== undefined && ctx.hereLon !== null ? ctx.hereLon : 0
    row.time = hhmm(Worlds.localSiderealHours(ms, lon), words)
    row.date = "GMST " + hhmm(Worlds.gmstHours(ms), words)  // i18n: ignore
    row.abbr = "LST"
    row.note = ctx && ctx.hereLon !== undefined && ctx.hereLon !== null
      ? Model.fill(t("elsewhen.world.siderealAt", "Stars due south of %1"), ctx.hereLabel || "")
      : t("elsewhen.world.siderealGreenwich", "At Greenwich, until you're placed")
    break
  }
  case "earth/swatch":
    row.time = "@" + Model.digits(Math.floor(Worlds.swatchBeats(ms)), words)
    row.date = t("elsewhen.world.bielTime", "Biel Mean Time")
    row.abbr = "BMT"
    break
  case "earth/tai":
    row.time = hhmmss(ms + Worlds.taiMinusUtc(ms) * 1000, words)
    row.date = t("elsewhen.world.atomic", "International Atomic Time")
    row.detail = "UTC+" + Model.digits(Worlds.taiMinusUtc(ms), words) + "s"  // i18n: ignore
    break
  case "earth/gps":
    row.time = hhmmss(ms + Worlds.gpsMinusUtc(ms) * 1000, words)
    row.date = t("elsewhen.world.satellites", "the satellites' own clock")
    row.detail = "UTC+" + Model.digits(Worlds.gpsMinusUtc(ms), words) + "s"  // i18n: ignore
    break
  case "earth/julian":
    row.time = fmt(Math.floor(Worlds.julianDay(ms) * 1000) / 1000, 3)
    row.date = t("elsewhen.world.julianDays", "days since 4713 BC")
    row.abbr = "JD"
    row.long = true
    break
  case "earth/unix":
    row.time = Model.digits(Math.floor(ms / 1000), words)
    row.date = t("elsewhen.world.unixSeconds", "seconds since 1970")
    row.long = true
    break
  case "earth/decimal": {
    var parisMs = ms + 561000
    var dayFraction = ((parisMs % 86400000) + 86400000) % 86400000 / 86400000
    var dt = Worlds.decimalTime(dayFraction)
    var rep = Worlds.republicanDate(Worlds.dayNumber(parisMs, 0))
    row.time = Model.digits(dt.hour + ":" + pad2(dt.minute), words)
    row.date = (rep.month === 12 ? rep.day + " " + rep.monthName
      : DECADE_DAYS[(rep.day - 1) % 10] + " " + rep.day + " " + rep.monthName) + " " + Worlds.romanNumeral(rep.year)
    row.abbr = "Paris"  // i18n: ignore
    // Paris's own day, drawn by the Earth strip with Paris's sun.
    row.earthStrip = { lat: PARIS.lat, lon: PARIS.lon, offsetMinutes: PARIS.offsetMinutes, progress: dayFraction }
    break
  }
  case "earth/maya": {
    var maya = Worlds.mayaDate(jdn(ctx ? ctx.offsetMinutes || 0 : 0))
    row.time = maya.longCount
    row.date = maya.tzolkin + " " + maya.haab
    row.long = true
    break
  }
  case "fiction/shire": {
    var shire = Worlds.shireDate(here)
    row.time = shire.name
    row.date = shire.weekday
    break
  }
  case "fiction/tamriel": {
    var tam = Worlds.tamrielDate(here)
    row.time = tam.name
    row.date = tam.weekday + ", " + tam.year
    row.abbr = t("elsewhen.world.fanRule", "fan rule")
    break
  }
  case "fiction/imperium":
    row.time = Worlds.imperialDate(ms)
    row.date = "Terra"  // i18n: ignore
    row.abbr = "40K"
    row.long = true
    break
  case "fiction/kelvin":
    row.time = Worlds.kelvinStardate(here)
    row.date = t("elsewhen.world.yearDay", "year, then day of year")
    break
  case "fiction/tng":
    row.time = fmt(Math.floor(Worlds.tngStardate(ms) * 10) / 10, 1)
    row.date = t("elsewhen.world.tngNotYet", "below zero until 2323")
    row.abbr = t("elsewhen.world.fanRule", "fan rule")
    row.long = true
    break
  case "fiction/galactic": {
    var g = Worlds.galacticDate(ms)
    row.time = Model.digits(Math.abs(g.year), words) + " " + g.era
    row.date = Model.fill(t("elsewhen.world.dayOf368", "day %1 of 368"), fmt(g.day))
    row.abbr = t("elsewhen.world.fanRule", "fan rule")
    break
  }
  case "fiction/westeros":
    row.time = Model.digits(Worlds.westerosYear(here), words) + " AC"
    row.date = t("elsewhen.world.winter", "winter is coming")
    row.abbr = t("elsewhen.world.joke", "joke")
    break
  case "fiction/dune":
    row.time = Model.digits(Worlds.duneYear(here), words) + " AG"
    row.date = t("elsewhen.world.afterGuild", "After Guild")
    row.abbr = t("elsewhen.world.fanRule", "fan rule")
    break
  case "fiction/springfield":
    row.time = "??:??"
    row.date = t("elsewhen.world.stateUnknown", "state unknown")
    row.abbr = t("elsewhen.world.joke", "joke")
    break
  default: {
    // Rate clocks: time there since you added the row.
    var since = zone.since !== undefined ? Number(zone.since) : NaN
    if (!isFinite(since) || ms < since) {
      row.time = duration(0, words)
      row.date = t("elsewhen.world.notYet", "not there yet")
    } else {
      var earth = ms - since
      row.time = (entry.tier === "approx" ? "~" : "") + duration(Worlds.elapsedAtRate(ms, since, entry.rate), words)
      row.date = Model.fill(t("elsewhen.world.earthSince", "%1 here since you went"), duration(earth, words))
    }
    row.abbr = clock === "rate/miller" ? Model.fill(t("elsewhen.world.millerRate", "1h = %1y"), fmt(7))
      : Model.digits(Math.round(entry.rate), words) + "×"
    break
  }
  }
}

// Every row on the list: cities from the probe as before, clocks from here.
// A fictional place is a city with a note in place of its greeting.
function rows(zones, probe, ms, localOffsetMinutes, hour24, words, ctx) {
  var out = []
  for (var i = 0; i < zones.length; i++) {
    var z = zones[i]
    if (z.clock) { out.push(rowFor(z, ms, ctx, words)); continue }
    var row = Model.rows([z], probe, ms, localOffsetMinutes, hour24, words)[0]
    if (z.fiction) row.note = cityNote(z, words)
    out.push(row)
  }
  return out
}

// The unscrubbed position on a clock row's strip, for the scrubber.
function stripProgress(zone, ms) {
  var row = rowFor(zone, ms, null, null)
  if (row.strip) return row.strip.progress
  if (row.earthStrip) return row.earthStrip.progress
  return null
}

function stripPeriodMs(zone, ms) {
  var row = rowFor(zone, ms, null, null)
  return row.strip ? row.strip.periodMs : 86400000
}

// Time to move by, in minutes, to bring a strip's marker under the pointer:
// the nearest occurrence, as for a city.
function scrubDeltaMinutes(fraction, progress, periodMs) {
  var d = Math.max(0, Math.min(1, fraction)) - progress
  while (d > 0.5) d -= 1
  while (d <= -0.5) d += 1
  return d * periodMs / 60000
}

// The fictional-place row's note, or "".
function cityNote(zone, words) {
  return zone && zone.fiction ? placeNote(zone.fiction, words) : ""
}

// ---- search

// Picker options for every clock and fictional place not already on the list.
function worldOptions(existing, words) {
  var out = []
  for (var i = 0; i < CLOCKS.length; i++) {
    var c = CLOCKS[i]
    var label = clockLabel(c.clock, words)
    if (existing && Model.hasEntry(existing, "@" + c.clock, label)) continue
    out.push({ value: "@" + c.clock, label: label, region: clockRegion(c.clock, words),
               clock: c.clock, keys: (c.keys + " " + label).toLowerCase() })
  }
  for (var j = 0; j < PLACES.length; j++) {
    var p = PLACES[j]
    if (existing && Model.hasEntry(existing, p.zone, p.label)) continue
    out.push({ value: p.zone, label: p.label, region: placeRegion(p, words), lat: p.lat, lon: p.lon,
               fiction: p.slug,
               keys: ("places fiction " + p.keys + " " + p.label).toLowerCase() })
  }
  return out
}

// A fresh list gets a taste of what else is here; the rest wait in the search
// for whoever thinks to type "mars" or "trek".
var SEED_CLOCKS = ["mars/time", "fiction/kelvin"]

function seedClocks(words) {
  return SEED_CLOCKS.map(function(clock) { return { label: clockLabel(clock, words), id: "@" + clock, clock: clock } })
}

// The fictional places for the globe's jump box: they fly to the town they
// keep time with, under their own name, like any other city found there.
function placeOptions(words) {
  return worldOptions(null, words).filter(function(o) { return !!o.fiction })
}

// { exact, loose }: every word of the query must match; a clock whose
// keyword is one of the words exactly is `exact` and goes above the cities,
// so "mars" finds Mars before Marseille, while "mar" still finds Marseille first.
function searchWorlds(options, query) {
  var words = String(query || "").toLowerCase().split(/\s+/).filter(function(w) { return w !== "" })
  var exact = [], loose = []
  if (words.length === 0) return { exact: exact, loose: loose }
  for (var i = 0; i < options.length; i++) {
    var o = options[i]
    var keys = o.keys.split(/[\s,]+/)
    var all = true, whole = false
    for (var j = 0; j < words.length && all; j++) {
      if (keys.indexOf(words[j]) >= 0) whole = true
      else if (o.keys.indexOf(words[j]) < 0) all = false
    }
    if (!all) continue
    if (whole) exact.push(o)
    else loose.push(o)
  }
  return { exact: exact, loose: loose }
}

// The add-a-city list: clocks named exactly, then the cities as before, then
// clocks that only partly match. `more` counts what did not fit.
function combinedMatches(worlds, zoneOptions, query, limit) {
  var w = searchWorlds(worlds, query)
  var zones = Model.searchZones(zoneOptions, query, 100000)
  var all = w.exact.concat(zones, w.loose)
  return { matches: all.slice(0, limit), more: Math.max(0, all.length - limit) }
}

// A clock's value, for the right-hand column of the search.
function preview(clock, ms, ctx, words) {
  var row = rowFor({ label: "", id: "@" + clock, clock: clock, since: ms }, ms, ctx, words)
  return row.time
}

// `add mars/jezero` over IPC: the stored id, or "" when it is not a clock.
function clockIdFor(text) {
  var s = String(text || "").trim()
  if (s.charAt(0) === "@") s = s.slice(1)
  return clockEntry(s) ? "@" + s : ""
}

if (typeof module !== "undefined") {
  module.exports = {
    CLOCKS: CLOCKS,
    PLACES: PLACES,
    CLOCK_ID: CLOCK_ID,
    isClockId: isClockId,
    clockEntry: clockEntry,
    placeEntry: placeEntry,
    clockLabel: clockLabel,
    clockNote: clockNote,
    duration: duration,
    rowFor: rowFor,
    rows: rows,
    stripProgress: stripProgress,
    stripPeriodMs: stripPeriodMs,
    scrubDeltaMinutes: scrubDeltaMinutes,
    cityNote: cityNote,
    worldOptions: worldOptions,
    seedClocks: seedClocks,
    placeOptions: placeOptions,
    searchWorlds: searchWorlds,
    combinedMatches: combinedMatches,
    preview: preview,
    clockIdFor: clockIdFor,
    voyagerLightDay: voyagerLightDay
  }
}
