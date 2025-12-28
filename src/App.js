import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GovernmentLogin from './Login';
import CreatePasswordPage from './CreatePassword';
import GovDashBoard from './GovDashBoard';
import DelhiAQIMap from './HomePage';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DelhiAQIMap />}/>
        <Route path="/login" element={<GovernmentLogin />} />
        <Route path="/create-password" element={<CreatePasswordPage />} />
        <Route path="/gov-dashboard" element={<GovDashBoard />} />
      </Routes>
    </BrowserRouter>
  );
}