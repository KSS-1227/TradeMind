import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0D1F35',
            color: '#F0F4F8',
            border: '1px solid #1E3A5F',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
          },
          success: {
            iconTheme: { primary: '#00C9A7', secondary: '#04131d' },
          },
          error: {
            iconTheme: { primary: '#F25C54', secondary: '#fff' },
          },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
