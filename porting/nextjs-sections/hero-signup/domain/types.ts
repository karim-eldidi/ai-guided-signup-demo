import { MetaDataEntity } from "@/domain/types/shared";

/**
 * Contentstack content type: `hero_signup`
 *
 * Field ids below match the ids Contentstack generates from the field names, so the
 * section can be authored without any code change. Keep them in sync if you rename
 * a field in the CMS.
 */
export type HeroSignupProps = {
  /** "Your way to move." */
  heading: string;
  /** "Tell us what moves you. We'll find nearby activities and a membership that fits your life." */
  subheading: string;

  /** "Meet Ula, your personal membership guide." */
  guide_title: string;
  /** "Find nearby activities and the right membership." */
  guide_subtitle: string;
  /** Shorter single line used on small screens. */
  guide_subtitle_mobile: string;

  /** "Your email address" */
  email_placeholder: string;
  /** "Find my fit" */
  cta_label: string;
  /** "or continue with" */
  sso_divider_label: string;
  /** Which social providers to offer. */
  sso_providers: Array<"google" | "apple">;

  /** "Email me offers, news and activity inspiration." — must stay separate from Terms. */
  marketing_consent_label: string;
  /** "By continuing, you agree to our {terms} and {privacy}." */
  legal_text: string;
  terms_url: string;
  privacy_url: string;

  /** Where the form posts. The signup app owns this route. */
  action_url: string;

  image: {
    url: string;
    /** Never leave this empty — the photo carries meaning on this page. */
    title: string;
  };

  login_url: string;
  login_label: string;

  _metadata: MetaDataEntity;
};
