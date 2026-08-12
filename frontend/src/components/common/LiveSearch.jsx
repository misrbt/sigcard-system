import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineSearch, HiOutlineX } from "react-icons/hi";
import api from "../../services/api";

const LiveSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/user/customers?search=${encodeURIComponent(query)}&limit=5`);
        setResults(res.data?.data?.data || res.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const debounceId = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(debounceId);
  }, [query]);

  const handleSelect = (id) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/user/customers/${id}/view`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <HiOutlineSearch className="absolute left-3 text-white/50 w-5 h-5" />
        <input
          type="text"
          placeholder="Search customers..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="bg-white/10 text-white placeholder-white/50 border border-white/10 rounded-full py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 text-white/50 hover:text-white transition-colors"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-gray-900">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center animate-pulse">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelect(customer.id)}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="font-semibold text-sm truncate">{customer.full_name}</div>
                  <div className="text-xs text-gray-500 truncate flex gap-2">
                    <span className="uppercase text-blue-600">{customer.account_type}</span>
                    <span>&bull;</span>
                    <span className="capitalize">{customer.status}</span>
                  </div>
                </div>
              ))}
              <div
                className="px-4 py-2 bg-gray-50 text-center text-xs font-semibold text-blue-600 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/user/customers?search=${encodeURIComponent(query)}`);
                }}
              >
                View all results
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-gray-500 text-center">
              No customers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveSearch;
