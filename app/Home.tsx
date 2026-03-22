'use client'

import {useState, useTransition} from "react";
import {calculate} from "@/app/_lib/calculate";

function getNumber(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>, prevState: string) {
    // empty string results in NaN, thus we do this fuckery :(
    // return e.target.value.length <= 0 ? prevState : Number.parseFloat(e.target.value);
    return e.target.value;
}

export default function Home({zones}) {
    const [country, setCountry] = useState<string>(zones.keys().next().value); // FIXME: (getting first key) -> maybe doesn't work like this?
    const [weight, setWeight] = useState<string>(0.0);
    const [length, setLength] = useState<string>(0.0);
    const [width, setWidth] = useState<string>(0.0);
    const [height, setHeight] = useState<string>(0.0);
    const [type, setType] = useState<string>("doc");

    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleSubmit = (e) => {
        e.preventDefault();
        startTransition(async () => {
            const [price, calculatedWeight, error, calculatedType] = await calculate({
                country: country,
                weight: (+weight),
                length: (+length),
                width: (+width),
                height: (+height),
                type
            });

            if (error.length === 0) {
                setResult(_ => `Cost for: ${calculatedType} is ${price} with ${calculatedWeight}kg(s)`);
            } else {
                setError(_ => error);
            }
        });
    };

    return (
        <div>
            <main>
                {error.length !== 0 && <h3 className={"text-red-500 font-bold text-xl"}>{error}</h3>}
                <form id="countryForm" onSubmit={handleSubmit}>
                    <select id="country" value={country}
                            onChange={e => setCountry(e.target.value)}
                            required>
                        {
                            Array.from(zones.keys()).map((country) => {
                                return <option key={country} value={country}>{country}</option>;
                            })
                        }
                    </select>
                    <br/>
                    Enter Weight:- <input required type="number" step="any" value={weight} onChange={(e) => {
                    setWeight(prevState => getNumber(e, prevState))
                }}/>
                    <br/>
                    Enter Length:- <input required type="number" step="any" value={length} onChange={(e) => {
                    setLength(prevState => getNumber(e, prevState))
                }}/>
                    <br/>
                    Enter Width:- <input required type="number" step="any" value={width} onChange={(e) => {
                    setWidth(prevState => getNumber(e, prevState))
                }}/>
                    <br/>
                    Enter Height:- <input required type="number" step="any" value={height} onChange={(e) => {
                    setHeight(prevState => getNumber(e, prevState))
                }}/>
                    <br/>

                    <select id="type" value={type} onChange={e => setType(_ => e.target.value)} required>
                        <option value="doc">DOC</option>
                        <option value="nondoc">NON-DOC</option>
                    </select>

                    <input type="submit" value="Calculate"/><br/>
                </form>

                <h4 id="result">
                    {isPending ? "Calculating..." : result}
                </h4>
            </main>
        </div>
    );
}
