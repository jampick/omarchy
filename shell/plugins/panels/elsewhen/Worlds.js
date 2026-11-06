// Clocks that are not a place on Earth's zone map: Mars, the Moon, deep space,
// odd ways of keeping Earth's time, and calendars from fiction. Every one is a
// function of the UTC instant alone, so none of them needs the `date` probe,
// the network or a timer of its own; they tick with the rows around them.
//
// Each function here returns plain numbers and strings, in English; the row
// model in Elsewhere.js decides what goes where on a row.

var DAY_MS = 86400000
var J2000 = 2451545.0
var DEG = Math.PI / 180

function julianDay(ms) {
  return Number(ms) / DAY_MS + 2440587.5
}

function mod(a, n) {
  return ((a % n) + n) % n
}

function pad(n, width) {
  var s = String(Math.floor(Math.abs(n)))
  while (s.length < (width || 2)) s = "0" + s
  return s
}

// ---- time scales

// TAI - UTC in seconds: every leap second since 1999. The IERS announces each
// one six months ahead; a new one is a one-line change here.
var LEAP_SECONDS = [
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37]
]

function taiMinusUtc(ms) {
  var out = LEAP_SECONDS[0][1]
  for (var i = 0; i < LEAP_SECONDS.length; i++) if (Number(ms) >= LEAP_SECONDS[i][0]) out = LEAP_SECONDS[i][1]
  return out
}

// GPS time was TAI - 19s at its 1980 epoch and never takes a leap second.
function gpsMinusUtc(ms) { return taiMinusUtc(ms) - 19 }

// Terrestrial Time, which the planetary formulas below are written in.
function terrestrialJulianDay(ms) {
  return julianDay(ms) + (taiMinusUtc(ms) + 32.184) / 86400
}

// ---- Mars (Allison & McEwen 2000, the Mars24 algorithm)

var MARS_SOL_RATIO = 1.0274912517
var MARS_SOL_MS = DAY_MS * MARS_SOL_RATIO

function marsSolDate(ms) {
  return (terrestrialJulianDay(ms) - 2405522.0028779) / MARS_SOL_RATIO
}

// Mean solar hours, 0..24, at an east longitude; 0 is Airy-0, Mars's Greenwich.
function marsMeanSolarHours(ms, eastLon) {
  return mod(24 * marsSolDate(ms) + (eastLon || 0) / 15, 24)
}

// Areocentric solar longitude, the angle that names Mars's seasons: 0 is the
// northern spring equinox, 90 summer solstice, 180 autumn, 270 winter.
var MARS_PBS = [
  [0.0071, 2.2353, 49.409],
  [0.0057, 2.7543, 168.173],
  [0.0039, 1.1177, 191.837],
  [0.0037, 15.7866, 21.736],
  [0.0021, 2.1354, 15.704],
  [0.0020, 2.4694, 95.528],
  [0.0018, 32.8493, 49.095]
]

// { ls, center }: the solar longitude and the equation of center, which the
// Mars equation of time needs too.
function marsOrbit(ms) {
  var dt = terrestrialJulianDay(ms) - J2000
  var M = (19.3871 + 0.52402073 * dt) * DEG
  var alpha = 270.3871 + 0.524038496 * dt
  var pbs = 0
  for (var i = 0; i < MARS_PBS.length; i++)
    pbs += MARS_PBS[i][0] * Math.cos((0.985626 * dt / MARS_PBS[i][1] + MARS_PBS[i][2]) * DEG)
  var center = (10.691 + 3.0e-7 * dt) * Math.sin(M) + 0.623 * Math.sin(2 * M)
    + 0.050 * Math.sin(3 * M) + 0.005 * Math.sin(4 * M) + 0.0005 * Math.sin(5 * M) + pbs
  return { ls: mod(alpha + center, 360), center: center }
}

function marsSolarLongitude(ms) {
  return marsOrbit(ms).ls
}

