import { motion } from "framer-motion";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d] shadow-[0_-8px_30px_rgba(2,6,23,0.45)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full px-4 py-4 text-sm text-center text-gray-300 sm:px-6 lg:px-8"
        >
          <div className="space-y-2">
            <div className="flex flex-col items-center justify-center gap-1 text-gray-200 md:flex-row md:gap-4">
              <div className="flex flex-col items-center gap-1 md:flex-row md:gap-2">
                <h3 className="text-base font-semibold text-white">
                  RBT Bank Inc.
                </h3>
                <span className="hidden text-gray-500 md:inline">|</span>
                <p>A Rural Bank of Talisayan Misamis Oriental</p>
              </div>
              <span className="hidden text-gray-500 md:inline">|</span>
              <div>&copy; {currentYear} Sigcard System. All rights reserved.</div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 text-xs uppercase tracking-[0.4em] text-gray-400 md:flex-row md:gap-6">
              <div className="flex items-center gap-2 tracking-normal">
                <span className="text-gray-400">Powered by</span>
                <span className="font-semibold text-white">MIS Department</span>
              </div>
              <span className="hidden text-gray-600 md:inline">|</span>
              <div className="flex items-center gap-2 tracking-normal">
                <span className="text-gray-400">Designed &amp; Developed by</span>
                <span className="font-semibold text-white">Augustin Maputol</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="h-20" />
    </>
  );
};

export default Footer;
