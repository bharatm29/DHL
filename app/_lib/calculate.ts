'use server';

import {getCountries, readFile} from "@/app/_lib/dhl/util";

const MAX_DOC_WEIGHT = 2.0;
const MAX_NON_DOC_WEIGHT = 30.0;

function deserializeMap(json) {
    return JSON.parse(json, (key, value) => {
        if (value && value.__type === "Map") {
            return new Map(value.value);
        }
        return value;
    });
}

function calculateWeight(data): number {
    const length = data.length;
    const width = data.width;
    const height = data.height;

    const volumetricWeight = (length * width * height) / 5000.0;

    return Math.max(data.weight, volumetricWeight);
}

function findNearest(weight: number, weights) {
    //FIXME: Assuming it cannot be more than 500kg
    for (let w of weights) {
        if (weight <= w) return w;
    }
}

export async function calculate(data: {
    country: string,
    weight: number,
    length: number,
    height: number,
    width: number,
    type: string
}): Promise<[result: number, weight: number, error: string, calculatedType: string]> {
    if (data.weight === 0 || data.length === 0 || data.width === 0 || data.height === 0) {
        return [-1, -1, "0 value for properties", ""];
    }

    // FIXME: exclusively for DHL sheets
    // FIXME: Right now only doing FranchiseCost - Export
    const zones = getCountries()
    const name = data.country
    if (!zones.has(name)) {
        return [-1, -1, "Couldn't find country", ""];
    }

    const obj = zones.get(name);
    const zone = obj.zone.trim();

    const filename = "FranchiseExport"; // FIXME: must be passed from high up!
    const doc = deserializeMap(readFile(`${filename}/doc.json`));
    const nondoc = deserializeMap(readFile(`${filename}/non-doc.json`));
    const multiplierWeights = JSON.parse(readFile(`${filename}/multiplier.json`));

    const weight = calculateWeight(data);
    if (weight >= 500.1) {
        return [-1, -1, "Shipment cannot be more than 500.1kg", ""];
    }

    let rounded = 0.0;
    // FIXME: need more robust logic
    if (weight <= 20.0) {
        rounded = +((Math.ceil(weight / 0.5) * 0.5).toFixed(1));
        // console.log(rounded.toString());
    } else if (weight <= 30.0) {
        rounded = +(Math.ceil(weight).toFixed(1));
    } else {
        rounded = findNearest(weight, multiplierWeights);
        // FIXME: [find per kilo using multiplier (need to parse them)] -> maybe done??
    }

    let result = 0.0;
    let calculatedUnder = "non-doc";
    if (data.type == "doc" && rounded <= MAX_DOC_WEIGHT) {
        calculatedUnder = "doc";
        result = doc.get(rounded.toFixed(1)).get(zone);
    } else if (rounded <= MAX_NON_DOC_WEIGHT) {
        console.log(`SEEMA CROSSED FOR DOC: ${rounded} > ${MAX_DOC_WEIGHT}, calculating non-doc`);
        result = nondoc.get(rounded.toFixed(1)).get(zone);
    } else {
        calculatedUnder = "non-doc (multiplier)"
        result = nondoc.get(rounded.toString()).get(zone) * weight;
    }

    return [result, rounded, "", calculatedUnder];
}