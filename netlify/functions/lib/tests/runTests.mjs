import assert from 'node:assert/strict';
import { calculateMicroinverters, selectCentralInverter } from '../calculations.mjs';
import { buildMicroFieldsFromProposal } from '../airtable.mjs';

function testMicroAllSiCombo() {
  const params = {
    microinverterSpecs: [
      { ID: 'A', MPPT: 4, No_Trunk: 'si', Price_USD: 200 },
      { ID: 'B', MPPT: 2, No_Trunk: 'si', Price_USD: 120 }
    ]
  };

  const result = calculateMicroinverters(9, params);
  assert.equal(result.microinverters.length, 2, 'Debe incluir dos modelos');
  const map = Object.fromEntries(result.microinverters.map(m => [m.id, m.qty]));
  assert.equal(map.A, 2, 'Se esperan 2 micros de 4 MPPT');
  assert.equal(map.B, 1, 'Se espera 1 micro de 2 MPPT');
  assert.equal(result.total_channels, 10, 'Debe cubrir 10 canales totales');
  assert.equal(result.unused_channels, 1, 'Debe dejar 1 canal libre');
  assert.equal(result.total_price_usd, 520, 'Costo total USD incorrecto');
  assert.equal(result.requiereTrunk, false, 'Grupo sin trunk no debe requerir trunk');
}

function testMicroOnlyNoTrunk() {
  const params = {
    microinverterSpecs: [
      { ID: 'C', MPPT: 4, No_Trunk: 'no', Price_USD: 150 },
      { ID: 'D', MPPT: 2, No_Trunk: 'no', Price_USD: 80 }
    ]
  };

  const result = calculateMicroinverters(5, params);
  assert.equal(result.microinverters.length >= 1, true, 'Debe existir combinación con trunk');
  assert.equal(result.requiereTrunk, true, 'Combinación debe requerir trunk');
  assert.equal(result.unused_channels <= 1, true, 'No debe dejar más de un canal libre');
}

function testCentralInverterTieBreaking() {
  const params = {
    oversizingFactor: 1.2,
    inverterSpecs: [
      { ID: 'X', Capacity_kW: 3.3, Price_USD: 1000, Product_Warranty_Years: 10 },
      { ID: 'Y', Capacity_kW: 3.3, Price_USD: 900, Product_Warranty_Years: 5 },
      { ID: 'Z', Capacity_kW: 3.3, Price_USD: 900, Product_Warranty_Years: 8 }
    ]
  };

  const inverter = selectCentralInverter(10, 400, params);
  assert.equal(inverter.ID, 'Z', 'Debe elegir el inversor con mejor garantía tras empatar en precio');
}

function testMicroAirtableMapping() {
  const fields = buildMicroFieldsFromProposal({
    micro_central: 'micro',
    microinverters: [
      { id: 'A', mppt: 2, qty: 3 },
      { id: 'B', mppt: 4, qty: 1 }
    ]
  });

  assert.equal(fields.ID_Micro_2_Panel, 'A', 'Debe mapear ID para micro de 2 MPPT');
  assert.equal(fields.Cantidad_Micro_2_Panel, 3, 'Debe mapear cantidad para micro de 2 MPPT');
  assert.equal(fields.ID_Micro_4_Panel, 'B', 'Debe mapear ID para micro de 4 MPPT');
  assert.equal(fields.Cantidad_Micro_4_Panel, 1, 'Debe mapear cantidad para micro de 4 MPPT');
}

function testMicroAirtableMappingErrorOnMultipleIds() {
  assert.throws(() => buildMicroFieldsFromProposal({
    micro_central: 'micro',
    microinverters: [
      { id: 'A', mppt: 2, qty: 1 },
      { id: 'B', mppt: 2, qty: 2 }
    ]
  }), /único modelo de microinversor de 2 MPPT/, 'Debe fallar con múltiples IDs por MPPT');
}

function run() {
  testMicroAllSiCombo();
  testMicroOnlyNoTrunk();
  testCentralInverterTieBreaking();
  testMicroAirtableMapping();
  testMicroAirtableMappingErrorOnMultipleIds();
  console.log('✅ Tests passed');
}

run();