// Sunrise and sunset in local mean solar hours at a latitude and east
// longitude, for the sol containing `ms` (Mars24 declination and equation of
// time; the horizon is the geometric one, as Mars has next to no refraction).
// Null in polar day or night.
function marsSunHours(ms, lat) {
  var orbit = marsOrbit(ms)
  var ls = orbit.ls * DEG
  var dec = Math.asin(0.42565 * Math.sin(ls)) + 0.25 * DEG * Math.sin(ls)
  var eot = 2.861 * Math.sin(2 * ls) - 0.071 * Math.sin(4 * ls) + 0.002 * Math.sin(6 * ls) - orbit.center
  var cosH = -Math.tan(lat * DEG) * Math.tan(dec)
  if (cosH <= -1) return { kind: "polarDay" }
  if (cosH >= 1) return { kind: "polarNight" }
  var half = Math.acos(cosH) / DEG / 15
  var noon = 12 - eot / 15
  return { kind: "normal", rise: mod(noon - half, 24), set: mod(noon + half, 24) }
}

// Clancy's Mars Year numbering: year 1 began at the equinox of 11 April 1955.
// The count of years is the mean year's; the boundary is the true equinox.
var MARS_YEAR_DAYS = 686.9725
var MARS_YEAR_ONE_JD = 2435208.5

function marsYear(ms) {
  var jd = julianDay(ms)
  var ls = marsSolarLongitude(ms)
  var guess = Math.floor((jd - MARS_YEAR_ONE_JD) / MARS_YEAR_DAYS) + 1
  // Within a few days of the boundary the mean count and the equinox can disagree.
  var into = mod(jd - MARS_YEAR_ONE_JD, MARS_YEAR_DAYS) / MARS_YEAR_DAYS
  if (into > 0.9 && ls < 30) guess++
  else if (into < 0.1 && ls > 330) guess--
  return guess
}

// Northern-hemisphere season, from Ls.
function marsSeason(ls) {
  var names = ["spring", "summer", "autumn", "winter"]
  return names[Math.floor(mod(ls, 360) / 90)]
}

// A rover's mission sol: the landing sol is sol 0, counted in its own local mean time.
function missionSol(ms, eastLon, landingMs) {
  var at = function(t) { return Math.floor(marsSolDate(t) + eastLon / 360) }
  return at(ms) - at(landingMs)
}

// ---- the Darian calendar (Gangale), Mars's own months

var DARIAN_MONTHS = [
  "Sagittarius", "Dhanus", "Capricornus", "Makara", "Aquarius", "Kumbha",
  "Pisces", "Mina", "Aries", "Mesha", "Taurus", "Rishabha",
  "Gemini", "Mithuna", "Cancer", "Karka", "Leo", "Simha",
  "Virgo", "Kanya", "Libra", "Tula", "Scorpius", "Vrishika"
]
var DARIAN_WEEKDAYS = ["Solis", "Lunae", "Martis", "Mercurii", "Jovis", "Veneris", "Saturni"]
// Sol 0 of year 0 in Mars Sol Dates: the Telescopic Epoch, 1609.
var DARIAN_EPOCH_MSD = -94129

function darianYearLength(year) {
  var leap = (year % 2 === 1) || (year % 10 === 0 && (year % 100 !== 0 || year % 500 === 0))
  return leap ? 669 : 668
}

var DARIAN_CYCLE = (function() {
  var n = 0
  for (var y = 0; y < 500; y++) n += darianYearLength(y)
  return n
})()

