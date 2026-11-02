# Poseyyy-io (Skybound Studio)

A beautiful, modern, 100% browser-based photobooth web application built directly from the product requirements document.

## Dynamic Template / Frame System
- **Automatic Frame Integration:** Any photostrip frame image added to the `Photostrip/` folder can be registered in `script.js` under the `templates` array.
- **Strict Photo Enforcement:** Each template specifies its exact photo limit (`shots: 3` for 3-cut frames), enforcing the exact maximum number of photos.
- **Smart Cover-Fit Rendering:** Photos are automatically cropped and scaled to fit perfectly inside the frame window slots without distortion.

## Running Locally
Simply open `index.html` in any modern browser or serve via any static web server (e.g., Live Server, `npx serve`).
