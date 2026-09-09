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
};

export default function DisciplineWorkspace({ department }) {
  const [title, description, reportCategory] = META[department] || META.process;
  return (
    <Process
      pageTitle={title}
      pageDescription={description}
      documentTypes={getReadableDocumentTypesForDepartment(department)}
      initialLogs={['DocCheck AI Engine Ready', `Awaiting ${title} upload.`]}
      reportCategory={reportCategory}
    />
  );
}