function darianDate(ms) {
  var sols = Math.floor(marsSolDate(ms) - DARIAN_EPOCH_MSD)
  // Whole 500-year cycles first, so the loop below stays short.
  var cycle = DARIAN_CYCLE
  var year = 500 * Math.floor(sols / cycle)
  var rest = mod(sols, cycle)
  while (rest >= darianYearLength(year)) { rest -= darianYearLength(year); year++ }
  // Twenty-four months of 28 sols, every sixth one a sol short; the last
  // month gets its 28th sol back in a leap year.
  var month = 0
  for (;;) {
    var length = (month + 1) % 6 === 0 && !(month === 23 && darianYearLength(year) === 669) ? 27 : 28
    if (rest < length || month === 23) break
    rest -= length
    month++
  }
  return {
    year: year,
    month: month,
    monthName: DARIAN_MONTHS[month],
    sol: rest + 1,
    weekday: DARIAN_WEEKDAYS[rest % 7]
  }
}

// ---- planets, for light time

// Keplerian elements and rates per Julian century (Standish, JPL, 1800-2050).
var ORBITS = {
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668,
          100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131,
         -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343]
}

// Heliocentric ecliptic position in AU.
function planetPosition(name, ms) {
  var el = ORBITS[name]
  var T = (terrestrialJulianDay(ms) - J2000) / 36525
  var a = el[0] + el[1] * T
  var e = el[2] + el[3] * T
  var I = (el[4] + el[5] * T) * DEG
  var L = el[6] + el[7] * T
  var peri = el[8] + el[9] * T
  var node = el[10] + el[11] * T
  var M = mod(L - peri + 180, 360) - 180
  var E = M * DEG
  for (var i = 0; i < 8; i++) E = E - (E - e * Math.sin(E) - M * DEG) / (1 - e * Math.cos(E))
  var xp = a * (Math.cos(E) - e)
  var yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  var w = (peri - node) * DEG
  var O = node * DEG
  var cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I)
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: (sw * sI) * xp + (cw * sI) * yp
  }
}

// Voyager 1 is coasting in a straight line now, near enough: JPL Horizons'
// heliocentric ecliptic position for 2026-12-31 and its yearly motion,
// fitted over 2024-2029, where it holds to a few thousand kilometres.
var VOYAGER1_AT_MS = Date.UTC(2026, 11, 31)
var VOYAGER1_AT = { x: -32.27178500, y: -137.53996909, z: 99.51194611 }
var VOYAGER1_PER_YEAR = { x: -0.43706, y: -2.86924, z: 2.07359 }

function voyagerPosition(ms) {
  var years = (Number(ms) - VOYAGER1_AT_MS) / (365.25 * DAY_MS)
  return {
    x: VOYAGER1_AT.x + VOYAGER1_PER_YEAR.x * years,
    y: VOYAGER1_AT.y + VOYAGER1_PER_YEAR.y * years,
    z: VOYAGER1_AT.z + VOYAGER1_PER_YEAR.z * years
  }
}

var LIGHT_SECONDS_PER_AU = 499.004783836

