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

  // Prefill (Account Settings)
  initialCountryName?: string | null;
  initialCountryCode?: string | null;
  initialCityName?: string | null;
  initialCityGeonameId?: number | null;

  // Change callback (Account Settings)
  onChangeLocation?: (loc: {
    country: string | null;
    city: string | null;
    country_code: string | null;
    city_geoname_id: number | null;
  }) => void;

  // Styling
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
  population?: number | null;
};

export type LocationSelectActions = {
  // Für Profile Setup (bleibt!)
  saveLocation: (userId: string) => Promise<void>;
};

function normStrOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

const LocationSelect = forwardRef<LocationSelectActions, Props>(
  (
    {
      labelCountry = "Country",
      labelCity = "City",
      placeholderCountry = "Select country…",
      placeholderCity = "Start typing a city…",

      initialCountryName,
      initialCountryCode,
      initialCityName,
      initialCityGeonameId,

      onChangeLocation,

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
    const [countrySuggestions, setCountrySuggestions] = useState<CountryRow[]>([]);

    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
    const [selectedCountryName, setSelectedCountryName] = useState<string | null>(null);

    const [cityInput, setCityInput] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<CityRow[]>([]);

    const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
    const [selectedCityGeonameId, setSelectedCityGeonameId] = useState<number | null>(null);

    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cityInputRef = useRef<HTMLInputElement | null>(null);

    function emitChange(
      next?: Partial<{
        country: string | null;
        city: string | null;
        country_code: string | null;
        city_geoname_id: number | null;
      }>
    ) {
      if (!onChangeLocation) return;

      onChangeLocation({
        country: (next?.country ?? selectedCountryName) ?? null,
        city: (next?.city ?? selectedCityName) ?? null,
        country_code: (next?.country_code ?? selectedCountryCode) ?? null,
        city_geoname_id: (next?.city_geoname_id ?? selectedCityGeonameId) ?? null,
      });
    }

    // ✅ Prefill (Account Settings)
    // Wichtig: nur wenn Props gesetzt sind (undefined bedeutet: nichts anfassen)
    useEffect(() => {
      if (initialCountryName !== undefined) {
        const v = normStrOrNull(initialCountryName);
        setCountryInput(v ?? "");
        setSelectedCountryName(v);
      }
      if (initialCountryCode !== undefined) {
        setSelectedCountryCode(normStrOrNull(initialCountryCode));
      }
      if (initialCityName !== undefined) {
        const v = normStrOrNull(initialCityName);
        setCityInput(v ?? "");
        setSelectedCityName(v);
      }
      if (initialCityGeonameId !== undefined) {
        setSelectedCityGeonameId(
          typeof initialCityGeonameId === "number" ? initialCityGeonameId : null
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCountryName, initialCountryCode, initialCityName, initialCityGeonameId]);

    // ✅ Countries load
    useEffect(() => {
      async function loadCountries() {
        try {
          setError(null);
          if (!supabaseClient) return;

          const { data, error } = await supabaseClient
            .from("countries")
            .select("code, name_en")
            .order("name_en", { ascending: true });

          if (error) {
            setError("Could not load countries");
            return;
          }

          const rows = (data ?? []) as CountryRow[];
          setCountries(
            rows.map((row) => ({
              code: row.code,
              name_en: row.name_en ?? row.code,
            }))
          );
        } catch {
          setError("Could not load countries");
        }
      }

      loadCountries();
    }, []);

    // ✅ Action für Profile Setup (bleibt!)
    useImperativeHandle(
      ref,
      () => ({
        async saveLocation(userId: string) {
          if (!supabaseClient) return;
          if (!userId) return;

          const { error } = await supabaseClient
            .from("users")
            .update({
              country: selectedCountryName ?? null,
              city: selectedCityName ?? null,
              country_code: selectedCountryCode ?? null,
              city_geoname_id: selectedCityGeonameId,
            })
            .eq("user_id", userId);

          if (error) {
            console.error("[LocationSelect.saveLocation] update failed:", error);
          }
        },
      }),
      [selectedCountryCode, selectedCountryName, selectedCityName, selectedCityGeonameId]
    );

    function handleCountryChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.target.value;
      setCountryInput(value);

      // Wenn leer -> alles löschen + emitChange sofort
      if (!value.trim()) {
        setSelectedCountryName(null);
        setSelectedCountryCode(null);

        setSelectedCityName(null);
        setSelectedCityGeonameId(null);
        setCityInput("");
        setCitySuggestions([]);
        setCountrySuggestions([]);

        // country/country_code auch null senden
        onChangeLocation?.({
          country: null,
          country_code: null,
          city: null,
          city_geoname_id: null,
        });

        return;
      }

      // Tippen: Name setzen, Code reset
      setSelectedCountryName(value);
      setSelectedCountryCode(null);

      // City reset
      setSelectedCityName(null);
      setSelectedCityGeonameId(null);
      setCityInput("");
      setCitySuggestions([]);

      // Event raus
      onChangeLocation?.({
        country: value,
        country_code: null,
        city: null,
        city_geoname_id: null,
      });

      if (value.trim().length < 2) {
        setCountrySuggestions([]);
        return;
      }

      const lower = value.toLowerCase();
      const matches = countries
        .filter((c) => (c.name_en ?? c.code).toLowerCase().startsWith(lower))
        .slice(0, 8);

      setCountrySuggestions(matches);
    }

    function handleCountrySelect(country: CountryRow) {
      const displayName = country.name_en ?? country.code;

      setCountryInput(displayName);
      setSelectedCountryName(displayName);
      setSelectedCountryCode(country.code);
      setCountrySuggestions([]);

      // reset city selection
      setCityInput("");
      setSelectedCityName(null);
      setSelectedCityGeonameId(null);
      setCitySuggestions([]);

      emitChange({
        country: displayName,
        country_code: country.code,
        city: null,
        city_geoname_id: null,
      });

      cityInputRef.current?.focus();
    }

    async function handleCityChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
      const value = e.target.value;
      setCityInput(value);

      if (!value.trim()) {
        setSelectedCityName(null);
        setSelectedCityGeonameId(null);
        setCitySuggestions([]);

        onChangeLocation?.({
          country: selectedCountryName ?? null,
          country_code: selectedCountryCode ?? null,
          city: null,
          city_geoname_id: null,
        });

        return;
      }

      setSelectedCityName(value);
      setSelectedCityGeonameId(null);
      setCitySuggestions([]);

      onChangeLocation?.({
        country: selectedCountryName ?? null,
        country_code: selectedCountryCode ?? null,
        city: value,
        city_geoname_id: null,
      });

      if (!selectedCountryCode) return;
      if (value.trim().length < 2) return;
      if (!supabaseClient) return;

      try {
        setIsLoadingCities(true);
        setError(null);

        const prefix = value.trim();
        const { data, error } = await supabaseClient
          .from("world_cities")
          .select("geoname_id, name, ascii_name")
          .eq("country_code", selectedCountryCode)
          .or(`ascii_name.ilike.${prefix}%,name.ilike.${prefix}%`)
          .order("population", { ascending: false })
          .limit(8);

        if (error) {
          setError("Could not load cities");
          return;
        }

        const rows = (data ?? []) as CityRow[];
        setCitySuggestions(
          rows.map((row) => ({
            geoname_id: row.geoname_id,
            name: row.name,
            ascii_name: row.ascii_name,
          }))
        );
      } finally {
        setIsLoadingCities(false);
      }
    }

    function handleCitySelect(city: CityRow) {
      const displayName = city.ascii_name ?? city.name;

      setCityInput(displayName);
      setSelectedCityName(city.name);
      setSelectedCityGeonameId(city.geoname_id);
      setCitySuggestions([]);

      emitChange({
        city: city.name,
        city_geoname_id: city.geoname_id,
      });
    }

    return (
      <div className={wrapperClassName}>
        {/* COUNTRY */}
        <div className={fieldWrapperClassName}>
          {labelCountry && <label className={labelClassName}>{labelCountry}</label>}

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
              placeholder={selectedCountryCode ? placeholderCity : "Select a country first…"}
              className={inputClassName}
              autoComplete="off"
              disabled={!selectedCountryCode}
            />

            {isLoadingCities && <div className={helperTextClassName}>Loading…</div>}

            {citySuggestions.length > 0 && (
              <div className={suggestionsContainerClassName}>
                <ul className={suggestionListClassName}>
                  {citySuggestions.map((c, idx) => (
                    <li
                      key={`${c.geoname_id}-${idx}`}
                      className={suggestionItemClassName}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCitySelect(c);
                      }}
                    >
                      {c.ascii_name ?? c.name}
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