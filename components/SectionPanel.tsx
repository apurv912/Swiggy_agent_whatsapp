type SectionPanelProps = {
  title: string;
  tag: string;
  children: React.ReactNode;
  tall?: boolean;
};

export function SectionPanel({
  title,
  tag,
  children,
  tall = false
}: SectionPanelProps) {
  return (
    <article className={`section-panel${tall ? " tall" : ""}`}>
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="section-tag">{tag}</span>
      </div>
      <div className="section-content">{children}</div>
    </article>
  );
}
