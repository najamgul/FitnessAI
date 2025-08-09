'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart } from 'recharts';

const weightChartData = [
  { date: 'Week 1', weight: 80 },
  { date: 'Week 2', weight: 79.5 },
  { date: 'Week 3', weight: 79 },
  { date: 'Week 4', weight: 78 },
  { date: 'Week 5', weight: 77.5 },
  { date: 'Week 6', weight: 77 },
];

const energyChartData = [
    { day: 'Mon', level: 7 },
    { day: 'Tue', level: 6 },
    { day: 'Wed', level: 8 },
    { day: 'Thu', level: 7 },
    { day: 'Fri', level: 9 },
    { day: 'Sat', level: 8 },
    { day: 'Sun', level: 7 },
];

const mealCompletionData = [
    { day: 'Mon', completed: 100 },
    { day: 'Tue', completed: 75 },
    { day: 'Wed', completed: 100 },
    { day: 'Thu', completed: 100 },
    { day: 'Fri', completed: 50 },
    { day: 'Sat', completed: 100 },
    { day: 'Sun', completed: 100 },
];

const chartConfig = {
  weight: {
    label: 'Weight (kg)',
    color: 'hsl(var(--chart-1))',
  },
  level: {
    label: 'Energy Level',
    color: 'hsl(var(--chart-2))',
  },
    completed: {
    label: 'Meal Completion (%)',
    color: 'hsl(var(--chart-1))',
    },
};

export default function DashboardPage() {
  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Welcome to your Dashboard!</CardTitle>
                <CardDescription>Here's a snapshot of your progress. Keep up the great work!</CardDescription>
            </CardHeader>
        </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Weight Progress</CardTitle>
          <CardDescription>Your weight trend over the last few weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart accessibilityLayer data={weightChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" nameKey="weight" />} />
              <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={true} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Energy Levels</CardTitle>
          <CardDescription>Your energy levels over the past week.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={energyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={[0, 10]} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="level" />} />
              <Bar dataKey="level" fill="var(--color-level)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-headline">Meal Completion</CardTitle>
          <CardDescription>Your meal plan adherence this week.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart accessibilityLayer data={mealCompletionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis domain={[0, 100]} hide />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="completed" />} />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={8} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
