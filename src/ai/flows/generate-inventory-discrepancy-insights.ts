
'use server';
/**
 * @fileOverview Flujo de IA para generar insights de discrepancias de inventario.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InventoryDiscrepancyInputSchema = z.object({
  analysisSummary: z.string(),
  largestDiscrepancies: z.string(),
  movementTypeBreakdown: z.string(),
  centerBreakdown: z.string(),
});
export type InventoryDiscrepancyInput = z.infer<typeof InventoryDiscrepancyInputSchema>;

const InventoryDiscrepancyOutputSchema = z.object({
  insights: z.string(),
});
export type InventoryDiscrepancyOutput = z.infer<typeof InventoryDiscrepancyOutputSchema>;

export async function generateInventoryDiscrepancyInsights(
  input: InventoryDiscrepancyInput
): Promise<InventoryDiscrepancyOutput> {
  return generateInventoryDiscrepancyInsightsFlow(input);
}

const inventoryDiscrepancyInsightsPrompt = ai.definePrompt({
  name: 'inventoryDiscrepancyInsightsPrompt',
  model: 'gemini-1.5-flash',
  input: {schema: InventoryDiscrepancyInputSchema},
  output: {schema: InventoryDiscrepancyOutputSchema},
  prompt: `Eres un experto analista logístico y financiero. Tu objetivo es analizar un reporte MB51 de SAP enriquecido con factores de valoración.

Categorías de Movimiento:
- Diferencias Inventario SAP (Z59, Z60): Ajustes manuales en el sistema.
- Diferencias Inventario WMS (Z65, Z66): Ajustes derivados de conteos físicos.
- Mermas (Z42, Z43): Daños detectados en bodega.
- Vencimientos (Z44, Z45): Productos caducados.

Datos del Reporte Actual:
Resumen: {{{analysisSummary}}}
Mayores Desviaciones detectadas: {{{largestDiscrepancies}}}
Desglose por Categoría: {{{movementTypeBreakdown}}}
Impacto por Centro: {{{centerBreakdown}}}

Tareas:
1. Identifica qué categoría está causando el mayor impacto financiero negativo.
2. Sugiere mejoras puntuales basadas en los datos (por ejemplo: mejorar control FEFO, revisiones de conteo físico, o gestión de mermas).
3. Proporciona exactamente 3 recomendaciones accionables y breves que el equipo de operaciones pueda implementar.

Responde exclusivamente en español, con un tono profesional, directo, ejecutivo y fácil de leer.`,
});

const generateInventoryDiscrepancyInsightsFlow = ai.defineFlow(
  {
    name: 'generateInventoryDiscrepancyInsightsFlow',
    inputSchema: InventoryDiscrepancyInputSchema,
    outputSchema: InventoryDiscrepancyOutputSchema,
  },
  async input => {
    const {output} = await inventoryDiscrepancyInsightsPrompt(input);
    return output!;
  }
);
