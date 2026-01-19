"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface ContentChartsProps {
  contentByStage: Array<{ name: string; value: number; color: string }>
  platformChartData: Array<{ name: string; value: number }>
}

export function ContentCharts({ contentByStage, platformChartData }: ContentChartsProps) {
  const filteredContentByStage = contentByStage.filter((stage) => stage.name.toLowerCase() !== "approved")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Content by Production Stage</h2>
      </div>
      <div className="w-full -ml-3 sm:-ml-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={filteredContentByStage} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" barSize={28}>
              {filteredContentByStage.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PlatformChart({ platformChartData }: { platformChartData: Array<{ name: string; value: number }> }) {
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#0088fe", "#00c49f"]

  if (platformChartData.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={platformChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {platformChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

