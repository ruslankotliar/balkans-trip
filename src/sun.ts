/**
 * Sunrise and sunset for a point and a calendar day - the NOAA/Wikipedia
 * "sunrise equation", accurate to a minute or two, computed on the phone so it
 * works with no signal. Checked against the times in the Albania plan
 * (Shengjin 12 Sep sunset 18:58, Theth 15 Sep sunrise 06:20 / sunset 18:52).
 */
const RAD = Math.PI / 180;

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export function sunTimes(lat: number, lng: number, date: Date): SunTimes | null {
  // Julian day at 0h UTC of the local calendar date.
  const jd0 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000 + 2440587.5;
  const n = Math.ceil(jd0 - 2451545.0 + 0.0008);
  const jStar = n - lng / 360; // mean solar time, east longitude positive
  const M = (((357.5291 + 0.98560028 * jStar) % 360) + 360) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (((M + C + 180 + 102.9372) % 360) + 360) % 360;
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const dec = Math.asin(sinDec);
  const cosW =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null; // polar day / night
  const w = Math.acos(cosW) / RAD;
  const toDate = (j: number) => new Date((j - 2440587.5) * 86400000);
  return { sunrise: toDate(jTransit - w / 360), sunset: toDate(jTransit + w / 360) };
}

/** "18:58" in the phone's local time. */
export function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
