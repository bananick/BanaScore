import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './toast';
import { Home } from './pages/Home';
import { AdminGuard } from './pages/AdminGuard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminEventDetail } from './pages/AdminEventDetail';
import { Register } from './pages/Register';
import { EventView } from './pages/EventView';
import { Ranking } from './pages/Ranking';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/event/:id"
            element={
              <AdminGuard>
                <AdminEventDetail />
              </AdminGuard>
            }
          />
          <Route path="/register/:token" element={<Register />} />
          <Route path="/event/:id" element={<EventView />} />
          <Route path="/event/:id/ranking/:type" element={<Ranking />} />
          <Route path="/event/:id/ranking/:type/:activityId" element={<Ranking />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
