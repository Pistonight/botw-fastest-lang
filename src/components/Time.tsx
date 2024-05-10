//! One cell of time

export type TimeProps = {
    /// Time label
    label: string;
    /// If the time is disabled
    disabled: boolean;
    /// If the time is slowest
    slowest: boolean;
};

export const Time: React.FC<TimeProps> = ({ label, disabled, slowest }) => {
    const text = getText(label, disabled);
    return (
        <span
            style={{
                fontFamily: "monospace",
                display: "inline-block",
                width: "80px",
                textAlign: "center",
            }}
        >
            {text === "Fastest" ? (
                <span style={{ color: "green" }}>Fastest</span>
            ) : (
                <>
                    <span
                        style={{
                            color: disabled
                                ? "gray"
                                : getColor(label, !!slowest),
                        }}
                    >
                        {text.substring(0, 4)}
                    </span>
                    <span style={{ color: "gray" }}>{text.substring(4)}</span>
                </>
            )}
        </span>
    );
};

function getColor(label: string, slowest: boolean): string {
    if (slowest) {
        return "red";
    }
    if (!label || label === "0" || label === "000") {
        return "green";
    }
    if (label === "ERROR") {
        return "red";
    }
    return "";
}

function getText(label: string, disabled: boolean): string {
    if (label === "ERROR") {
        return label;
    }
    if (!label || label === "0" || label === "000") {
        if (disabled) {
            label = "000";
        } else {
            return "Fastest";
        }
    }
    if (!label.includes("s")) {
        label = "00s" + label;
    } else if (label[label.length - 1] === "s") {
        label = label + "000";
    }
    return "+" + label;
}
