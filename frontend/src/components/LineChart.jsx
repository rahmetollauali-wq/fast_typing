// Линейный график на SVG: скорость по секундам (результат) или по попыткам (профиль).
// points: [{ x, y, errors? }]. Отметки ошибок рисуются оранжевыми рисками у оси.
export function LineChart({ points, height = 150, xLabel = (x) => x, xTicks = 4, showDots = false }) {
  const W = 600;
  const H = height;
  const pad = { l: 28, r: 8, t: 8, b: 22 };
  if (!points.length) return null;

  const maxY = Math.max(40, Math.ceil(Math.max(...points.map((p) => p.y)) / 20) * 20);
  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs, minX + 1);
  const X = (x) => pad.l + ((x - minX) / (maxX - minX)) * (W - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - y / maxY) * (H - pad.t - pad.b);

  const yTicks = [0, maxY / 2, maxY];
  // «Круглый» шаг подписей по оси X: 1, 2, 5, 10, 15, 30… — не больше xTicks+1 подписей
  const span = maxX - minX;
  const step = [1, 2, 5, 10, 15, 20, 30, 60].find((s) => span / s <= xTicks) || Math.ceil(span / xTicks);
  const xTickValues = [];
  for (let v = Math.ceil(minX / step) * step; v <= maxX; v += step) xTickValues.push(v);
  if (!xTickValues.includes(minX)) xTickValues.unshift(minX);
  const path = points.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="chart">
      {yTicks.map((v) => (
        <g key={v}>
          <line className="grid" x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} />
          <text x={0} y={Y(v) + 3}>{v}</text>
        </g>
      ))}
      {[...new Set(xTickValues)].map((v) => (
        <text key={v} x={X(v)} y={H - 4} textAnchor="middle">{xLabel(v)}</text>
      ))}
      {points.filter((p) => p.errors > 0).map((p) => (
        <line key={`e${p.x}`} className="err-tick" x1={X(p.x)} x2={X(p.x)} y1={Y(0) - 12} y2={Y(0)} />
      ))}
      <path className="line" d={path} />
      {showDots && points.map((p) => <circle key={`d${p.x}`} className="dot" cx={X(p.x)} cy={Y(p.y)} r="2.2" />)}
    </svg>
  );
}
