
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, BarChart, FileText, GlassWater } from 'lucide-react';
import { providePersonalizedTips } from '@/ai/flows/provide-personalized-tips';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    completion: number;
    waterIntake: number;
};

const aziafBrandImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAD2APYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1VZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA/9k=";

export default function ProgressPage() {
    const { toast } = useToast();
    const [weight, setWeight] = useState('');
    const [energy, setEnergy] = useState([5]);
    const [completion, setCompletion] = useState([80]);
    const [waterIntake, setWaterIntake] = useState([2]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [tips, setTips] = useState('');
    const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
    const chartRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('progressHistory');
            if (savedHistory) {
                setProgressHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error("Could not load progress history from localStorage", error);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTips('');

        try {
            if (!weight) {
                toast({
                    title: 'Missing Information',
                    description: 'Please enter your current weight.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            const newEntry: ProgressEntry = {
                date: new Date().toLocaleDateString('en-GB'),
                weight: parseFloat(weight),
                energy: energy[0],
                completion: completion[0],
                waterIntake: waterIntake[0],
            };
            
            const updatedHistory = [...progressHistory, newEntry];
            setProgressHistory(updatedHistory);
            localStorage.setItem('progressHistory', JSON.stringify(updatedHistory));


            const response = await providePersonalizedTips({
                weight: parseFloat(weight),
                energyLevels: energy[0],
                mealCompletion: completion[0],
                goals: 'General well-being and slight weight loss.',
            });

            setTips(response.tips);
            localStorage.setItem('personalizedTips', response.tips);


            toast({
                title: 'Progress Logged',
                description: "We've saved your progress for today.",
            });
            setWeight('');

        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not get personalized tips. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownloadReport = async () => {
        if (progressHistory.length === 0) {
            toast({ title: 'No progress data to report.', variant: 'destructive'});
            return;
        }
        setIsDownloading(true);

        try {
            const chartElement = chartRef.current;
            if (!chartElement) {
                throw new Error("Chart element not found");
            }
            
            // Generate chart image
            const chartImage = await toPng(chartElement, { quality: 1.0, pixelRatio: 2 });
            
            const doc = new jsPDF();

            // Header
            doc.addImage(aziafBrandImageBase64, 'JPEG', 15, 15, 40, 40);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('Your Progress Report', 70, 35);
            
            // Chart
            doc.setFontSize(16);
            doc.text('Weight Fluctuation Chart', 15, 70);
            doc.addImage(chartImage, 'PNG', 15, 80, 180, 80);

            // History Table
            doc.addPage();
            doc.setFontSize(16);
            doc.text('Detailed Progress Log', 15, 20);

            const tableBody = progressHistory.map(entry => [
                entry.date,
                `${entry.weight} kg`,
                `${entry.energy}/10`,
                `${entry.completion}%`,
                `${entry.waterIntake} L`,
            ]);

            (doc as any).autoTable({
                startY: 30,
                head: [['Date', 'Weight', 'Energy Level', 'Meal Completion', 'Water Intake']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [66, 133, 244] }, // Primary color
            });

            doc.save('Aziaf_Progress_Report.pdf');

        } catch (error) {
            console.error("Failed to generate PDF", error);
            toast({ title: 'Error Generating Report', description: 'Could not generate the progress report PDF.', variant: 'destructive'});
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">Track Your Daily Progress</CardTitle>
                    <CardDescription>Consistency is key. Log your daily metrics to stay on track.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="weight">Today's Weight (kg)</Label>
                            <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                placeholder="e.g., 75.5"
                                required
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="energy">Energy Level (1-10)</Label>
                             <div className="flex items-center gap-4">
                                <Slider
                                    id="energy"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={energy}
                                    onValueChange={setEnergy}
                                />
                                <span className="font-semibold text-lg text-primary w-12 text-center">{energy[0]}</span>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="waterIntake">Water Intake (Liters)</Label>
                             <div className="flex items-center gap-4">
                                <Slider
                                    id="waterIntake"
                                    min={0}
                                    max={8}
                                    step={0.5}
                                    value={waterIntake}
                                    onValueChange={setWaterIntake}
                                />
                                <span className="font-semibold text-lg text-primary w-12 text-center">{waterIntake[0]} L</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="completion">Meal Completion (%)</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="completion"
                                    min={0}
                                    max={100}
                                    step={10}
                                    value={completion}
                                    onValueChange={setCompletion}
                                />
                                <span className="font-semibold text-lg text-primary w-12 text-center">{completion[0]}%</span>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Log Progress & Get Tips'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {tips && (
                <Alert className="animate-in fade-in-50">
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="font-headline">Personalized Tip</AlertTitle>
                    <AlertDescription>
                       {tips}
                    </AlertDescription>
                </Alert>
            )}

             <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="font-headline">Progress History</CardTitle>
                        <CardDescription>Review your past entries and visualize your journey.</CardDescription>
                    </div>
                    <Button onClick={handleDownloadReport} disabled={isDownloading || progressHistory.length === 0} className="mt-4 sm:mt-0">
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                        Download Report
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {progressHistory.length > 0 ? (
                        <>
                            {/* Hidden chart for PDF generation */}
                            <div className="absolute -left-[9999px] top-0 w-[800px] h-[400px] bg-white p-4" ref={chartRef}>
                                <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={progressHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} allowDataOverflow/>
                                            <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} />
                                            <Tooltip />
                                            <Legend />
                                            <Line yAxisId="left" type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} name="Weight (kg)" />
                                            <Line yAxisId="right" type="monotone" dataKey="waterIntake" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Water (L)" />
                                        </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Visible Chart */}
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={progressHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} allowDataOverflow />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} name="Weight (kg)" />
                                        <Line yAxisId="right" type="monotone" dataKey="waterIntake" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Water (L)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <ScrollArea className="w-full whitespace-nowrap">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Weight</TableHead>
                                            <TableHead>Energy</TableHead>
                                            <TableHead>Completion</TableHead>
                                            <TableHead>Water</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {progressHistory.slice().reverse().map((entry, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{entry.date}</TableCell>
                                                <TableCell>{entry.weight} kg</TableCell>
                                                <TableCell>{entry.energy}/10</TableCell>
                                                <TableCell>{entry.completion}%</TableCell>
                                                <TableCell>{entry.waterIntake} L</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>

                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                           <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-semibold">No Progress Logged Yet</h3>
                            <p className="text-muted-foreground text-sm">Start by logging your progress above to see your history here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
