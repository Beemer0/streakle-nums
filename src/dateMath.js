// Calendar arithmetic on YYYY-MM-DD strings, in UTC so DST can't skew a day.
export const dateDay = (ds) => Date.UTC(+ds.slice(0, 4), +ds.slice(5, 7) - 1, +ds.slice(8, 10)) / 864e5
export const addDays = (ds, n) => new Date((dateDay(ds) + n) * 864e5).toISOString().slice(0, 10)
