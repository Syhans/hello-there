import { useState } from "react";

const states = ["Hello there!", "General Kenobi!", "You are a bold one!"];

export function App() {
  const [index, setIndex] = useState(0);

  return (
    <div className="p-24 grid min-h-screen place-items-center">
      <div className="flex flex-col items-center space-y-8">
        <img
          src="/hello-there-1.avif"
          alt="Obi-Wan Kenobi: Hello there!"
          className={index !== 0 ? "hidden" : ""}
        />
        <img
          src="/hello-there-2.avif"
          alt="General Grievous: General Kenobi!"
          className={index !== 1 ? "hidden" : ""}
        />
        <img
          src="/hello-there-3.avif"
          alt="General Grievous: You are a bold one!"
          className={index !== 2 ? "hidden" : ""}
        />
        <button
          className="btn btn-primary"
          onClick={() => setIndex((index) => (index + 1) % states.length)}
        >
          {states[index]}
        </button>
      </div>
      <p className="fixed top-1 left-1 text-base-content/50 text-xs">Huuuuh.</p>
      {index === 2 && (
        <p className="fixed bottom-1 right-1 text-base-content/50 text-xs">
          (Yes I know, that's not how the scene goes)
        </p>
      )}
    </div>
  );
}
