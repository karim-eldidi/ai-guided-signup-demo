import Image from "next/image";
import { Section, Container, Text } from "@/ui/components";
import { AppleMark, GoogleMark, SparkleIcon } from "@/ui/icons";
import { HeroSignupProps } from "./domain/types";
import styles from "./hero-signup.variants";

/**
 * hero-signup — the first screen of the AI-guided signup journey.
 *
 * Ported from the Ula pilot. Deliberately a plain <form> POST: the whole journey has to
 * work before JavaScript loads, and this is the only conversion point on the page.
 *
 * Two rules worth preserving when you edit this:
 *   1. Marketing consent is a separate, unchecked, optional checkbox. It is never bundled
 *      into acceptance of the Terms.
 *   2. Email is the primary action; Google and Apple are visible alternatives, not equals.
 */
const HeroSignup = ({
  heading,
  subheading,
  guide_title,
  guide_subtitle,
  guide_subtitle_mobile,
  email_placeholder,
  cta_label,
  sso_divider_label,
  sso_providers,
  marketing_consent_label,
  legal_text,
  terms_url,
  privacy_url,
  action_url,
  image,
  login_url,
  login_label,
}: HeroSignupProps) => {
  const [legalBefore, legalAfter = ""] = legal_text.split("{terms}");
  const [legalMiddle, legalEnd = ""] = legalAfter.split("{privacy}");

  return (
    <Section className={styles.section()}>
      <div className={styles.panel()}>
        <div className={styles.panelBar()}>
          <a className={styles.wordmark()} href="/">
            Urban Sports Club
          </a>
          <a className={styles.loginMobile()} href={login_url}>
            {login_label}
          </a>
        </div>

        <Container className={styles.body()}>
          <Text as="h1" className={styles.heading()}>
            {heading}
          </Text>
          <Text as="p" className={styles.subheading()}>
            {subheading}
          </Text>

          <div className={styles.guide()}>
            <SparkleIcon aria-hidden className={styles.guideIcon()} />
            <div>
              <Text as="span" className={styles.guideTitle()}>
                {guide_title}
              </Text>
              <Text as="span" className={styles.guideSubtitle()}>
                {guide_subtitle}
              </Text>
              <Text as="span" className={styles.guideSubtitleMobile()}>
                {guide_subtitle_mobile}
              </Text>
            </div>
          </div>

          <form method="POST" action={action_url} noValidate>
            <div className={styles.signupRow()}>
              <input
                type="email"
                name="email"
                inputMode="email"
                autoComplete="email"
                placeholder={email_placeholder}
                aria-label={email_placeholder}
                required
              />
              <button type="submit">{cta_label}</button>
            </div>

            {sso_providers.length > 0 && (
              <>
                <div className={styles.divider()}>{sso_divider_label}</div>
                <div className={styles.ssoRow()}>
                  {sso_providers.includes("google") && (
                    <button className={styles.ssoButton()} type="submit" name="provider" value="google">
                      <GoogleMark aria-hidden /> Google
                    </button>
                  )}
                  {sso_providers.includes("apple") && (
                    <button className={styles.ssoButton()} type="submit" name="provider" value="apple">
                      <AppleMark aria-hidden /> Apple
                    </button>
                  )}
                </div>
              </>
            )}

            <div className={styles.consentRow()}>
              <input id="marketing" type="checkbox" name="marketing" value="yes" />
              <label htmlFor="marketing">{marketing_consent_label}</label>
            </div>

            <Text as="p" className={styles.legal()}>
              {legalBefore}
              <a href={terms_url}>Terms</a>
              {legalMiddle}
              <a href={privacy_url}>Privacy Policy</a>
              {legalEnd}
            </Text>
          </form>
        </Container>
      </div>

      <div className={styles.media()}>
        <a className={styles.loginDesktop()} href={login_url}>
          {login_label}
        </a>
        <Image src={image.url} alt={image.title} fill priority className={styles.image()} />
      </div>
    </Section>
  );
};

HeroSignup.displayName = "HeroSignup";

export default HeroSignup;
