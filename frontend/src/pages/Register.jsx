import { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import Blobs from '../components/Blobs';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await api.post('/auth/register', form); nav('/'); }
    catch { setError('Registration failed — try a different email'); }
    finally { setLoading(false); }
  };

  const icons = { name: '👤', email: '✉️', phone: '📱', password: '🔒' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900">
      <Blobs c1="bg-blue-400" c2="bg-cyan-300" c3="bg-indigo-300" />
      <form onSubmit={submit} className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-2">🚀</div>
          <h1 className="text-3xl font-black text-white">Create Account</h1>
          <p className="text-blue-200 text-sm">Join QueueLess Campus</p>
        </div>
        {error && <p className="bg-red-500/20 text-red-200 text-sm rounded-lg p-2 text-center border border-red-400/30">{error}</p>}
        {['name', 'email', 'phone', 'password'].map(f => (
          <div key={f} className="relative">
            <span className="absolute left-3 top-3">{icons[f]}</span>
            <input type={f === 'password' ? 'password' : 'text'}
              placeholder={f[0].toUpperCase() + f.slice(1)} value={form[f]} required
              className="w-full bg-white/20 text-white placeholder-blue-200 border border-white/30 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-cyan-400 outline-none"
              onChange={e => setForm({ ...form, [f]: e.target.value })} />
          </div>
        ))}
        <button disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 transition text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50">
          {loading ? 'Creating...' : 'Register →'}
        </button>
        <p className="text-center text-sm text-blue-200">
          Have an account? <Link to="/" className="text-cyan-300 font-bold hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}