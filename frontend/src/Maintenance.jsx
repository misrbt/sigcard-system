import { motion } from "framer-motion";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import logo from "./assets/images/logos.png";
import { useAppConfig } from "./context/AppConfigContext";

const Maintenance = () => {
  const { app_abbreviation, app_logo_url } = useAppConfig();
  const logoSrc = app_logo_url || logo;
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#030b1d]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d]" />
      <div className="absolute inset-0 opacity-50">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#f59e0b]/30 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#1877F2]/20 blur-[100px]" />
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
            src={logoSrc}
            alt={`${app_abbreviation} Logo`}
            className="mx-auto h-24 w-auto object-contain drop-shadow-2xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col items-center"
          >
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-amber-500/20 border border-amber-400/30 mb-6">
              <HiWrenchScrewdriver className="w-12 h-12 text-amber-400" />
            </div>

            <h1 className="text-4xl font-bold text-white/90 sm:text-5xl">
              System Maintenance
            </h1>

            <div className="mt-4 space-y-2">
              <p className="text-lg text-white/70 max-w-md mx-auto leading-relaxed">
                The {app_abbreviation} system is temporarily offline for scheduled
                maintenance. We apologize for the inconvenience.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-6 py-4 text-sm text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              Maintenance in progress — please check back shortly.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-16"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">
              RBT Bank Secure Network
            </p>
            <p className="mt-2 text-sm text-white/50">{app_abbreviation} Access Portal</p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="relative z-10 w-full px-4 py-4 text-center text-sm text-gray-400"
      >
        <p>&copy; {new Date().getFullYear()} RBT Bank Inc. All rights reserved.</p>
      </motion.div>
    </div>
  );
};

export default Maintenance;
