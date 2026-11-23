// Same limits the server checks (Laravel "image" + "max:10240"), so staff find out
// right away when they pick a file instead of when they press Submit.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"];

/** Returns a plain-English reason the file can't be uploaded, or null if it is fine. */
export const imageFileProblem = (file) => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" can't be uploaded. Please use a JPG or PNG image (iPhone HEIC photos must be saved as JPG first).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB, so please scan or photograph it at a smaller size.`;
  }
  return null;
};
