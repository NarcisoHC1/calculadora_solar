# Outstanding work vs. prompt

## Completed
- Scenario flows implemented: tarifa/periodicidad inference with CDMX/EDOMEX guardrails, guess flows, and bimestral defaults.
- Hypothetical billing: tarifa 1 escalonada, PDBT y DAC para consumo actual y con cargas extra con IVA y Factor_P.
- Equipment sizing/selection: panel redondeo con desempates, reglas DW/Trunk para microinversores, accesorios y costos.
- Costing: BOS dependiente de distancia, transporte, MO y seguro aplican las fórmulas del prompt; TC propagado.
- Proposal payloads: variantes con y sin cargas extra incluyen montajes, costos detallados, secuencia de pagos y ahorros para frontend.
- Frontend outputs: cálculos de “Con SolarYa pagarás”, ahorros, ROI, pagos en exhibiciones y alerta DAC incluidos en la respuesta.

## Pending
- OCR integration: falta usar/explotar los datos OCR en los cálculos; hoy solo se almacenan.
- Webflow embedding: falta preparar el widget/embebido final para el sitio de Webflow.
