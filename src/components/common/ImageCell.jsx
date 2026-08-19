// Fixed-size, rounded thumbnail used in table image columns; opens the
// shared preview modal on click.
const ImageCell = ({ src, alt, onClick, size = 38 }) =>
  src ? (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg overflow-hidden ring-1 ring-transparent hover:ring-2 hover:ring-[var(--brand-purple)]/40 transition-all cursor-pointer"
      style={{ width: size, height: size }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </button>
  ) : (
    <div
      className="shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] text-center leading-tight px-1"
      style={{ width: size, height: size }}
    >
      No image
    </div>
  );

export default ImageCell;
