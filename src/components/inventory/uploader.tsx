
"use client"

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseExcel } from '@/lib/inventory-logic';

interface UploaderProps {
  onDataReady: (movements: any[], valuations: any[]) => void;
}

export function InventoryUploader({ onDataReady }: UploaderProps) {
  const [movementsFile, setMovementsFile] = useState<File | null>(null);
  const [valuationFile, setValuationFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleProcess = async () => {
    if (!movementsFile || !valuationFile) return;
    setLoading(true);
    try {
      const movements = await parseExcel<any>(movementsFile);
      const valuations = await parseExcel<any>(valuationFile);
      onDataReady(movements, valuations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
      <Card className="border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
          <div className="bg-primary/10 p-4 rounded-full">
            {movementsFile ? <CheckCircle2 className="text-primary w-8 h-8" /> : <Upload className="text-primary w-8 h-8" />}
          </div>
          <div className="text-center">
            <h3 className="font-headline font-semibold text-lg">Archivo MB51</h3>
            <p className="text-sm text-muted-foreground">Debe incluir 'Material' e 'Impte.mon.local'</p>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setMovementsFile(e.target.files?.[0] || null)}
            className="hidden"
            id="movements-upload"
          />
          <label htmlFor="movements-upload">
            <Button variant="outline" asChild className="cursor-pointer">
              <span>{movementsFile ? 'Cambiar MB51' : 'Elegir MB51'}</span>
            </Button>
          </label>
          {movementsFile && <p className="text-xs text-primary truncate max-w-full px-4">{movementsFile.name}</p>}
        </CardContent>
      </Card>

      <Card className="border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
          <div className="bg-accent/10 p-4 rounded-full">
            {valuationFile ? <CheckCircle2 className="text-accent w-8 h-8" /> : <FileSpreadsheet className="text-accent w-8 h-8" />}
          </div>
          <div className="text-center">
            <h3 className="font-headline font-semibold text-lg">Archivo de Factores</h3>
            <p className="text-sm text-muted-foreground">Debe incluir 'Material' y 'Factor'</p>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setValuationFile(e.target.files?.[0] || null)}
            className="hidden"
            id="valuation-upload"
          />
          <label htmlFor="valuation-upload">
            <Button variant="outline" asChild className="cursor-pointer">
              <span>{valuationFile ? 'Cambiar Factores' : 'Elegir Factores'}</span>
            </Button>
          </label>
          {valuationFile && <p className="text-xs text-accent truncate max-w-full px-4">{valuationFile.name}</p>}
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-center pt-4">
        <Button 
          onClick={handleProcess} 
          disabled={!movementsFile || !valuationFile || loading}
          className="w-full max-w-md h-12 text-lg font-headline font-bold shadow-lg"
          size="lg"
        >
          {loading ? 'Procesando MB51...' : 'Iniciar Análisis de Diferencias'}
        </Button>
      </div>
    </div>
  );
}
