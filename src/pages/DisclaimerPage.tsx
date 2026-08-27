const SITE_DOMAIN = 'seventhree.dev'
const CONTACT_EMAIL = 'support@seventhree.dev'

export function DisclaimerPage() {
  return (
    <article className="detail legal">
      <h1 className="detail-title">Disclaimer</h1>
      <p className="detail-tagline">
        Independent personal project. No affiliation with any game or its publisher.
      </p>

      <h2 className="detail-section-title">No affiliation or endorsement</h2>
      <p>
        {SITE_DOMAIN} and every application listed on it are independent works
        created by a private individual. They are <strong>not</strong> affiliated
        with, associated with, authorised by, endorsed by, sponsored by, or in any
        way officially connected to any game, game developer, game publisher, or
        any of their subsidiaries or affiliates.
      </p>
      <p>
        I do not work for, contract for, or represent any game developer or
        publisher, and I have no business relationship with any of them. Nothing on
        this site should be read as a statement made on their behalf, or as
        suggesting that they have reviewed, approved, or supported this project in
        any way.
      </p>

      <h2 className="detail-section-title">Trademarks and names</h2>
      <p>
        All product names, game titles, logos, brands, trademarks, and registered
        trademarks referenced on this site are the property of their respective
        owners. They are used here only descriptively, to identify which game a
        given tool is designed to work with. Such use does not imply any
        affiliation with or endorsement by the trademark holder.
      </p>
      <p>
        No official artwork, logo, or branding belonging to any publisher is
        reproduced on this site or inside any application listed here.
      </p>

      <h2 className="detail-section-title">What these tools are</h2>
      <p>
        These are personal, non-commercial projects, written for my own use and
        shared as-is at no charge. They contain no game code, they do not modify,
        decompile, patch, or redistribute any game or any part of it, and they do
        not access, alter, or interfere with any publisher's servers, accounts, or
        data. They run locally on a device belonging to the person who chooses to
        install them, and they act only on that person's own screen and input.
      </p>

      <h2 className="detail-section-title">Your responsibility</h2>
      <p>
        The terms of service, end-user licence agreements, and rules of any game
        are an agreement between that game's publisher and you, the player.
        Automating any part of a game may breach those terms and may result in
        penalties applied to your account, including suspension or a permanent ban.
      </p>
      <p>
        <strong>
          It is entirely your responsibility to read the terms that apply to you
          and to decide whether to use these tools.
        </strong>{' '}
        By downloading or using anything from this site you accept that you do so
        at your own risk and of your own free choice, and that any consequence to
        your account or your device is yours alone.
      </p>

      <h2 className="detail-section-title">No warranty</h2>
      <p>
        Everything here is provided "as is", without warranty of any kind, express
        or implied, including but not limited to warranties of merchantability,
        fitness for a particular purpose, and non-infringement. To the fullest
        extent permitted by applicable law, I accept no liability for any claim,
        damage, data loss, account loss, or other liability arising from the use of
        anything published on this site.
      </p>

      <h2 className="detail-section-title">Rights holders</h2>
      <p>
        If you represent a rights holder and believe anything on this site
        infringes your rights or misrepresents a relationship with your
        organisation, please get in touch at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and I will respond
        promptly. I am willing to amend or remove material on request.
      </p>

      <p className="detail-note">
        This page describes the nature of this project. It is not legal advice, and
        it does not modify whatever agreement exists between you and any game
        publisher.
      </p>
    </article>
  )
}
