/**
 * Converts an image File to WebP format using HTML5 Canvas.
 * This approach avoids any backend dependencies for image conversion.
 * 
 * @param {File} file - The original image file.
 * @param {number} quality - The quality of the WebP image (0.0 to 1.0).
 * @returns {Promise<File>} - A promise that resolves to the new WebP File.
 */
export const convertToWebP = (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // If it's already a WebP or not an image, just return the original file
    if (!file.type || !file.type.startsWith('image/') || file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File object from the Blob
              const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              const newFile = new File([blob], newFileName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              // Fallback to original file if conversion fails
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file); // Fallback on error
    };
    reader.onerror = () => resolve(file); // Fallback on error
  });
};
