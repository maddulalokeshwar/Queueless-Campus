import { Link } from 'react-router-dom';
import Blobs from '../components/Blobs.jsx';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 text-center">
      <Blobs c1="bg-violet-400" c2="bg-fuchsia-300" c3="bg-yellow-300" />
      <div className="max-w-lg space-y-6">
        <div className="text-7xl animate-bounce">🎟️</div>
        <h1 className="text-5xl font-black text-white drop-shadow-lg">QueueLess Campus</h1>
        <p className="text-purple-200 text-lg">
          Skip the physical line. Get a digital token, track your position live, and know exactly when it's your turn.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          {[['⚡','Real-time'], ['🔔','Smart Alerts'], ['📅','Pre-Book']].map(([e,t]) => (
            <span key={t} className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm backdrop-blur">
              {e} {t}
            </span>
          ))}
        </div>
        <div className="flex gap-4 justify-center pt-4">
          <Link to="/register"
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 active:scale-95 transition text-white font-bold px-8 py-3 rounded-xl shadow-lg">
            Get Started
          </Link>
          <Link to="/login"
            className="bg-white/10 border border-white/30 hover:bg-white/20 active:scale-95 transition text-white font-bold px-8 py-3 rounded-xl backdrop-blur">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}