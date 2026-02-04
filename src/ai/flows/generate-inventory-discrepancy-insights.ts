
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating insights into inventory discrepancies.
 *
 * generateInventoryDiscrepancyInsights - An async function that takes inventory data and returns AI-generated insights.
 * InventoryDiscrepancyInput - The input type for the generateInventoryDiscrepancyInsights function.
 * InventoryDiscrepancyOutput - The output type for the generateInventoryDiscrepancyInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InventoryDiscrepancyInputSchema = z.object({
  analysisSummary: z
    .string()
    .describe(
      'A summary of the inventory discrepancy analysis, including total impact value and categorization (Mermas, Vencimientos, Diferencias SAP/WMS).'
    ),
  largestDiscrepancies: z
    .string()
    .describe(
      'A list of the products with the largest calculated impacts, including their category and impact value.'
    ),
  movementTypeBreakdown: z
    .string()
    .describe(
      'A breakdown of impacts by CATEGORY (Diferencias Inventario SAP/WMS, Mermas, Vencimientos).'
    ),
  centerBreakdown: z
    .string()
    .describe(
      'A breakdown of inventory discrepancies by logistics center.'
    ),
});
export type InventoryDiscrepancyInput = z.infer<typeof InventoryDiscrepancyInputSchema>;

const InventoryDiscrepancyOutputSchema = z.object({
  insights: z
    .string()
    .describe(
      'AI-generated insights into the potential causes of discrepancies, focused on categories like Mermas, Vencimientos or Inventory Errors.'
    ),
});
export type InventoryDiscrepancyOutput = z.infer<typeof InventoryDiscrepancyOutputSchema>;

export async function generateInventoryDiscrepancyInsights(
  input: InventoryDiscrepancyInput
): Promise<InventoryDiscrepancyOutput> {
  return generateInventoryDiscrepancyInsightsFlow(input);
}

const inventoryDiscrepancyInsightsPrompt = ai.definePrompt({
  name: 'inventoryDiscrepancyInsightsPrompt',
  input: {schema: InventoryDiscrepancyInputSchema},
  output: {schema: InventoryDiscrepancyOutputSchema},
  prompt: `Eres un experto analista logístico y financiero. Tu objetivo es analizar un reporte MB51 de SAP enriquecido con factores de valoración.

Contexto de Categorías:
- Diferencias Inventario SAP (Z59, Z60): Ajustes manuales.
- Diferencias Inventario WMS (Z65, Z66): Ajustes por conteo físico en bodega.
- Mermas (Z42, Z43): Daños o desperdicios.
- Vencimientos (Z44, Z45): Productos caducados.

Datos del Análisis:
Resumen General: {{{analysisSummary}}}
Mayores Desviaciones: {{{largestDiscrepancies}}}
Desglose por Categoría: {{{movementTypeBreakdown}}}
Impacto por Centro: {{{centerBreakdown}}}

Tareas:
1. Identifica qué categoría está causando el mayor impacto financiero.
2. Si las Mermas o Vencimientos son altos, sugiere mejoras en rotación (FEFO) o manipulación.
3. Si los ajustes WMS (Z65/Z66) son significativos, alerta sobre posibles fallas en el control de inventario físico.
4. Proporciona 3 recomendaciones accionables y breves.

Responde en español, con un tono profesional y directo.`,
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
