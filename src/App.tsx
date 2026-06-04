import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './toast';
import { Home } from './pages/Home';
import { AdminGuard } from './pages/AdminGuard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminEventDetail } from './pages/AdminEventDetail';
import { EventReport } from './pages/EventReport';
import { Posters } from './pages/Posters';
import { Register } from './pages/Register';
import { JoinEvent } from './pages/JoinEvent';
import { EventView } from './pages/EventView';
import { Ranking } from './pages/Ranking';
import { Projection } from './pages/Projection';

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
          <Route
            path="/admin/event/:id/report"
            element={
              <AdminGuard>
                <EventReport />
              </AdminGuard>
            }
          />
          <Route
            path="/admin/event/:id/posters"
            element={
              <AdminGuard>
                <Posters />
              </AdminGuard>
            }
          />
          <Route path="/register/:token" element={<Register />} />
          <Route path="/join/:eventId" element={<JoinEvent />} />
          <Route path="/event/:id" element={<EventView />} />
          <Route path="/event/:id/board" element={<Projection />} />
          <Route path="/event/:id/ranking/:type" element={<Ranking />} />
          <Route path="/event/:id/ranking/:type/:activityId" element={<Ranking />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
