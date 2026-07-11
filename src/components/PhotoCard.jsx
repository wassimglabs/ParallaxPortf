export default function PhotoCard({ client, title, seed, x, y, width, rotate }) {
  return (
    <div
      className="photo-card"
      style={{
        left: x,
        top: y,
        width,
        '--tilt': `${rotate}deg`,
      }}
    >
      <img
        src={`https://picsum.photos/seed/${seed}/500/380`}
        alt=""
        draggable={false}
      />
      <div className="photo-tag">
        <span className="photo-tag-client">{client}</span>
        <span className="photo-tag-title">{title}</span>
      </div>
    </div>
  );
}