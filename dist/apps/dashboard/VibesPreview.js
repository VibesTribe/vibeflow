import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import VibesMissionControl from "./components/VibesMissionControl";
export default function VibesPreview() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    if (view === "vibes") {
        return _jsx(VibesMissionControl, {});
    }
    return (_jsxs("div", { style: {
            padding: 24,
            color: "#cbd5e1",
            background: "#0a0d17",
            minHeight: "100vh",
        }, children: [_jsx("h1", { style: { fontSize: 16, fontWeight: 600, marginBottom: 8 }, children: "Vibeflow" }), _jsxs("p", { style: { fontSize: 12, opacity: 0.8, lineHeight: 1.6 }, children: ["Append ", _jsx("code", { children: "?view=vibes" }), " to the URL to open Mission Control."] }), _jsxs("p", { style: { fontSize: 12, opacity: 0.6, marginTop: 12 }, children: ["Example:", " ", _jsx("a", { href: "?view=vibes", style: { color: "#38bdf8", textDecoration: "underline" }, children: "https://vibestribe.github.io/vibeflow/?view=vibes" })] })] }));
}
