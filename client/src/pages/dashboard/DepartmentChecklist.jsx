import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { getChecklistItemsForDepartment } from './departmentChecklistData';

export default function DepartmentChecklist({
  title,
  basePath,
}) {
  const checklistItems = getChecklistItemsForDepartment(basePath);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-6">{title}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {checklistItems.map((item, index) => (
          <Link
            to={`/dashboard/${basePath}/${index}`}
            key={index}
            className="flex bg-white dark:bg-gray-800 rounded-xl shadow border dark:border-gray-700 hover:shadow-md transition"
          >
            <div className="p-4 flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <FileText className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{item.title}</h3>
              </div>
              {item.supportDocuments ? (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-2" title={item.supportDocuments}>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Support documents (reference): </span>
                  {item.supportDocuments}
                </p>
              ) : null}
              <p className="text-xs text-gray-500 dark:text-gray-400">Click to open</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
