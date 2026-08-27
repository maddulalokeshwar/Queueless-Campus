import { useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Blobs from '../components/Blobs';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  const submit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const { data } = await api.post('/auth/login', form);

    login(data);

    if (data.payload.role === 'admin') {
      nav('/admin');
    } else if (data.payload.role === 'staff') {
      nav('/staff');
    } else {
      nav('/student');
    }

  } catch {
    setError('Invalid email or password');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Blobs />
      <form onSubmit={submit} className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-2">🎟️</div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-purple-200 text-sm">Login to QueueLess Campus</p>
        </div>
        {error && <p className="bg-red-500/20 text-red-200 text-sm rounded-lg p-2 text-center border border-red-400/30">{error}</p>}
        <input type="email" placeholder="Email" value={form.email} required
          className="w-full bg-white/20 text-white placeholder-purple-200 border border-white/30 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 outline-none"
          onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" value={form.password} required
          className="w-full bg-white/20 text-white placeholder-purple-200 border border-white/30 rounded-xl p-3 focus:ring-2 focus:ring-pink-400 outline-none"
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <button disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 active:scale-95 transition text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login →'}
        </button>
        <p className="text-center text-sm text-purple-200">
          No account? <Link to="/register" className="text-pink-300 font-bold hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}