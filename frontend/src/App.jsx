import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function App() {
  const [apiStatus, setApiStatus] = useState("Connecting to Backend...");

  useEffect(() => {
    // Attempting to hit your FastAPI entry route
    axios.get('http://127.0.0.1:8000/')
      .then(response => {
        setApiStatus(`Connected! DB Status: ${response.data.database_status}`);
      })
      .catch(error => {
        setApiStatus("Backend API offline or CORS error.");
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-gray-100 p-4">
      <div className="p-8 max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-xl space-y-4">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          SFEWS Frontend Dashboard initialized
        </h1>
        <p className="text-gray-400">
          React, Vite, and Tailwind CSS styles are successfully integrated.
        </p>
        <div className="p-3 bg-gray-950 border border-gray-800 rounded-lg text-sm font-mono">
          <span className="text-gray-500">System Handshake:</span> {apiStatus}
        </div>
      </div>
    </div>
  );
}
