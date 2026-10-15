// Lets a page (e.g. an unfinished status-change upload panel) register a confirmation
// check that runs before in-app navigation away from it — used by the nav bars so
// clicking Home/Upload/Customer Profiles/Logout doesn't silently discard unsaved work.
let guard = null;

export const setNavigationGuard = (confirmFn) => {
  guard = confirmFn;
};

export const confirmNavigation = async () => {
  if (!guard) return true;
  return guard();
};
