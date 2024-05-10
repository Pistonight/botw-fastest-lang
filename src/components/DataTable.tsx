//! One table of time data
//! including header and rows

import { PropsWithChildren, useId } from "react";

import { Langs } from "data.ts";

export type DataTableProps = PropsWithChildren<{
    /// Table title
    title: string;
    /// If all rows in this table are checked
    checked: boolean;
    /// Callback to set the row as checked
    /// undefined means to now show checkbox
    setChecked?: (checked: boolean) => void;
}>;

export const DataTable: React.FC<DataTableProps> = ({
    title,
    checked,
    setChecked,
    children,
}) => {
    const id = useId();
    return (
        <table>
            <thead>
                <tr>
                    <th style={{ textAlign: "left" }}>
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
                                <label htmlFor={id}>{title}</label>
                            </>
                        ) : (
                            <label>{title}</label>
                        )}
                    </th>
                    {Langs.map(({ short, display }) => (
                        <th key={short} title={display}>
                            {short}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
};
