import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(tz);
export const now = () => dayjs();
export function computeNextReset(timezone) {
    const z = timezone || "UTC";
    const d = dayjs().tz(z);
    const next = d.add(1, "day").startOf("day");
    return next.tz("UTC");
}
export function isPast(tsMillis) {
    return dayjs().valueOf() >= tsMillis;
}
