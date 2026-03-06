import { useNavigate } from 'react-router-dom';
import { MdBlock, MdArrowBack } from 'react-icons/md';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md p-8 text-center">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
          <MdBlock className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">403</h1>
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="mb-8 text-gray-500">
          You do not have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MdArrowBack className="w-5 h-5" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
