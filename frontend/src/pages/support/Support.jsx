import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiOutlineSearch, 
  HiOutlineChevronDown, 
  HiOutlineSupport, 
  HiOutlineMail, 
  HiOutlineChat,
  HiOutlineLockClosed,
  HiOutlineUpload,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineDocumentText
} from "react-icons/hi";
import { quickFixes } from "./quickFixesMeta";
import Navbar from "../../components/layout/Navbar";

const categoryIcons = {
  "Account & Access": HiOutlineLockClosed,
  "Document Upload": HiOutlineUpload,
  "Customer Records": HiOutlineUsers,
  "System & Compliance": HiOutlineShieldCheck,
  "General": HiOutlineDocumentText
};

const categories = Array.from(new Set(quickFixes.map(f => f.category)));

const Support = () => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredFixes = quickFixes.filter(
    (fix) =>
      fix.title.toLowerCase().includes(search.toLowerCase()) ||
      fix.content.toLowerCase().includes(search.toLowerCase()) ||
      fix.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchSelect = (fix) => {
    setSearch(fix.title);
    setExpandedId(fix.id);
    setShowDropdown(false);
  };

  const handleCategoryClick = (category) => {
    setSearch(category);
    setExpandedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-10 pb-24">
        {/* Header Section */}
        <div className="max-w-4xl mx-auto mb-12 text-center mt-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
              <HiOutlineSupport className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              How can we help you?
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
              Search our knowledge base or browse frequently asked questions below to find quick fixes and solutions.
            </p>
            
            {/* Search Bar with Live Dropdown */}
            <div className="relative max-w-xl mx-auto" ref={searchRef}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HiOutlineSearch className="h-6 w-6 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search for answers..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg shadow-sm"
              />
              
              {/* Live Search Dropdown */}
              <AnimatePresence>
                {showDropdown && search.trim() !== "" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left"
                  >
                    {filteredFixes.length > 0 ? (
                      <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {filteredFixes.map((fix) => (
                          <li key={fix.id}>
                            <button
                              onClick={() => handleSearchSelect(fix)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors flex flex-col gap-1"
                            >
                              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                {fix.category}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">
                                {fix.title}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">
                        No results found for "{search}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto">
          {/* Category Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 px-2 text-center md:text-left">Browse by Topic</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((category, index) => {
                const Icon = categoryIcons[category] || HiOutlineDocumentText;
                return (
                  <motion.button
                    key={category}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleCategoryClick(category)}
                    className="flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-600">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-slate-800 text-sm">
                      {category}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-2xl font-bold text-slate-900">Quick Fixes & FAQs</h2>
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <AnimatePresence>
                {filteredFixes.length > 0 ? (
                  filteredFixes.map((fix, index) => (
                    <motion.div
                      key={fix.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <button
                        onClick={() => setExpandedId(expandedId === fix.id ? null : fix.id)}
                        className="w-full flex items-center justify-between p-5 text-left focus:outline-none focus:bg-slate-50"
                      >
                        <div className="flex flex-col pr-4">
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                            {fix.category}
                          </span>
                          <span className="text-lg font-semibold text-slate-800">
                            {fix.title}
                          </span>
                        </div>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${expandedId === fix.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                          <motion.div
                            animate={{ rotate: expandedId === fix.id ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <HiOutlineChevronDown className="w-5 h-5" />
                          </motion.div>
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedId === fix.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="px-5 pb-5 text-slate-600 leading-relaxed border-t border-slate-50 pt-4">
                              {fix.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed"
                  >
                    <HiOutlineSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">No results found</h3>
                    <p className="text-slate-500">We couldn't find any articles matching "{search}"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Still need help */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 max-w-3xl mx-auto bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d] rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-xl shadow-slate-900/20"
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, #487FFF 0%, transparent 70%)" }} />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-3">Still need help?</h3>
              <p className="text-blue-200/80 mb-8 max-w-lg mx-auto">
                If you couldn't find the answer to your question, our support team is ready to assist you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="w-full sm:w-auto px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                  <HiOutlineChat className="w-5 h-5 text-blue-600" />
                  Live Chat
                </button>
                <button className="w-full sm:w-auto px-6 py-3 bg-white/10 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm">
                  <HiOutlineMail className="w-5 h-5" />
                  Contact Support
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Support;
