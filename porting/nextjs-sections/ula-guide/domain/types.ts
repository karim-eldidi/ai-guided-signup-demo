import { MetaDataEntity } from "@/domain/types/shared";

/**
 * Contentstack content type: `ula_guide`
 *
 * The Ula product moment further down the landing page. One question, three choices,
 * one short response — then a single CTA into the real journey.
 *
 * Keep this section as one focused moment. Do not stack a feature grid next to it.
 */
export type UlaGuideChoice = {
  /** "Move more" */
  label: string;
  /** Ula's reply when this choice is picked. Approved copy only — no generated text here. */
  response: string;
  /** Icon key from the component library. */
  icon: string;
  _metadata: MetaDataEntity;
};

export type UlaGuideProps = {
  /** "Ula · Membership guide" */
  eyebrow: string;
  /** "Not sure where to start? Ask Ula." */
  heading: string;
  /** "Tell me what you want from movement and I'll help you find nearby activities and a membership that fits." */
  intro: string;
  /** "What would you love to do more of?" */
  question: string;
  choices: UlaGuideChoice[];
  /** "Start with Ula" */
  cta_label: string;
  cta_url: string;
  _metadata: MetaDataEntity;
};
