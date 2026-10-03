export function CodeViewer({ text }: { text: string }) {
  return (
    <div className="code-viewer">
      {text.split("\n").map((line, index) => (
        <div className="code-line" key={index}>
          <span>{index + 1}</span>
          <code>{line || " "}</code>
        </div>
      ))}
    </div>
  );
}
