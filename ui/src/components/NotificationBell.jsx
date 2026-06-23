import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: could set up an interval here for polling, but for now just fetch on mount
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('bn-BD', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) fetchNotifications(); // Refresh on open
        }}
        className="relative w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-white"
        title="নোটিফিকেশন (Notifications)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm">নোটিফিকেশন (Notifications)</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-brand-navy hover:text-blue-600 transition"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                কোনো নোটিফিকেশন নেই (No notifications)
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <li 
                    key={n.id} 
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`p-4 transition cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/30' : 'bg-white'}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1">
                        {n.type === 'transaction' ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </h4>
                        <p className={`text-xs mt-1 leading-relaxed ${!n.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                          {n.message}
                        </p>
                        <span className="text-[10px] font-medium text-gray-400 mt-2 block">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 shadow-sm"></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
