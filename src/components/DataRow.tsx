//! One row of the time table
import { useId } from "react";
import { LangCode, Langs } from "data.ts";
import { Time } from "./Time.tsx";

export type DataRowProps = {
    /// Text to display
    label: string;
    /// If the row is checked
    checked: boolean;
    /// Callback to set the row as checked
    /// undefined means to now show checkbox
    setChecked?: (checked: boolean) => void;
    /// Times to display for each language
    times: Record<LangCode, string>;
    /// The slowest languages
    slowest: LangCode[];
};

export const DataRow: React.FC<DataRowProps> = ({
    label,
    checked,
    setChecked,
    times,
    slowest,
}) => {
    const id = useId();
    return (
        <tr>
            <td style={{ width: "400px" }}>
                {setChecked ? (
                    <>
                        <input
                            id={id}
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                                setChecked(!checked);
                            }}
                        />
                        <label htmlFor={id}>{label}</label>
                    </>
                ) : (
                    <label>{label}</label>
                )}
            </td>
            {Langs.map(({ short }) => (
                <td key={short}>
                    <Time
                        label={times[short]}
                        disabled={!!setChecked && !checked}
                        slowest={slowest.includes(short)}
                    />
                </td>
            ))}
        </tr>
    );
};
