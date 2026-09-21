/** La scelta dell'avatar: i disegni pronti, la foto caricata e il ritaglio. */
export const avatar = {
  title: "Choose avatar",
  description: "Pick a preset or upload your own photo.",
  /** Il testo alternativo della foto caricata, ovunque compaia l'avatar. */
  yours: "Your avatar",
  presets: {
    star: "Avatar option 1: star",
    rocket: "Avatar option 2: rocket",
    cat: "Avatar option 3: cat",
    dog: "Avatar option 4: dog",
    ghost: "Avatar option 5: ghost",
    crown: "Avatar option 6: crown",
    sun: "Avatar option 7: sun",
    bolt: "Avatar option 8: lightning bolt",
    trophy: "Avatar option 9: trophy",
    sparkles: "Avatar option 10: sparkles",
  },
  upload: {
    title: "Upload photo",
    yourPhoto: "Your uploaded photo",
    dropZone: "Upload a photo",
    dropTitle: "Drop an image or click to browse",
    dropHint: "JPG, PNG or WebP · up to 5MB",
  },
  crop: {
    preview: "Crop preview",
    zoom: "Zoom",
    hint: "Drag the photo to reposition it.",
    usePhoto: "Use photo",
  },
  select: "Select",
  errors: {
    unsupported: "Use a JPG, PNG or WebP image",
    tooLarge: "That image is larger than 5MB",
    signInToUpload: "Sign in to upload a photo",
    uploadFailed: "Upload failed",
    saveFailed: "Could not save avatar",
  },
};
