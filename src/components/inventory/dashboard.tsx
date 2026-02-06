
"use client"

import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  Download, TrendingDown, Calculator, BarChart3, PackageSearch, 
  FileText, CalendarRange, LayoutGrid, Filter, Info as InfoIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AnalysisResult, exportToExcel, MovementCategory } from '@/lib/inventory-logic';
import { AiInsights } from './ai-insights';
import { cn } from '@/lib/utils';

interface DashboardProps {
  data: AnalysisResult[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Mermas': '#E11D48',
  'Vencimientos': '#F59E0B',
  'Diferencias de Inventario': '#008080',
  'Otros': '#708090'
};

const CHART_COLORS = ['#008080', '#E11D48', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0);
    return (
      <div className="bg-white p-4 border rounded-lg shadow-xl text-xs space-y-2">
        <p className="font-bold border-b pb-1 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-mono font-bold">${(entry.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t pt-1 mt-1 font-bold text-primary">
          <span>Impacto Neto Total:</span>
          <span className="font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function InventoryDashboard({ data }: DashboardProps) {
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterDesc, setFilterDesc] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [matrixCenterFilter, setMatrixCenterFilter] = useState<string>('all');

  const centers = useMemo(() => Array.from(new Set(data.map(d => d.center))).sort(), [data]);

  const summary = useMemo(() => {
    const totalImpact = data.reduce((acc, curr) => acc + (curr.calculatedImpact || 0), 0);
    
    const byCategory = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + (curr.calculatedImpact || 0);
      return acc;
    }, {} as Record<string, number>);

    const getCategorySummary = (category: MovementCategory) => {
      const filtered = data.filter(d => d.category === category);
      const centersMap = filtered.reduce((acc, curr) => {
        if (!acc[curr.center]) {
          acc[curr.center] = { name: curr.center, impact: 0, quantity: 0 };
        }
        acc[curr.center].impact += (curr.calculatedImpact || 0);
        acc[curr.center].quantity += (curr.quantity || 0);
        return acc;
      }, {} as Record<string, { name: string, impact: number, quantity: number }>);

      const list = Object.values(centersMap).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
      const totalAbs = list.reduce((acc, curr) => acc + Math.abs(curr.impact), 0);
      
      const pie = list.map(c => ({
        name: c.name,
        value: Math.abs(c.impact),
        percentage: totalAbs > 0 ? (Math.abs(c.impact) / totalAbs * 100).toFixed(1) : "0"
      }));

      return { list, pie };
    };

    const differences = getCategorySummary('Diferencias de Inventario');
    const mermas = getCategorySummary('Mermas');
    const vencimientos = getCategorySummary('Vencimientos');

    const diffDataForMatrix = data.filter(d => {
      const isDiffCategory = d.category === 'Diferencias de Inventario';
      const matchesCenter = matrixCenterFilter === 'all' || d.center === matrixCenterFilter;
      return isDiffCategory && matchesCenter;
    });

    const dailyMatrix: Record<string, Record<number, number>> = {};
    const materialsInfo: Record<string, string> = {};
    const daysFound = new Set<number>();

    diffDataForMatrix.forEach(d => {
      if (d.day === undefined || isNaN(d.day)) return;
      daysFound.add(d.day);
      if (!dailyMatrix[d.productCode]) {
        dailyMatrix[d.productCode] = {};
        materialsInfo[d.productCode] = d.productDescription;
      }
      dailyMatrix[d.productCode][d.day] = (dailyMatrix[d.productCode][d.day] || 0) + d.quantity;
    });

    const sortedDays = Array.from(daysFound).sort((a, b) => a - b);
    
    const matrixRows = Object.keys(dailyMatrix).map(code => ({
      code,
      description: materialsInfo[code],
      days: dailyMatrix[code],
      totalQty: Object.values(dailyMatrix[code]).reduce((a, b) => a + b, 0)
    }))
    .sort((a, b) => Math.abs(b.totalQty) - Math.abs(a.totalQty))
    .slice(0, 10);

    const categories: MovementCategory[] = ['Mermas', 'Vencimientos', 'Diferencias de Inventario'];
    const chartData = centers.map(center => {
      const entry: any = { center };
      categories.forEach(cat => {
        const val = data
          .filter(d => d.center === center && d.category === cat)
          .reduce((sum, d) => sum + (d.calculatedImpact || 0), 0);
        entry[cat] = val;
      });
      return entry;
    });

    const technicalData = data.filter(d => {
      const matchMaterial = (d.productCode || '').toLowerCase().includes(filterMaterial.toLowerCase());
      const matchDesc = (d.productDescription || '').toLowerCase().includes(filterDesc.toLowerCase());
      const matchCenter = (d.center || '').toLowerCase().includes(filterCenter.toLowerCase());
      return matchMaterial && matchDesc && matchCenter;
    });

    return {
      totalImpact,
      categoryData: Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.abs(value || 0) })),
      chartData,
      differences,
      mermas,
      vencimientos,
      matrixRows,
      sortedDays,
      technicalData,
      sortedData: data
    };
  }, [data, filterMaterial, filterDesc, filterCenter, matrixCenterFilter, centers]);

  const handlePrintPdf = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap gap-3 justify-end print:hidden">
        <Button onClick={handlePrintPdf} variant="outline" className="flex gap-2 border-accent text-accent hover:bg-accent/10">
          <FileText className="w-4 h-4" />
          Descargar Reporte PDF
        </Button>
        <Button onClick={() => exportToExcel(summary.technicalData, 'Reporte_Inventario')} className="flex gap-2">
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-wider">Impacto Neto Consolidado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold">${summary.totalImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs mt-1 opacity-70">Total acumulado consolidado</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Mermas Netas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-headline font-bold text-rose-600">${(summary.categoryData.find(c => c.name === 'Mermas')?.value || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Impacto Z42 + Z43</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Diferencias Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-headline font-bold text-teal-600">${(summary.categoryData.find(c => c.name === 'Diferencias de Inventario')?.value || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Z59, Z60, Z65, Z66</p>
          </CardContent>
        </Card>
      </div>

      <AiInsights analysisData={{
        totalDiscrepancy: summary.totalImpact,
        categoryData: summary.categoryData,
        centerData: summary.differences.list.map(c => ({ name: c.name, value: c.impact })),
        sortedData: summary.sortedData
      }} />

      <Card className="shadow-sm print:break-inside-avoid border-teal-200">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="font-headline text-lg flex items-center gap-2 text-primary">
              <CalendarRange className="w-5 h-5" />
              Matriz Diaria: Cantidades (Z59-Z66) - Top 10 Impactos
            </CardTitle>
            <CardDescription>Cantidades físicas de columna 'Ctd.en UM entrada' por día de 'Fecha contabiliz.'</CardDescription>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={matrixCenterFilter} onValueChange={setMatrixCenterFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="Filtrar por Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Centros</SelectItem>
                {centers.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {summary.matrixRows.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-3 min-w-[150px] bg-muted/30">Material (Top 10)</TableHead>
                    {summary.sortedDays.map(day => (
                      <TableHead key={day} className="text-[10px] uppercase font-bold text-center py-3 min-w-[45px] border-l bg-primary/5">{day}</TableHead>
                    ))}
                    <TableHead className="text-[10px] uppercase font-bold text-right py-3 bg-muted border-l min-w-[90px]">Total Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.matrixRows.map((row, i) => (
                    <TableRow key={i} className="text-xs hover:bg-muted/50 transition-colors">
                      <TableCell className="font-bold py-2">
                        <div className="truncate max-w-[140px]">{row.code}</div>
                        <div className="text-[9px] text-muted-foreground font-normal truncate max-w-[140px]">{row.description}</div>
                      </TableCell>
                      {summary.sortedDays.map(day => (
                        <TableCell key={day} className={cn(
                          "text-center py-2 font-mono border-l",
                          row.days[day] !== undefined ? (row.days[day] < 0 ? 'text-red-500 font-bold bg-red-50/20' : 'text-primary font-bold bg-teal-50/20') : 'text-muted-foreground/20'
                        )}>
                          {row.days[day]?.toLocaleString() || '-'}
                        </TableCell>
                      ))}
                      <TableCell className={cn("text-right font-bold font-mono py-2 bg-muted/20 border-l", row.totalQty < 0 ? 'text-red-500' : 'text-primary')}>
                        {row.totalQty.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/5">
              <p className="text-muted-foreground italic flex items-center justify-center gap-2">
                <InfoIcon className="w-4 h-4" />
                No se detectaron datos de fecha para el centro seleccionado. Verifique que la columna 'Fecha contabiliz.' esté presente en su archivo MB51.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
        <Card className="shadow-sm border-teal-100">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2 text-teal-600">
              <LayoutGrid className="w-5 h-5" />
              Diferencias Técnicas por Centro
            </CardTitle>
            <CardDescription>Impacto Neto: Z59, Z60, Z65 y Z66</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-3">Centro</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right py-3">Imp. Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.differences.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold">{c.name}</TableCell>
                      <TableCell className={cn("text-right font-mono font-bold", c.impact < 0 ? 'text-red-500' : 'text-teal-600')}>
                        ${c.impact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="h-[280px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.differences.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {summary.differences.pie.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
        <Card className="shadow-sm border-rose-100">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2 text-rose-600">
              <TrendingDown className="w-5 h-5" />
              Mermas por Centro (Z42/Z43)
            </CardTitle>
            <CardDescription>Impacto financiero acumulado por daños/desperdicios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-3">Centro</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right py-3">Imp. Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.mermas.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold">{c.name}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-600">
                        ${c.impact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="h-[280px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.mermas.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {summary.mermas.pie.map((e, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid">
        <Card className="shadow-sm border-amber-100">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2 text-amber-600">
              <CalendarRange className="w-5 h-5" />
              Vencimientos por Centro (Z44/Z45)
            </CardTitle>
            <CardDescription>Impacto financiero por productos caducados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-3">Centro</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right py-3">Imp. Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.vencimientos.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold">{c.name}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-600">
                        ${c.impact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="h-[280px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.vencimientos.pie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {summary.vencimientos.pie.map((e, i) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Visión Comparativa Consolidada por Centro
          </CardTitle>
          <CardDescription>Desglose total apilado (Impacto Neto Financiero)</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="center" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v || 0) / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="Mermas" stackId="a" fill={CATEGORY_COLORS['Mermas']} />
              <Bar dataKey="Diferencias de Inventario" stackId="a" fill={CATEGORY_COLORS['Diferencias de Inventario']} />
              <Bar dataKey="Vencimientos" stackId="a" fill={CATEGORY_COLORS['Vencimientos']} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm print:mt-8">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-primary" />
            Detalle Técnico MB51 Consolidado
          </CardTitle>
          <CardDescription>Use los filtros de columna para búsquedas específicas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-headline py-4 min-w-[150px]">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold">Material</span>
                      <Input placeholder="Filtrar..." value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)} className="h-7 text-[10px] print:hidden" />
                    </div>
                  </TableHead>
                  <TableHead className="font-headline min-w-[200px]">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold">Descripción</span>
                      <Input placeholder="Filtrar..." value={filterDesc} onChange={(e) => setFilterDesc(e.target.value)} className="h-7 text-[10px] print:hidden" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Cant.</TableHead>
                  <TableHead className="min-w-[120px]">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold">Centro</span>
                      <Input placeholder="Filtrar..." value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)} className="h-7 text-[10px] print:hidden" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Factor</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold">Imp. Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.technicalData.slice(0, 100).map((item, i) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="font-bold">{item.productCode}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.productDescription}</TableCell>
                    <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{item.center}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{item.factor.toFixed(4)}</TableCell>
                    <TableCell className={cn("text-right font-bold font-mono", item.calculatedImpact < 0 ? 'text-red-500' : 'text-primary')}>
                      ${item.calculatedImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print:hidden, button, input { display: none !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; margin-bottom: 2rem !important; page-break-inside: avoid; }
          table { font-size: 8px !important; }
        }
      `}</style>
    </div>
  );
}
