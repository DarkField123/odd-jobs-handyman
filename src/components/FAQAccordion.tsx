import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <div
          key={index}
          className={`faq-item ${openIndex === index ? 'open' : ''}`}
        >
          <button
            className="faq-question"
            onClick={() => toggleItem(index)}
            aria-expanded={openIndex === index}
          >
            <span>{item.question}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="faq-icon"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div className="faq-answer">
            <p>{item.answer}</p>
          </div>
        </div>
      ))}

      <style>{`
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .faq-item {
          background: var(--bg-white);
          border: 2px solid var(--border-light);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color 0.3s ease;
        }

        .faq-item:hover {
          border-color: var(--accent-light);
        }

        .faq-item.open {
          border-color: var(--accent);
        }

        .faq-question {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: none;
          border: none;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          transition: color 0.3s ease;
        }

        .faq-question:hover {
          color: var(--accent);
        }

        .faq-icon {
          flex-shrink: 0;
          color: var(--accent);
          transition: transform 0.3s ease;
        }

        .faq-item.open .faq-icon {
          transform: rotate(180deg);
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .faq-item.open .faq-answer {
          max-height: 500px;
        }

        .faq-answer p {
          padding: 0 1.5rem 1.25rem;
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.7;
        }

        @media (max-width: 600px) {
          .faq-question {
            font-size: 1rem;
            padding: 1rem 1.25rem;
          }

          .faq-answer p {
            padding: 0 1.25rem 1rem;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}
