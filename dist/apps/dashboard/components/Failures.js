import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Failures = ({ failures }) => {
    if (failures.length === 0) {
        return _jsx("div", { children: "All systems nominal." });
    }
    return (_jsx("div", { className: "feed-list", children: failures.map((failure) => (_jsxs("div", { className: "feed-item", children: [_jsx("div", { style: { fontWeight: 600 }, children: failure.title }), _jsx("div", { style: { fontSize: "0.8rem", opacity: 0.75 }, children: failure.summary }), _jsxs("div", { style: { marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }, children: ["Reason code: ", failure.reasonCode] })] }, failure.id))) }));
};
export default Failures;
