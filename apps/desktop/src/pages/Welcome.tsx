import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UilLock, UilUserCircle, UilShieldCheck } from '@iconscout/react-unicons';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-cyan-500/4 rounded-full blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8 px-8 text-center max-w-sm"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/10"
        >
          <UilShieldCheck size={32} className="text-blue-400" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white font-['JetBrains_Mono',monospace] uppercase">
            CROWBYTE
          </h1>
          <p className="text-xs text-zinc-500 tracking-widest uppercase font-mono">
            AI Cybersecurity Terminal
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Message */}
        <div className="space-y-1.5">
          <p className="text-sm text-zinc-400">Welcome back.</p>
          <p className="text-xs text-zinc-600">Sign in to access your workspace.</p>
        </div>

        {/* CTA button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/auth')}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold font-mono tracking-wide transition-all duration-200 shadow-lg shadow-blue-600/20"
        >
          <UilLock size={16} />
          Sign In
        </motion.button>

        {/* Create account link */}
        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <UilUserCircle size={13} />
          <span>Don't have an account? <span className="text-zinc-400 underline underline-offset-2">Create one</span></span>
        </button>

        {/* Footer */}
        <p className="text-[10px] text-zinc-700 font-mono">v2.0.0 · by HLSITech</p>
      </motion.div>
    </div>
  );
}
