export function formatROI(row) {
  const confidence = (row.confidence || 0) * 100;
  const latency = row.latency_ms || 0;
  const cost = row.cost_usd || 0;
  const roi = confidence > 0 && cost > 0 ? confidence / cost : 0;
  return {
    confidence: confidence.toFixed(2) + "%",
    latency: latency + " ms",
    cost: "$" + cost.toFixed(4),
    roi: roi ? roi.toFixed(2) + "x" : "N/A",
  };
}
