import Zones from "@/app/_lib/dhl/Zones.json";

export function getCountries() {
    return new Map(Zones);
}