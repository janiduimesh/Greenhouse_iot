import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

export default function TemperatureHumidityChart({ data }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#475569' }}
          />
          <YAxis
            yAxisId="temp"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 2', 'dataMax + 2']}
          />
          <YAxis
            yAxisId="hum"
            orientation="right"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value, name) => [value, name === 'temperature' ? 'Temp (°C)' : 'Humidity (%)']}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => (value === 'temperature' ? 'Temperature' : 'Humidity')}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="temperature"
          />
          <Line
            yAxisId="hum"
            type="monotone"
            dataKey="humidity"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name="humidity"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
