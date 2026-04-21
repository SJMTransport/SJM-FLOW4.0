import React from "react";
import { C } from "@/src/constants";
import { fmt } from "@/src/utils";

export const CurrencyInput = ({ value, onChange, placeholder = "0", style = {}, className = "input-field", color }: any) => {
  const [focused, setFocused] = React.useState(false);
  const [raw, setRaw] = React.useState("");

  const toFloat = (v: any) => {
    if (v === "" || v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (s.includes(",")) {
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(s) || 0;
  };

  const toFormatted = (n: number) => {
    if (!n || n === 0) return "";
    return n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toEditStr = (n: number) => {
    if (!n || n === 0) return "";
    const fixed = n.toFixed(2);
    return fixed.replace(".", ",");
  };

  React.useEffect(() => {
    if (!focused) setRaw(toFormatted(toFloat(value)));
  }, [value, focused]);

  const handleFocus = () => {
    setFocused(true);
    setRaw(toEditStr(toFloat(value)));
  };

  const handleChange = (e: any) => {
    let val = e.target.value;
    val = val.replace(/[^0-9,]/g, "");
    const parts = val.split(",");
    if (parts.length > 2) val = parts[0] + "," + parts[1];
    if (parts.length === 2 && parts[1].length > 2) val = parts[0] + "," + parts[1].slice(0, 2);
    setRaw(val);
    const n = toFloat(val);
    onChange(n > 0 ? String(n) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    const n = toFloat(raw);
    setRaw(n > 0 ? toFormatted(n) : "");
    onChange(n > 0 ? String(n) : "");
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={raw}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ textAlign: "right", ...(color ? { color } : {}), ...style }}
    />
  );
};
