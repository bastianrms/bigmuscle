"use client";

import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type Props = {
  labelCountry?: string;
  labelCity?: string;
  placeholderCountry?: string;
  placeholderCity?: string;

  // Nur Styling / Layout
  wrapperClassName?: string;
  fieldWrapperClassName?: string;
  innerWrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  suggestionsContainerClassName?: string;
  suggestionListClassName?: string;
  suggestionItemClassName?: string;
  helperTextClassName?: string;
  errorClassName?: string;
};

type CountryRow = {
  code: string;
  name_en: string | null;
};

type CityRow = {
  geoname_id: number;
  name: string;
  ascii_name: string | null;
};

export type LocationSelectActions = {
  saveLocation: (userId: string) => Promise<void>;
};

const LocationSelect = forwardRef<LocationSelectActions, Props>(
  (
    {
      labelCountry = "Country",
      labelCity = "City",
      placeholderCountry = "Select country…",
      placeholderCity = "Start typing a city…",
      wrapperClassName,
      fieldWrapperClassName,
      innerWrapperClassName,
      labelClassName,
      inputClassName,
      suggestionsContainerClassName,
      suggestionListClassName,
      suggestionItemClassName,
      helperTextClassName,
      errorClassName,
    },
    ref
  ) => {
    const [countries, setCountries] = useState<CountryRow[]>([]);
    const [countryInput, setCountryInput] = useState("");
    const [countrySuggestions, setCountrySuggestions] = useState<CountryRow[]>(
      []
    );

    // was der Nutzer letztlich "gewählt" hat
    const [selectedCountryCode, setSelectedCountryCode] = useState<
      string | null
    >(null);
    const [selectedCountryName, setSelectedCountryName] = useState<
      string | null
    >(null);

    const [cityInput, setCityInput] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<CityRow[]>([]);

    // "schöne" Stadt + technische ID
    const [selectedCityName, setSelectedCityName] = useState<string | null>(
      null
    );
    const [selectedCityGeonameId, setSelectedCityGeonameId] = useState<
      number | null
    >(null);

    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cityInputRef = useRef<HTMLInputElement | null>(null);

    // Länder laden
    useEffect(() => {
      async function loadCountries() {
        if (!supabaseClient) {
          console.error("supabaseClient not configured");
          return;
        }
        const { data, error } = await supabaseClient
          .from("countries")
          .select("code, name_en")
          .order("name_en", { ascending: true });

        if (error) {
          console.error("Error loading countries", error);
          setError("Could not load countries");
          return;
        }

        setCountries(
          (data ?? []).map((row) => ({
            code: row.code,
            name_en: row.name_en ?? row.code,
          }))
        );
      }

      loadCountries();
    }, []);

    // 👉 Action für Plasmic: wird vom Button via „Run element action“ getriggert
    useImperativeHandle(
      ref,
      () => ({
        async saveLocation(userId: string) {
          console.log("[LocationSelect.saveLocation] called with:", {
            userId,
            selectedCountryCode,
            selectedCountryName,
            selectedCityName,
            selectedCityGeonameId,
          });

          if (!supabaseClient) {
            console.error("[LocationSelect.saveLocation] supabaseClient missing");
            return;
          }
          if (!userId) {
            console.warn("[LocationSelect.saveLocation] no userId passed");
            return;
          }

          const { error } = await supabaseClient
            .from("users")
            .update({
              // “schöne” Labels
              country: selectedCountryName ?? null,
              city: selectedCityName ?? null,

              // technische Felder für FK / Geo
              country_code: selectedCountryCode ?? null,
              city_geoname_id: selectedCityGeonameId,
            })
            .eq("user_id", userId);

          if (error) {
            console.error("[LocationSelect.saveLocation] update failed:", error);
          } else {
            console.log("[LocationSelect.saveLocation] update OK ✅");
          }
        },
      }),
      [
        selectedCountryCode,
        selectedCountryName,
        selectedCityName,
        selectedCityGeonameId,
      ]
    );

    // Country input change (Tippen)
    function handleCountryChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.target.value;
      setCountryInput(value);

      // wir merken uns den Label-Wert (falls Nutzer nicht auf Dropdown klickt)
      setSelectedCountryName(value || null);

      // Stadt resetten, Code resetten
      setSelectedCountryCode(null);
      setSelectedCityName(null);
      setSelectedCityGeonameId(null);
      setCityInput("");
      setCitySuggestions([]);

      if (value.trim().length < 2) {
        setCountrySuggestions([]);
        return;
      }

      const lower = value.toLowerCase();
      const matches = countries
        .filter((c) => (c.name_en ?? c.code).toLowerCase().startsWith(lower))
        .slice(0, 5);

      setCountrySuggestions(matches);
    }

    // Country suggestion select
    function handleCountrySelect(country: CountryRow) {
      const displayName = country.name_en ?? country.code;

      setCountryInput(displayName);
      setSelectedCountryCode(country.code);
      setSelectedCountryName(displayName);
      setCountrySuggestions([]);

      // City reset
      setSelectedCityName(null);
      setSelectedCityGeonameId(null);
      setCityInput("");
      setCitySuggestions([]);

      if (cityInputRef.current) {
        cityInputRef.current.focus();
      }
    }

    // City input change mit Supabase-Abfrage
    async function handleCityChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.target.value;
      setCityInput(value);
      setSelectedCityName(value || null);
      setSelectedCityGeonameId(null);
      setCitySuggestions([]);

      if (!selectedCountryCode) {
        return;
      }
      if (value.trim().length < 2) {
        return;
      }
      if (!supabaseClient) {
        console.error("supabaseClient not configured");
        return;
      }

      try {
        setIsLoadingCities(true);
        const prefix = value.trim();

        const { data, error } = await supabaseClient
          .from("world_cities")
          .select("geoname_id, name, ascii_name")
          .eq("country_code", selectedCountryCode)
          .or(`ascii_name.ilike.${prefix}%,name.ilike.${prefix}%`)
          .order("population", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error loading cities", error);
          setError("Could not load cities");
          return;
        }

        setCitySuggestions(
          (data ?? []).map((row) => ({
            geoname_id: row.geoname_id,
            name: row.name,
            ascii_name: row.ascii_name,
          }))
        );
      } finally {
        setIsLoadingCities(false);
      }
    }

    // City suggestion select
    function handleCitySelect(city: CityRow) {
      const displayName = city.ascii_name ?? city.name;

      setCityInput(displayName);
      setSelectedCityName(city.name); // “echter” Name
      setSelectedCityGeonameId(city.geoname_id);
      setCitySuggestions([]);
    }

    return (
      <div className={wrapperClassName}>
        {/* COUNTRY */}
        <div className={fieldWrapperClassName}>
          {labelCountry && (
            <label className={labelClassName}>{labelCountry}</label>
          )}
          <div className={innerWrapperClassName}>
            <input
              type="text"
              value={countryInput}
              onChange={handleCountryChangeInput}
              placeholder={placeholderCountry}
              className={inputClassName}
              autoComplete="off"
            />
            {countrySuggestions.length > 0 && (
              <div className={suggestionsContainerClassName}>
                <ul className={suggestionListClassName}>
                  {countrySuggestions.map((c) => (
                    <li
                      key={c.code}
                      className={suggestionItemClassName}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCountrySelect(c);
                      }}
                    >
                      {c.name_en ?? c.code}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* CITY */}
        <div className={fieldWrapperClassName}>
          {labelCity && <label className={labelClassName}>{labelCity}</label>}
          <div className={innerWrapperClassName}>
            <input
              ref={cityInputRef}
              type="text"
              value={cityInput}
              onChange={handleCityChangeInput}
              placeholder={
                selectedCountryCode ? placeholderCity : "Select a country first…"
              }
              className={inputClassName}
              autoComplete="off"
              disabled={!selectedCountryCode}
            />
            {isLoadingCities && (
              <div className={helperTextClassName}>Loading…</div>
            )}
            {citySuggestions.length > 0 && (
              <div className={suggestionsContainerClassName}>
                <ul className={suggestionListClassName}>
                  {citySuggestions.map((city, idx) => (
                    <li
                      key={`${city.geoname_id}-${idx}`}
                      className={suggestionItemClassName}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCitySelect(city);
                      }}
                    >
                      {city.ascii_name ?? city.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {error && <div className={errorClassName}>{error}</div>}
      </div>
    );
  }
);

LocationSelect.displayName = "LocationSelect";

export default LocationSelect;