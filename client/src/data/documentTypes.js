export const DOCUMENT_TYPES = {
  process: [
    'Process Design Basis',
    'Process Flow Diagram (PFD)',
    'P&ID',
    'Heat and Material Balance',
    'Equipment Datasheet',
    'Line List',
    'Cause and Effect Matrix',
    'Control Philosophy',
    'Equipment List',
    'Process Design Calculations',
    'PSV / Relief and Blowdown Study',
    'Process Simulation Report',
    'Performance Test Procedure',
  ],
  piping: [
    'Plot Plan',
    'Piping General Arrangement',
    'Piping Isometric',
    'Piping Material Specification',
    'Pipe Stress Analysis',
    'Piping Support Drawing',
    'Line List / LDT',
  ],
  pipeline: [
    'Pipeline Design Basis',
    'Alignment Sheet',
    'Pipeline Hydraulic Study',
    'Pipeline Crossing Drawing',
    'Pipeline Material Specification',
  ],
  civil: [
    'Civil Design Basis',
    'Foundation Drawing',
    'Structural Steel Drawing',
    'Piling Layout',
    'Drainage Layout',
  ],
  'mechanical-rotating': [
    'Rotating Equipment Datasheet',
    'Compressor Package Datasheet',
    'Pump Datasheet',
    'Mechanical Handling Study',
  ],
  'mechanical-static': [
    'Pressure Vessel Datasheet',
    'Heat Exchanger Datasheet',
    'Tank Datasheet',
    'Static Equipment List',
  ],
  electrical: [
    'Single Line Diagram (SLD)',
    'Electrical Load List',
    'Cable Schedule',
    'Motor Control Schematic',
    'Earthing Layout',
  ],
  hvac: ['HVAC Design Basis', 'HVAC Duct Layout', 'HVAC Equipment Datasheet'],
  instrumentation: [
    'Instrument Index',
    'I/O List',
    'Loop Diagram',
    'Cause and Effect Matrix',
    'Instrument Datasheet',
  ],
  telecom: ['Telecom Design Basis', 'Telecom Block Diagram', 'Cable Routing Drawing'],
  hse: ['HSE Design Basis', 'HAZOP Report', 'Fire & Gas Layout', 'Escape Route Drawing'],
  general: ['General Engineering Deliverable', 'Project Specification', 'Interface Register'],
};

export function getReadableDocumentTypesForDepartment(key) {
  if (key === 'civil-structural') return DOCUMENT_TYPES.civil;
  if (key === 'mechanical') return [...DOCUMENT_TYPES['mechanical-rotating'], ...DOCUMENT_TYPES['mechanical-static']];
  if (key === 'general-discipline') return DOCUMENT_TYPES.general;
  return DOCUMENT_TYPES[key] || DOCUMENT_TYPES.process;
}
