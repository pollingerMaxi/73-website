import { trackSupportClick } from '../analytics/events'
import { SUPPORT_LABEL, SUPPORT_URL } from '../domain/support'

interface SupportCalloutProps {
  /** Where on the site this instance sits, so the reports can tell them apart. */
  readonly placement: string
  readonly appId?: string
}

export function SupportCallout({ placement, appId }: SupportCalloutProps) {
  return (
    <section className="support-callout">
      <h2 className="detail-section-title">Enjoying it?</h2>
      <p className="support-callout-prose">
        Everything here is free, and it stays that way. If one of these apps is
        useful to you and you feel like it, you are welcome to chip in — it helps
        me keep working on them, fixing the bugs and building the next one. It is
        in no way necessary or expected, and it is greatly appreciated.
      </p>
      <a
        className="button button-support"
        href={SUPPORT_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackSupportClick(placement, appId)}
      >
        {`☕ ${SUPPORT_LABEL}`}
      </a>
    </section>
  )
}
