import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ReadyToMerge = ({ candidates }) => {
    if (candidates.length === 0) {
        return _jsx("div", { children: "No branches are awaiting merge." });
    }
    return (_jsx("div", { className: "feed-list", children: candidates.map((candidate) => (_jsxs("div", { className: "feed-item", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("strong", { children: candidate.title }), _jsx("span", { className: "status-chip", children: candidate.branch })] }), _jsx("div", { style: { fontSize: "0.8rem", opacity: 0.75 }, children: candidate.summary }), _jsxs("div", { style: { marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }, children: ["Checks: ", candidate.checklist.filter(Boolean).length, "/", candidate.checklist.length] })] }, candidate.branch))) }));
};
export default ReadyToMerge;
