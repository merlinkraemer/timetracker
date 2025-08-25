import React from 'react';
import { CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface SyncIndicatorProps {
  status: 'synced' | 'syncing' | 'conflict' | 'error';
  className?: string;
}

export function SyncIndicator({ status, className = '' }: SyncIndicatorProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          text: 'Synced',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          text: 'Syncing...',
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          text: 'Conflict',
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          text: 'Error',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.bgColor} ${className}`}>
      <Icon className={`w-4 h-4 ${statusInfo.color}`} />
      <span className={`text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
      {status === 'syncing' && (
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      )}
    </div>
  );
}
