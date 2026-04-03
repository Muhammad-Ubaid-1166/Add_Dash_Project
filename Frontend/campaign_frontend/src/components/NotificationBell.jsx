import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, TrendingDown, DollarSign, X } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  // FIX: Remove duplicate notifications if the WebSocket sends them twice
  const uniqueNotifications = useMemo(() => {
    const seen = new Set();
    return notifications.filter((notification) => {
      if (seen.has(notification.id)) {
        return false; // Skip duplicates
      }
      seen.add(notification.id);
      return true;
    });
  }, [notifications]);

  // FIX: Recalculate the unread count based on the unique list
  const actualUnreadCount = useMemo(() => {
    return uniqueNotifications.filter(n => !n.is_read).length;
  }, [uniqueNotifications]);

  const getAlertIcon = (type) => {
    if (type === 'budget_exceeded') return <DollarSign size={16} className="text-orange-500" />;
    if (type === 'ctr_drop') return <TrendingDown size={16} className="text-red-500" />;
    return <AlertTriangle size={16} className="text-yellow-500" />;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button 
        onClick={() => { setIsOpen(!isOpen); if (isOpen) markAsRead(); }} 
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-600 dark:text-gray-400 hover:scale-105 active:scale-95"
      >
        <Bell size={20} />
        {/* FIX: Use actualUnreadCount instead of unreadCount */}
        {actualUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full font-bold shadow-lg shadow-red-500/30">
            {actualUnreadCount > 9 ? '9+' : actualUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="font-semibold text-gray-800 dark:text-white">Notifications</h4>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {uniqueNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-500 text-sm">
                No alerts yet. Waiting for threshold breaches...
              </div>
            ) : (
              // FIX: Map over uniqueNotifications instead of notifications
              uniqueNotifications.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all duration-150 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="mt-0.5 flex-shrink-0 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{alert.campaign_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.message}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium uppercase tracking-wide">{formatTime(alert.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;