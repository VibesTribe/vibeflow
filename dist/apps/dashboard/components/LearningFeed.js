import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LearningFeed = ({ tasks }) => {
    const items = tasks
        .flatMap((task) => (task.lessons ?? []).map((lesson) => ({ lesson, task })))
        .slice(0, 6);
    if (items.length === 0) {
        return _jsx("div", { children: "No new lessons logged." });
    }
    return (_jsx("div", { className: "feed-list", children: items.map(({ lesson, task }, index) => (_jsxs("div", { className: "feed-item", children: [_jsx("div", { style: { fontWeight: 600 }, children: lesson.title }), _jsx("div", { style: { fontSize: "0.8rem", opacity: 0.75 }, children: lesson.summary }), _jsxs("div", { style: { marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }, children: ["Source task: ", task.title] })] }, `${task.id}-${index}`))) }));
};
export default LearningFeed;
