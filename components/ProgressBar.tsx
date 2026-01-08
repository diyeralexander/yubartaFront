
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  unit?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, unit = 'Ton' }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-sm font-medium text-gray-700">
        <span>Progreso</span>
        <span>{`${current.toFixed(1)} / ${total} ${unit}`}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden">
        <div
          className="bg-teal-600 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-right text-sm font-bold text-teal-700 mt-1">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

export default ProgressBar;
