import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const THRESHOLD = 30

export default function SoilMoistureChart({ data }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            formatter={(value) => [`${value}%`, 'Moisture']}
          />
          <ReferenceLine y={THRESHOLD} stroke="#ef4444" strokeDasharray="3 3" />
          <Bar dataKey="moisture" fill="#22c55e" radius={[2, 2, 0, 0]} name="Moisture" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
