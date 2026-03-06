import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HiHome, HiArrowLeft } from "react-icons/hi";
import logo from "./assets/images/logos.png";

const NotFound = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#030b1d]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d]" />
      <div className="absolute inset-0 opacity-50">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#1877F2]/40 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#FF6B35]/30 blur-[100px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle,_rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:120px_120px]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl text-center"
        >
          <img
            src={logo}
            alt="Sigcard Logo"
            className="mx-auto h-24 w-auto object-contain drop-shadow-2xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12"
          >
            <h1 className="text-9xl font-bold text-white/90">404</h1>
            <div className="mt-4 space-y-2">
              <h2 className="text-3xl font-semibold text-white">
                Page Not Found
              </h2>
              <p className="text-lg text-white/70">
                The page you are looking for doesn't exist or has been moved.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1877F2] via-[#1a64dd] to-[#0e3ea1] px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:brightness-110 hover:shadow-blue-500/50"
            >
              <HiHome className="h-5 w-5" />
              Go to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <HiArrowLeft className="h-5 w-5" />
              Go Back
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">
              RBT Bank Secure Network
            </p>
            <p className="mt-2 text-sm text-white/70">Sigcard Access Portal</p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="relative z-10 w-full px-4 py-4 text-center text-sm text-gray-300"
      >
        <p>
          &copy; {new Date().getFullYear()} RBT Bank Inc. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default NotFound;
