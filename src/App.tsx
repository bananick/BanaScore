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
import { ColorRankings } from './pages/ColorRankings';
import { WorkshopRankings } from './pages/WorkshopRankings';
import { Projection } from './pages/Projection';
import { ScorerGuard } from './pages/ScorerGuard';
import { ScoreHome } from './pages/ScoreHome';
import { ScoreActivity } from './pages/ScoreActivity';
import { Access } from './pages/Access';
import { OfflineBanner } from './components/OfflineBanner';

function App() {
  return (
    <ToastProvider>
      <OfflineBanner />
      <Router>
        <Routes>
          <Route path="/access" element={<Access />} />
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
          <Route path="/event/:id/workshops" element={<WorkshopRankings />} />
          <Route path="/event/:id/board" element={<Projection />} />
          <Route
            path="/score/:eventId"
            element={
              <ScorerGuard>
                <ScoreHome />
              </ScorerGuard>
            }
          />
          <Route
            path="/score/:eventId/a/:activityId"
            element={
              <ScorerGuard>
                <ScoreActivity />
              </ScorerGuard>
            }
          />
          <Route path="/event/:id/ranking/colors" element={<ColorRankings />} />
          <Route path="/event/:id/ranking/:type" element={<Ranking />} />
          <Route path="/event/:id/ranking/:type/:activityId" element={<Ranking />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
