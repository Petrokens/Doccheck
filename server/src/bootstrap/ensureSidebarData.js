const sidebarRepo = require('../db/repositories/sidebarRepository');

const QA = '/dashboard/qa-qc';

const SECTIONS = [
  { id: 1, name: 'Disciplines', display_order: 1 },
  { id: 2, name: 'Workspace', display_order: 2 },
  { id: 3, name: 'AI QC', display_order: 3 },
  { id: 7, name: 'Administration', display_order: 7 },
];

const ITEMS = [
  { id: 1, section_id: 1, label: 'Process', path: `${QA}/process`, icon_name: 'Flame', display_order: 1 },
  { id: 2, section_id: 1, label: 'Piping', path: `${QA}/piping`, icon_name: 'Wrench', display_order: 2 },
  { id: 3, section_id: 1, label: 'Pipeline', path: `${QA}/pipeline`, icon_name: 'Route', display_order: 3 },
  { id: 4, section_id: 1, label: 'Civil & Structural', path: `${QA}/civil-structural`, icon_name: 'Building', display_order: 4 },
  { id: 5, section_id: 1, label: 'Mechanical - Rotating', path: `${QA}/mechanical-rotating`, icon_name: 'Cog', display_order: 5 },
  { id: 6, section_id: 1, label: 'Mechanical - Static', path: `${QA}/mechanical-static`, icon_name: 'Cpu', display_order: 6 },
  { id: 7, section_id: 1, label: 'Electrical', path: `${QA}/electrical`, icon_name: 'Zap', display_order: 7 },
  { id: 8, section_id: 1, label: 'HVAC', path: `${QA}/hvac`, icon_name: 'Thermometer', display_order: 8 },
  { id: 9, section_id: 1, label: 'Instrumentation', path: `${QA}/instrumentation`, icon_name: 'Activity', display_order: 9 },
  { id: 10, section_id: 1, label: 'Telecom', path: `${QA}/telecom`, icon_name: 'RadioTower', display_order: 10 },
  { id: 11, section_id: 1, label: 'HSE', path: `${QA}/hse`, icon_name: 'Shield', display_order: 11 },
  { id: 12, section_id: 1, label: 'General', path: `${QA}/general-discipline`, icon_name: 'Layers', display_order: 0 },
  { id: 13, section_id: 2, label: 'History', path: `${QA}/history`, icon_name: 'Clock', display_order: 1 },
  { id: 14, section_id: 2, label: 'Info', path: '/dashboard/info', icon_name: 'Info', display_order: 2 },
  { id: 15, section_id: 3, label: 'AI QC Inbox', path: `${QA}/ai-review`, icon_name: 'Brain', display_order: 1 },
  { id: 22, section_id: 7, label: 'Master Admin', path: '/dashboard/users', icon_name: 'Users', display_order: 1 },
  { id: 23, section_id: 7, label: 'Role Management', path: '/dashboard/roles', icon_name: 'Key', display_order: 2 },
  { id: 24, section_id: 7, label: 'Access Control', path: '/dashboard/permissions', icon_name: 'Lock', display_order: 3 },
  { id: 25, section_id: 7, label: 'Audit Reports', path: '/dashboard/audit-reports', icon_name: 'FileSearch', display_order: 4 },
  { id: 26, section_id: 7, label: 'System Logs', path: '/dashboard/system-logs', icon_name: 'FileCode', display_order: 5 },
  { id: 28, section_id: 7, label: 'API Docs', path: '/dashboard/api-docs', icon_name: 'BookOpen', display_order: 6 },
];

const REMOVED_ITEM_IDS = [16, 17, 18, 19, 20, 21, 27]; // Report Templates, Analytics, System Status, Environment Config, Create User
const REMOVED_SECTION_IDS = [4, 5, 6]; // Documents, Analytics, System — no longer shown

async function ensureSidebarData() {
  for (const section of SECTIONS) await sidebarRepo.upsertSection(section);
  for (const item of ITEMS) await sidebarRepo.upsertItem(item);
  for (const id of REMOVED_ITEM_IDS) await sidebarRepo.deleteItem(id);
  await sidebarRepo.deleteItemsNotIn(ITEMS.map((item) => item.id));
  for (const id of REMOVED_SECTION_IDS) await sidebarRepo.deleteSection(id);
  await sidebarRepo.deleteSectionsNotIn(SECTIONS.map((section) => section.id));
  console.log('QA/QC sidebar data ensured');
}

module.exports = ensureSidebarData;
