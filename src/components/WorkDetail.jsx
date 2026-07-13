export default function WorkDetail({ work }) {
  return (
    <main className="work-page">
      <a className="work-home-link" href="/" data-cursor-hover>
        HANZOUTI
      </a>

      <section className="work-hero">
        <video
          className="work-video"
          src={work.video}
          autoPlay
          muted
          loop
          playsInline
          controls
        />

        <div className="work-title-block">
          <p>{work.client}</p>
          <h1>{work.title}</h1>
          <a href="#" onClick={(event) => event.preventDefault()} data-cursor-hover>
            {work.editor}
          </a>
        </div>
      </section>

      <section className="work-credits" aria-label="Credits">
        <h2>Credits</h2>
        <div className="work-credit-list">
          <div className="work-credit-row">
            <span>Editor</span>
            <strong>{work.editor}</strong>
          </div>
          {work.credits.map(([role, name]) => (
            <div className="work-credit-row" key={role}>
              <span>{role}</span>
              <strong>{name}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
