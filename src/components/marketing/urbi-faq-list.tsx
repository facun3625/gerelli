"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

function FaqButton({
  question,
  open,
  contentId,
  onClick,
  className = "",
}: {
  question: string;
  open: boolean;
  contentId: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-6 py-5 text-left font-bold outline-none transition-colors hover:text-[#1e658c] focus-visible:text-[#1e658c] ${className}`}
    >
      <span>{question}</span>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${open ? "rotate-180 bg-[#208ab1] text-white" : "bg-[#208ab1]/10 text-[#1e658c] group-hover:bg-[#208ab1]/20"}`}>
        <ChevronDown className="size-4" />
      </span>
    </button>
  );
}

function FaqAnswer({ id, answer, open, className = "" }: { id: string; answer: string; open: boolean; className?: string }) {
  return (
    <div
      id={id}
      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="overflow-hidden">
        <p className={`max-w-3xl text-sm leading-relaxed text-black/55 transition-[padding] duration-500 motion-reduce:transition-none ${open ? "pb-6" : "pb-0"} ${className}`}>{answer}</p>
      </div>
    </div>
  );
}

export function UrbiFaqList({ items, columns = 1 }: { items: string[][]; columns?: 1 | 2 }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const listId = useId();

  if (columns === 2) {
    const rows: { index: number; question: string; answer: string }[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      const row = [{ index: i, question: items[i][0], answer: items[i][1] }];
      if (items[i + 1]) row.push({ index: i + 1, question: items[i + 1][0], answer: items[i + 1][1] });
      rows.push(row);
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_14px_40px_rgba(29,23,19,.04)]">
        {rows.map((row, rowIndex) => (
          <div key={row[0].index} className={rowIndex ? "border-t border-black/10" : ""}>
            <div className="md:grid md:grid-cols-2">
              {row.map((item, colIndex) => (
                <FaqButton
                  key={item.index}
                  question={item.question}
                  open={openIndex === item.index}
                  contentId={`${listId}-answer-${item.index}`}
                  onClick={() => setOpenIndex(openIndex === item.index ? null : item.index)}
                  className={`px-5 md:px-7 ${colIndex === 0 ? "md:border-r md:border-black/10" : "border-t border-black/10 md:border-t-0"}`}
                />
              ))}
            </div>
            {/* Las respuestas quedan siempre montadas (no solo la abierta) para
                que el cierre anime igual que la apertura — el ancho completo de
                la fila es justamente lo que se pidió: que no quede angosta
                adentro de su columna. */}
            {row.map((item) => (
              <FaqAnswer
                key={item.index}
                id={`${listId}-answer-${item.index}`}
                answer={item.answer}
                open={openIndex === item.index}
                className="px-5 md:px-7"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white px-5 shadow-[0_14px_40px_rgba(29,23,19,.04)] md:px-7">
      {items.map(([question, answer], index) => {
        const open = openIndex === index;
        const contentId = `${listId}-answer-${index}`;
        return (
          <div key={question} className={index ? "border-t border-black/10" : ""}>
            <FaqButton question={question} open={open} contentId={contentId} onClick={() => setOpenIndex(open ? null : index)} />
            <FaqAnswer id={contentId} answer={answer} open={open} className="pr-10" />
          </div>
        );
      })}
    </div>
  );
}
