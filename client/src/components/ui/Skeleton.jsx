// src/components/ui/Skeleton.jsx
export default function Skeleton({ height = 'h-4', width = 'w-full', rounded = 'rounded' }) {
  return (
    <div className={`animate-pulse bg-gray-300 dark:bg-gray-700 ${height} ${width} ${rounded}`}></div>
  );
}
