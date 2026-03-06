import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';

const FileUpload = ({
  onFileUpload,
  acceptedFileTypes = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
  },
  maxFiles = 1,
  maxSize = 5242880, // 5MB
  compressImages = true,
  compressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  },
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const compressImage = async (file) => {
    if (!compressImages || !file.type.startsWith('image/')) {
      return file;
    }

    try {
      const compressedFile = await imageCompression(file, compressionOptions);
      return compressedFile;
    } catch (error) {
      console.warn('Image compression failed, using original file:', error);
      return file;
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);

    try {
      const processedFiles = [];

      for (const file of acceptedFiles) {
        const processedFile = await compressImage(file);
        processedFiles.push({
          file: processedFile,
          preview: URL.createObjectURL(processedFile),
          name: file.name,
          size: processedFile.size,
          type: processedFile.type
        });
      }

      setUploadedFiles(prev => [...prev, ...processedFiles]);

      if (onFileUpload) {
        onFileUpload(processedFiles);
      }
    } catch (error) {
      console.error('File processing error:', error);
    } finally {
      setUploading(false);
    }
  }, [onFileUpload, compressImages, compressionOptions]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    maxSize,
    disabled: uploading
  });

  const removeFile = (index) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const baseClasses = 'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200';
  const activeClasses = isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400';
  const rejectClasses = isDragReject ? 'border-red-400 bg-red-50' : '';
  const disabledClasses = uploading ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`${baseClasses} ${activeClasses} ${rejectClasses} ${disabledClasses}`}
      >
        <input {...getInputProps()} />

        <div className="space-y-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          {uploading ? (
            <p className="text-sm text-gray-600">Processing files...</p>
          ) : isDragActive ? (
            <p className="text-sm text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-sm text-gray-600">
                Drag and drop files here, or <span className="text-blue-600 underline">browse</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max {maxFiles} file(s), up to {(maxSize / 1024 / 1024).toFixed(1)}MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800">Some files were rejected:</h4>
          <ul className="mt-1 text-sm text-red-700">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.path}>
                {file.path} - {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((fileObj, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {fileObj.type.startsWith('image/') ? (
                    <img
                      src={fileObj.preview}
                      alt={fileObj.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mt-1">
                  <p className="text-xs text-gray-600 truncate">{fileObj.name}</p>
                  <p className="text-xs text-gray-400">{(fileObj.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;