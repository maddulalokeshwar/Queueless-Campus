export default function Blobs({ c1='bg-purple-300', c2='bg-yellow-300', c3='bg-pink-300' }) {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <div className={`absolute top-0 -left-4 w-72 h-72 ${c1} rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob`} />
      <div className={`absolute top-0 -right-4 w-72 h-72 ${c2} rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000`} />
      <div className={`absolute -bottom-8 left-20 w-72 h-72 ${c3} rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000`} />
    </div>
  );
}