import { Link } from "react-router-dom";

const Home = () => {
  return (
    <main className="flex flex-col flex-1 w-full max-w-5xl px-4 pt-12 pb-32 mx-auto text-center gap-14 sm:px-6 lg:px-8 lg:pt-20">
        <section className="space-y-8">
          <p className="text-base font-semibold uppercase tracking-[0.75em] text-blue-500 sm:text-lg lg:text-xl">
            Welcome to Sigcard System
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Manage, upload, and monitor every customer signature card with ease.
          </h1>
          <p className="max-w-3xl mx-auto text-lg leading-relaxed text-slate-600">
            Keep customer profiles current, track status changes, and provide
            teams with the latest artifacts. Choose a quick action below to get
            started.
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-base font-semibold">
            <Link
              to="/users/upload"
              className="rounded-2xl bg-slate-900 px-10 py-4 text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Upload
            </Link>
            <Link
              to="/users/customers"
              className="px-10 py-4 transition bg-white border shadow-md rounded-2xl border-slate-300 text-slate-700 hover:border-slate-400"
            >
              View Customer Profiles
            </Link>
          </div>
        </section>
      </main>
  );
};

export default Home;
