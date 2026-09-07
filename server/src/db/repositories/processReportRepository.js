const { pool } = require('../../config/db');

const QA_QC_SQL_FILTER = `(workflow IS NULL OR workflow = '' OR LOWER(workflow) IN ('qaqc', 'qa_qc', 'qa-qc'))`;

function mapReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    document_type: row.document_type,
    main_document_name: row.main_document_name,
    support_document_name: row.support_document_name,
    report_markdown: row.report_markdown,
    report_structured: row.report_structured,
    workflow: row.workflow,
    report_title: row.report_title,
    checked_by_user_id: row.checked_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function create(record) {
  const { rows } = await pool.query(
    `INSERT INTO process_reports (
       id, document_type, main_document_name, support_document_name,
       report_markdown, report_structured, workflow, report_title,
       checked_by_user_id, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, COALESCE($10::timestamptz, NOW()))
     RETURNING *`,
    [
      record.id,
      record.document_type,
      record.main_document_name,
      record.support_document_name || '',
      record.report_markdown,
      record.report_structured ? JSON.stringify(record.report_structured) : null,
      record.workflow || 'qaqc',
      record.report_title || '',
      record.checked_by_user_id || '',
      record.created_at || null,
    ],
  );
  return mapReport(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM process_reports WHERE id = $1', [id]);
  return mapReport(rows[0]);
}

async function update(id, { report_structured, report_title, report_markdown }) {
  const { rows } = await pool.query(
    `UPDATE process_reports
     SET report_structured = COALESCE($1::jsonb, report_structured),
         report_title = COALESCE($2, report_title),
         report_markdown = COALESCE($3, report_markdown),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [
      report_structured ? JSON.stringify(report_structured) : null,
      report_title ?? null,
      report_markdown ?? null,
      id,
    ],
  );
  return mapReport(rows[0]);
}

async function deleteById(id) {
  await pool.query('DELETE FROM process_reports WHERE id = $1', [id]);
}

function buildWhere(ownerFilter) {
  const parts = [QA_QC_SQL_FILTER];
  const values = [];
  if (ownerFilter?.checked_by_user_id) {
    values.push(ownerFilter.checked_by_user_id);
    parts.push(`checked_by_user_id = $${values.length}`);
  }
  return { clause: parts.join(' AND '), values };
}

async function countWithFilter(ownerFilter) {
  const { clause, values } = buildWhere(ownerFilter);
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM process_reports WHERE ${clause}`,
    values,
  );
  return rows[0].cnt;
}

async function findWithFilter(ownerFilter, { limit = 500 } = {}) {
  const { clause, values } = buildWhere(ownerFilter);
  const { rows } = await pool.query(
    `SELECT * FROM process_reports WHERE ${clause} ORDER BY created_at DESC LIMIT $${values.length + 1}`,
    [...values, limit],
  );
  return rows.map(mapReport);
}

module.exports = {
  create,
  findById,
  update,
  deleteById,
  countWithFilter,
  findWithFilter,
  QA_QC_SQL_FILTER,
};
