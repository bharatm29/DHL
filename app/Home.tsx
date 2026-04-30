'use client'

import { useState, useTransition } from "react";
import { calculateDHL } from "@/app/_lib/dhl/calculate";
import { calculateUPS } from "@/app/_lib/ups/calculate";

interface ShippingResult {
  service: string;
  transitDays: string;
  price: number;
  handover: string;
  productType: string;
}

// FIXME: export into .svg files
const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M4.40863 6.90743C4.73391 6.58215 5.2613 6.58215 5.58658 6.90743L10.4117 11.7325L15.2368 6.90743C15.562 6.58215 16.0894 6.58215 16.4147 6.90743C16.74 7.23271 16.74 7.76009 16.4147 8.08537L11.0006 13.4994C10.8444 13.6556 10.6326 13.7434 10.4117 13.7434C10.1908 13.7434 9.9789 13.6556 9.8227 13.4994L4.40863 8.08537C4.08335 7.76009 4.08335 7.23271 4.40863 6.90743Z" fill="#111113" />
  </svg>
);

const UnitSelectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.69231 3.23077C9.90651 3.23082 10.1119 3.31595 10.2633 3.46743L13.4941 6.6982C13.6412 6.85053 13.7227 7.05455 13.7208 7.26633C13.719 7.4781 13.634 7.68068 13.4843 7.83044C13.3345 7.98019 13.1319 8.06513 12.9202 8.06697C12.7084 8.06881 12.5044 7.9874 12.352 7.84027L9.69231 5.18054L7.03258 7.84027C6.88025 7.9874 6.67622 8.06881 6.46445 8.06697C6.25267 8.06513 6.0501 7.98019 5.90034 7.83044C5.75059 7.68068 5.66565 7.4781 5.66381 7.26633C5.66196 7.05455 5.74338 6.85053 5.8905 6.6982L9.12127 3.46743C9.27271 3.31595 9.47812 3.23082 9.69231 3.23077ZM5.8905 11.5444C6.04197 11.3929 6.24737 11.3079 6.46154 11.3079C6.67571 11.3079 6.88112 11.3929 7.03258 11.5444L9.69231 14.2041L12.352 11.5444C12.5044 11.3972 12.7084 11.3158 12.9202 11.3177C13.1319 11.3195 13.3345 11.4044 13.4843 11.5542C13.634 11.7039 13.7189 11.9065 13.7208 12.1183C13.7227 12.3301 13.6412 12.5341 13.4941 12.6864L10.2633 15.9172C10.1119 16.0686 9.90648 16.1537 9.69231 16.1537C9.47814 16.1537 9.27274 16.0686 9.12127 15.9172L5.8905 12.6864C5.73908 12.535 5.65402 12.3296 5.65402 12.1154C5.65402 11.9012 5.73908 11.6958 5.8905 11.5444Z" fill="#323639" />
  </svg>
);

const ExpandMoreIcon = () => (
  <svg width="32" height="32" viewBox="0 0 57 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M37.715 22.0638L28.5 31.2788L19.285 22.0638C18.3588 21.1375 16.8625 21.1375 15.9363 22.0638C15.01 22.99 15.01 24.4863 15.9363 25.4125L26.8375 36.3138C27.7638 37.24 29.26 37.24 30.1863 36.3138L41.0875 25.4125C42.0138 24.4863 42.0138 22.99 41.0875 22.0638C40.1613 21.1613 38.6413 21.1375 37.715 22.0638Z" fill="#679AC8" />
  </svg>
);

