import Process from './Process';
import { getReadableDocumentTypesForDepartment } from '@/data/documentTypes';

const META = {
  process: ['Process Document QA/QC', 'Upload process deliverables for scored QA/QC.', 'process'],
  piping: ['Piping Document QA/QC', 'Upload piping drawings, specs, and calculations.', 'piping'],
  pipeline: ['Pipeline Document QA/QC', 'Upload pipeline design packages for QA/QC.', 'pipeline'],
  civil: ['Civil & Structural Document QA/QC', 'Upload civil and structural deliverables.', 'civil'],
  'mechanical-rotating': ['Mechanical Rotating QA/QC', 'Upload rotating equipment packages.', 'mechanical-rotating'],
  'mechanical-static': ['Mechanical Static QA/QC', 'Upload vessels, exchangers, and tanks.', 'mechanical-static'],
  electrical: ['Electrical Document QA/QC', 'Upload SLDs, load lists, and cable schedules.', 'electrical'],
  hvac: ['HVAC Document QA/QC', 'Upload HVAC design packages.', 'hvac'],
  instrumentation: ['Instrumentation Document QA/QC', 'Upload I&C indexes, loops, and datasheets.', 'instrumentation'],
  telecom: ['Telecom Document QA/QC', 'Upload telecom design packages.', 'telecom'],
  hse: ['HSE Document QA/QC', 'Upload HSE, HAZOP, and F&G documents.', 'hse'],
  general: ['General Document QA/QC', 'Upload general engineering deliverables.', 'general'],
  common: [
    'EPC Common Document Check',
    'Upload any EPC project document — method statements, ITPs, MRs, vendor packs, drawings, and more — for scored QA/QC.',
    'common',
  ],
};

const PROCESS_EXTRAS = {
  common: {
    documentTypeLabel: 'EPC Document Type',
    documentTypeHint: 'Upload an EPC deliverable and we will match the document type automatically.',
    uploadHint: 'Drag and drop any EPC project document here — type is selected automatically',
    generateButtonLabel: 'Start EPC Document Check',
    generatingButtonLabel: 'Running EPC Document Check...',
    initialLogs: [
      'EPC Common Document Check Ready',
      'Supports method statements, ITPs, quality plans, MRs, vendor documents, and other EPC deliverables.',
      'Awaiting EPC document upload.',
    ],
  },
};

export default function DisciplineWorkspace({ department }) {
  const [title, description, reportCategory] = META[department] || META.process;
  const extras = PROCESS_EXTRAS[department] || {};
  return (
    <Process
      pageTitle={title}
      pageDescription={description}
      documentTypes={getReadableDocumentTypesForDepartment(department)}
      initialLogs={extras.initialLogs || ['DocCheck AI Engine Ready', `Awaiting ${title} upload.`]}
      reportCategory={reportCategory}
      documentTypeLabel={extras.documentTypeLabel}
      documentTypeHint={extras.documentTypeHint}
      uploadHint={extras.uploadHint}
      generateButtonLabel={extras.generateButtonLabel}
      generatingButtonLabel={extras.generatingButtonLabel}
    />
  );
}
