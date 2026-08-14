"use client";

import { useState } from "react";
import { Section, Container, Text } from "@/ui/components";
import { Icon, UlaAvatar } from "@/ui/icons";
import { UlaGuideProps } from "./domain/types";
import styles from "./ula-guide.variants";

/**
 * ula-guide — a demonstration of the conversation, before the visitor commits to anything.
 *
 * The responses are CMS copy, not model output. This section exists to show what Ula does;
 * the real conversation (and the real AI layer) lives in the signup journey behind cta_url.
 * Keeping approved copy here means this section can never say something Legal has not seen.
 */
const UlaGuide = ({ eyebrow, heading, intro, question, choices, cta_label, cta_url }: UlaGuideProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Section className={styles.section()}>
      <Container className={styles.inner()}>
        <div className={styles.eyebrow()}>
          <UlaAvatar size="sm" aria-hidden />
          <Text as="span">{eyebrow}</Text>
        </div>

        <Text as="h2" className={styles.heading()}>
          {heading}
        </Text>
        <Text as="p" className={styles.intro()}>
          {intro}
        </Text>

        <div className={styles.demo()}>
          <Text as="p" className={styles.question()}>
            {question}
          </Text>

          <div className={styles.choices()} role="group" aria-label={question}>
            {choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                className={styles.choice({ selected: selected === index })}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <span className={styles.choiceIcon()}>
                  <Icon name={choice.icon} aria-hidden />
                </span>
                <span className={styles.choiceLabel()}>{choice.label}</span>
              </button>
            ))}
          </div>

          {/* role="status" so a screen reader announces Ula's reply without moving focus. */}
          <div className={styles.response({ visible: selected !== null })} role="status">
            {selected !== null ? choices[selected].response : ""}
          </div>

          <a className={styles.cta()} href={cta_url}>
            {cta_label}
          </a>
        </div>
      </Container>
    </Section>
  );
};

UlaGuide.displayName = "UlaGuide";

export default UlaGuide;