export default function Home({ zones }) {
  const countryList: string[] = Array.from(zones.keys());

  const [destinationCountry, setDestinationCountry] = useState<string>(countryList[0] ?? "");
  const [pincode, setPincode] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [product, setProduct] = useState<string>("doc");
  const [length, setLength] = useState<string>("0");
  const [width, setWidth] = useState<string>("0");
  const [height, setHeight] = useState<string>("0");
  const [weight, setWeight] = useState<string>("0");

  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ShippingResult[]>([]);
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    setResults([]); // reset before another calculation
    e.preventDefault();
    setError("");
    const calculations = [calculateDHL, calculateUPS]
    for (const calculate of calculations) {
    startTransition(async () => {
      let [service, price, calculatedWeight, err, calculatedType] = await calculate({
        country: destinationCountry,
        weight: parseFloat(weight),
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        type: product,
      });

      if (err?.length > 0) {
        setError(err);
        setResults([]);
      } else {
        setResults(values => [
          {
            service: service,
            transitDays: "N/A",
            price,
            handover: "Export",
            productType: calculatedType,
          }, ...values]);
      }
    });
    }
  };

  const handleReset = () => {
    setDestinationCountry(countryList[0] ?? "");
    setPincode("");
    setCity("");
    setState("");
    setProduct("doc");
    setLength("71");
    setWidth("71");
    setHeight("71");
    setWeight("71");
    setResults([]);
    setError("");
  };

  return (
    <div className="compare-rates-page">
      <header className="site-header">
        <div className="header-text">
          <h1 className="header-title">Compare Rates</h1>
          <p className="header-subtitle">Instantly compare rates and services</p>
        </div>
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/bef75952241f87713819441743c0194fcd51013d?width=756"
          alt="InXpress"
          className="header-logo"
        />
      </header>

      <main className="page-content">
        <form onSubmit={handleSubmit} className="shipping-form">

          {/* Row 1: Origin Country, Destination Country, Pincode */}
          <div className="form-row form-row-3col">
            <div className="form-group">
              <label className="field-label">Origin Country</label>
              <div className="select-wrapper">
                <span className="select-value">India</span>
                <ArrowDownIcon />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Destination Country</label>
              <div className="select-wrapper">
                <select
                  className="select-field"
                  value={destinationCountry}
                  onChange={e => setDestinationCountry(e.target.value)}
                  required
                >
                  {countryList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ArrowDownIcon />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Pincode</label>
              <input
                  disabled={true}
                className="text-field"
                type="text"
                placeholder="Enter Pincode"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: City, State, Product */}
          <div className="form-row form-row-3col">
            <div className="form-group">
              <label className="field-label">City</label>
              <input
                  disabled={true}
                className="text-field"
                type="text"
                placeholder="City"
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="field-label">State</label>
              <div className="select-wrapper">
                <select
                    disabled={true}
                  className="select-field"
                  value={state}
                  onChange={e => setState(e.target.value)}
                >
                  <option value="">Select State</option>
                </select>
                <ArrowDownIcon />
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Product</label>
              <div className="select-wrapper">
                <select
                  className="select-field"
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  required
                >
                  <option value="doc">DOC</option>
                  <option value="nondoc">NON-DOC</option>
                </select>
                <ArrowDownIcon />
              </div>
            </div>
          </div>

          {/* Row 3: Length, Width, Height, Weight */}
          <div className="form-row form-row-4col">
            <div className="form-group">
              <label className="field-label">Length</label>
              <div className="number-input-wrapper">
                <input
                  className="number-input-field"
                  type="number"
                  step="any"
                  min="0"
                  value={length}
                  onChange={e => setLength(e.target.value)}
                  required
                />
                <div className="unit-suffix">
                  <span className="unit-text">cm</span>
                  <UnitSelectIcon />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Width</label>
              <div className="number-input-wrapper">
                <input
                  className="number-input-field"
                  type="number"
                  step="any"
                  min="0"
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  required
                />
                <div className="unit-suffix">
                  <span className="unit-text">cm</span>
                  <UnitSelectIcon />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Height</label>
              <div className="number-input-wrapper">
                <input
                  className="number-input-field"
                  type="number"
                  step="any"
                  min="0"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  required
                />
                <div className="unit-suffix">
                  <span className="unit-text">cm</span>
                  <UnitSelectIcon />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="field-label">Weight</label>
              <div className="number-input-wrapper">
                <input
                  className="number-input-field"
                  type="number"
                  step="any"
                  min="0"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                />
                <div className="unit-suffix">
                  <span className="unit-text">Kg</span>
                  <UnitSelectIcon />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={isPending}>
              {isPending ? "Calculating..." : "Submit"}
            </button>
            <button type="button" className="btn-reset" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>

        {error && (
          <p className="error-message">{error}</p>
        )}

        {results.length > 0 && (
          <div className="results-section">
            <div className="results-table-header">
              <span className="col-service">Service</span>
              <span className="col-transit">Type</span>
              <span className="col-price">Est. Price</span>
              <span className="col-handover">Handover</span>
            </div>

            {results.map((row, idx) => (
              <div key={idx} className="results-table-row">
                <span className="col-service row-text">{row.service}</span>
                <span className="col-transit row-text">{row.productType}</span>
                <span className="col-price row-text">INR {row.price}</span>{/*FIXME: figure out alternative to toFixed()*/}
                <span className="col-handover row-text">{row.handover}</span>
                <button className="btn-ship-now">Ship Now</button>
                <span className="expand-icon">
                  <ExpandMoreIcon />
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
