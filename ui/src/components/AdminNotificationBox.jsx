import { useState } from 'react';
import { api } from '../api';

export default function AdminNotificationBox() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setStatus({ type: 'error', text: 'Subject and message cannot be empty.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: '', text: '' });

    try {
      const res = await api.broadcastNotification({ subject, message });
      setStatus({ type: 'success', text: res.message || 'Notification sent successfully!' });
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to send notification.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4 mx-4 sm:mx-0">
      <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
        <h2 className="text-sm font-bold text-blue-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          Send App Notification (Broadcast)
        </h2>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSend} className="space-y-3">
          {status.text && (
            <div className={`p-2.5 rounded text-xs font-medium ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {status.text}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Subject / Title</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Important Update for All Members"
              className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Message Content</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
              className="w-full border border-gray-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading}
            ></textarea>
          </div>
          
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send to All
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
