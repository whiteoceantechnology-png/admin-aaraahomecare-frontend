// Shimmer placeholder block, built on the `.skeleton` keyframe defined in index.css.
const Skeleton = ({ className = "", style }) => (
  <div className={`skeleton rounded-lg ${className}`} style={style} />
);

export default Skeleton;
