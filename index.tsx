
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Глобальный перехватчик ошибок для отладки в Telegram
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error:", message, "at", source, lineno, colno);
  // В продакшене можно выводить уведомление пользователю
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
