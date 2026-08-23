'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
  iconClassName?: string;
}

export const LiveClock: React.FC<LiveClockProps> = ({
  className = '',
  showDate = true,
  iconClassName = 'w-4 h-4',
}) => {
  const [timeState, setTimeState] = useState({
    time: '',
    dateString: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeState({
        time: now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        dateString: now.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      });
    };

    updateTime();
    // 60x optimization: Tick once per minute (60,000ms) instead of every second
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, []);

  if (!timeState.time) return null;

  return (
    <div className={`flex items-center space-x-2 font-mono font-bold ${className}`}>
      <Clock className={iconClassName} />
      <span>{timeState.time}</span>
      {showDate && (
        <span className="text-[10px] opacity-75 font-sans border-l border-current/30 pl-2 ml-1 uppercase">
          {timeState.dateString}
        </span>
      )}
    </div>
  );
};
