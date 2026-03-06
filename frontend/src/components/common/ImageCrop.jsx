import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Button from './Button';

const ImageCrop = ({
  src,
  onCropComplete,
  aspectRatio = 1,
  minWidth = 100,
  minHeight = 100,
  circularCrop = false,
  className = ''
}) => {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  function onImageLoad(e) {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  }

  const generateCroppedImage = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio * scaleX;
    canvas.height = crop.height * pixelRatio * scaleY;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas is empty');
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  }, [completedCrop]);

  const handleCropSave = async () => {
    const croppedImageBlob = await generateCroppedImage();
    if (croppedImageBlob && onCropComplete) {
      onCropComplete(croppedImageBlob);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-center">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          minWidth={minWidth}
          minHeight={minHeight}
          circularCrop={circularCrop}
        >
          <img
            ref={imgRef}
            alt="Crop preview"
            src={src}
            onLoad={onImageLoad}
            className="max-w-full max-h-96 object-contain"
          />
        </ReactCrop>
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          onClick={handleCropSave}
          disabled={!completedCrop?.width || !completedCrop?.height}
          variant="primary"
        >
          Save Crop
        </Button>
      </div>

      {/* Hidden canvas for generating cropped image */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};

// Helper function to create centered aspect crop
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default ImageCrop;