function distanceAu(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// One-way light time from Earth, in seconds.
function lightSecondsTo(target, ms) {
  var earth = planetPosition("earth", ms)
  var there = target === "voyager1" ? voyagerPosition(ms) : planetPosition(target, ms)
  return distanceAu(earth, there) * LIGHT_SECONDS_PER_AU
}

// ---- the Moon

// Lunar local solar time at an east selenographic longitude, as a fraction of
// the lunar day (0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset), from the
// mean phase: at new moon the sun is overhead on the far side, at full moon
// on the near side's central meridian. Libration moves the real terminator by
// a few degrees, which at the Moon's pace is several hours; this is the mean.
function lunarDayFraction(phase, eastLon) {
  var subsolar = 180 - 360 * Number(phase)
  return mod(0.5 + (eastLon - subsolar) / 360, 1)
}

// ---- sidereal time

// Greenwich mean sidereal time in hours (IAU 1982).
function gmstHours(ms) {
  var d = julianDay(ms) - J2000
  var T = d / 36525
  var deg = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000
  return mod(deg, 360) / 15
}

function localSiderealHours(ms, eastLon) {
  return mod(gmstHours(ms) + (eastLon || 0) / 15, 24)
}

// ---- Earth time, written differently

// Swatch Internet Time: the day in 1000 beats, on Biel Mean Time (UTC+1, no DST).
function swatchBeats(ms) {
  return mod((Number(ms) + 3600000) / 86400, 1000)
}

// Decimal time: ten hours of a hundred minutes of a hundred seconds, from midnight.
function decimalTime(dayFraction) {
  var total = Math.floor(mod(dayFraction, 1) * 100000)
  return { hour: Math.floor(total / 10000), minute: Math.floor(total / 100) % 100, second: total % 100 }
}

// The French Republican calendar: Year I began 22 September 1792,
// twelve months of thirty days and five or six complementary days.
var REPUBLICAN_MONTHS = [
  "Vendémiaire", "Brumaire", "Frimaire", "Nivôse", "Pluviôse", "Ventôse",
  "Germinal", "Floréal", "Prairial", "Messidor", "Thermidor", "Fructidor"
]
var REPUBLICAN_EPOCH_JDN = 2375840  // 22 September 1792

// The years the Republic itself ran as sextile, by the equinox, then Romme's
// Gregorian-style rule from Year XX, where he proposed it start.
function republicanLeap(year) {
  if (year < 20) return year === 3 || year === 7 || year === 11 || year === 15
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function republicanDate(dayNumber) {
  var days = dayNumber - REPUBLICAN_EPOCH_JDN
  var year = 1
  for (;;) {
    var length = republicanLeap(year) ? 366 : 365
    if (days < length) break
    days -= length
    year++
  }
  if (days >= 360) return { year: year, month: 12, day: days - 359, monthName: "Sansculottides" }
  return { year: year, month: Math.floor(days / 30), day: days % 30 + 1, monthName: REPUBLICAN_MONTHS[Math.floor(days / 30)] }
}

function romanNumeral(n) {
  var table = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
               [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  var out = ""
  for (var i = 0; i < table.length; i++) while (n >= table[i][0]) { out += table[i][1]; n -= table[i][0] }
  return out
}

// The Maya Long Count under the GMT correlation (584283), with the Tzolk'in and Haab'.
var MAYA_CORRELATION = 584283
var TZOLKIN_NAMES = ["Imix", "Ik'", "Ak'b'al", "K'an", "Chikchan", "Kimi", "Manik'", "Lamat", "Muluk", "Ok",
  "Chuwen", "Eb'", "B'en", "Ix", "Men", "K'ib'", "Kab'an", "Etz'nab'", "Kawak", "Ajaw"]
var HAAB_NAMES = ["Pop", "Wo'", "Sip", "Sotz'", "Sek", "Xul", "Yaxk'in", "Mol", "Ch'en", "Yax",
  "Sak'", "Keh", "Mak", "K'ank'in", "Muwan", "Pax", "K'ayab", "Kumk'u", "Wayeb'"]

function mayaDate(dayNumber) {
  var days = dayNumber - MAYA_CORRELATION
  var units = [144000, 7200, 360, 20, 1]
  var count = []
  var rest = days
  for (var i = 0; i < units.length; i++) { count.push(Math.floor(rest / units[i])); rest = mod(rest, units[i]) }
  var haab = mod(days + 348, 365)
  return {
    longCount: count.join("."),
    tzolkin: (mod(days + 3, 13) + 1) + " " + TZOLKIN_NAMES[mod(days + 19, 20)],
    haab: (haab % 20) + " " + HAAB_NAMES[Math.floor(haab / 20)]
  }
}

// The Julian Day Number of the civil day containing an instant at a UTC offset.
function dayNumber(ms, offsetMinutes) {
  return Math.floor(julianDay(Number(ms) + (offsetMinutes || 0) * 60000) + 0.5)
}

// ---- the Shire (Tolkien, The Lord of the Rings, Appendix D)

// Twelve months of thirty days, two Yuledays at the turn of the year and the
// Lithedays at midsummer. Tolkien put the Shire's new year about ten days
// before ours; 2 Yule, the first day, falls on 22 December.
var SHIRE_MONTHS = ["Afteryule", "Solmath", "Rethe", "Astron", "Thrimidge", "Forelithe",
  "Afterlithe", "Wedmath", "Halimath", "Winterfilth", "Blotmath", "Foreyule"]
var SHIRE_WEEKDAYS = ["Sterday", "Sunday", "Monday", "Trewsday", "Hevensday", "Mersday", "Highday"]

function gregorianLeap(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

// `parts`: a civil date { year, month (0-11), day }.
function shireDate(parts) {
  var startYear = parts.month === 11 && parts.day >= 22 ? parts.year : parts.year - 1
  var start = Date.UTC(startYear, 11, 22)
  var n = Math.round((Date.UTC(parts.year, parts.month, parts.day) - start) / DAY_MS)  // 0 = 2 Yule
  // The Shire's leap day, Overlithe, falls in our next year's June.
  var leap = gregorianLeap(startYear + 1)
  var out = { name: "", weekday: "" }
  // Mid-year's Day and Overlithe belong to no week; every year starts on a Sterday.
  var weekIndex = n
  if (n === 0) out.name = "2 Yule"
  else if (n <= 180) out.name = ((n - 1) % 30 + 1) + " " + SHIRE_MONTHS[Math.floor((n - 1) / 30)]
  else if (n === 181) out.name = "1 Lithe"
  else if (n === 182) { out.name = "Mid-year's Day"; weekIndex = -1 }
  else if (leap && n === 183) { out.name = "Overlithe"; weekIndex = -1 }
  else {
    var after = n - (leap ? 184 : 183)
    if (after === 0) out.name = "2 Lithe"
    else if (after <= 180) out.name = ((after - 1) % 30 + 1) + " " + SHIRE_MONTHS[6 + Math.floor((after - 1) / 30)]
    else out.name = "1 Yule"
    weekIndex = n - (leap ? 2 : 1)
  }
  if (weekIndex >= 0) out.weekday = SHIRE_WEEKDAYS[weekIndex % 7]
  return out
}

// ---- Tamriel (The Elder Scrolls)

// Its months line up with ours one for one, and so do its weekdays. The year
// is Skyrim's: 4E 201 was 2011, the year the game came out.
var TAMRIEL_MONTHS = ["Morning Star", "Sun's Dawn", "First Seed", "Rain's Hand", "Second Seed", "Midyear",
  "Sun's Height", "Last Seed", "Hearthfire", "Frostfall", "Sun's Dusk", "Evening Star"]
var TAMRIEL_WEEKDAYS = ["Sundas", "Morndas", "Tirdas", "Middas", "Turdas", "Fredas", "Loredas"]

function ordinal(n) {
  var s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"
  return n + s
}

function tamrielDate(parts) {
  return {
    weekday: TAMRIEL_WEEKDAYS[parts.weekday],
    name: ordinal(parts.day) + " of " + TAMRIEL_MONTHS[parts.month],
    year: "4E " + (201 + parts.year - 2011)
  }
}

// ---- the Imperium (Warhammer 40,000)

// "0 845 026.M3": a check number (0 for a date recorded on Terra itself), the
// year in thousandths, the year of the millennium, and the millennium.
function imperialDate(ms) {
  var d = new Date(Number(ms))
  var year = d.getUTCFullYear()
  var start = Date.UTC(year, 0, 1)
  var fraction = Math.floor((Number(ms) - start) / (Date.UTC(year + 1, 0, 1) - start) * 1000)
  return "0 " + pad(fraction, 3) + " " + pad(year % 1000, 3) + ".M" + (Math.floor(year / 1000) + 1)
}

// ---- Star Trek

function dayOfYear(parts) {
  return Math.round((Date.UTC(parts.year, parts.month, parts.day) - Date.UTC(parts.year, 0, 1)) / DAY_MS) + 1
}

// The Kelvin films' rule, the only one the films ever state: year, then day of year.
function kelvinStardate(parts) {
  return parts.year + "." + pad(dayOfYear(parts), 3)
}

// The Next Generation never fixed a formula. This is the common fan one: a
// thousand units a year, with 2323 as zero, which puts today well below it.
function tngStardate(ms) {
  var d = new Date(Number(ms))
  var year = d.getUTCFullYear()
  var start = Date.UTC(year, 0, 1)
  var fraction = (Number(ms) - start) / (Date.UTC(year + 1, 0, 1) - start)
  return 1000 * (year - 2323 + fraction)
}

// ---- Star Wars

// The Galactic Standard Calendar: a 368-day year of 24-hour days. Year 0 ABY
// is taken to begin on 25 May 1977, the day the first film opened.
var GSC_EPOCH_MS = Date.UTC(1977, 4, 25)

function galacticDate(ms) {
  var days = Math.floor((Number(ms) - GSC_EPOCH_MS) / DAY_MS)
  var year = Math.floor(days / 368)
  return { year: year, day: mod(days, 368) + 1, era: year >= 0 ? "ABY" : "BBY" }
}

// ---- Westeros and Arrakis: anchored years only

// The show began in 298 AC in 2011.
function westerosYear(parts) { return 298 + parts.year - 2011 }

// Dune opens in 10191 AG and was published in 1965.
function duneYear(parts) { return 10191 + parts.year - 1965 }

// ---- rate clocks

var YEAR_MS = 365.25 * DAY_MS

// How much time has passed in a world running at `rate` times ours since `sinceMs`.
function elapsedAtRate(ms, sinceMs, rate) {
  return Math.max(0, Number(ms) - Number(sinceMs)) * rate
}

// Miller's planet: an hour there is seven years here.
var MILLER_RATE = 3600000 / (7 * YEAR_MS)
// Narnia: Lewis's own timeline runs 2,555 Narnian years over Earth's 1900-1949.
var NARNIA_RATE = 2555 / 49
// Inception: each dream level runs twenty times the one above it.
var DREAM_RATE = 20

if (typeof module !== "undefined") {
  module.exports = {
    julianDay: julianDay,
    taiMinusUtc: taiMinusUtc,
    gpsMinusUtc: gpsMinusUtc,
    terrestrialJulianDay: terrestrialJulianDay,
    MARS_SOL_MS: MARS_SOL_MS,
    marsSolDate: marsSolDate,
    marsMeanSolarHours: marsMeanSolarHours,
    marsSolarLongitude: marsSolarLongitude,
    marsSunHours: marsSunHours,
    marsYear: marsYear,
    marsSeason: marsSeason,
    missionSol: missionSol,
    darianDate: darianDate,
    planetPosition: planetPosition,
    voyagerPosition: voyagerPosition,
    lightSecondsTo: lightSecondsTo,
    lunarDayFraction: lunarDayFraction,
    gmstHours: gmstHours,
    localSiderealHours: localSiderealHours,
    swatchBeats: swatchBeats,
    decimalTime: decimalTime,
    republicanDate: republicanDate,
    romanNumeral: romanNumeral,
    mayaDate: mayaDate,
    dayNumber: dayNumber,
    shireDate: shireDate,
    tamrielDate: tamrielDate,
    imperialDate: imperialDate,
    dayOfYear: dayOfYear,
    kelvinStardate: kelvinStardate,
    tngStardate: tngStardate,
    galacticDate: galacticDate,
    westerosYear: westerosYear,
    duneYear: duneYear,
    elapsedAtRate: elapsedAtRate,
    MILLER_RATE: MILLER_RATE,
    NARNIA_RATE: NARNIA_RATE,
    DREAM_RATE: DREAM_RATE,
    YEAR_MS: YEAR_MS
  }
}
