import { TopBar, ShellFooter } from './GameShell'

/**
 * GameShell's frame for the pages that aren't games (sign-in, privacy, pool
 * history): the same top bar, title and footer, with the page's content in a
 * column below. The footer sits outside <main>, as the page's contentinfo.
 *
 * @param {object} props
 * @param {string} [props.title] - the page's <h1>; leave it out while a page shouldn't name itself yet
 * @param {string} [props.subtitle] - the small gold line under the title (a game's "by Streakle")
 * @param {string} [props.date] - the muted line under that (a game's puzzle date)
 * @param {number} [props.width] - the content column's max width, px
 * @param {boolean} [props.showAccount] - false leaves the top bar's account side empty
 * @param {import('react').ReactNode} props.children - the page's content
 */
export default function PageShell({ title, subtitle, date, width = 640, showAccount = true, children }) {
  return (
    <div className="gs gs-page">
      <main className="gs-main">
        <TopBar showAccount={showAccount} />
        {title && (
          <div className="gs-head">
            <div className="gs-brand">
              <h1 className="gs-title">{title}</h1>
              {subtitle && <div className="gs-by">{subtitle}</div>}
            </div>
          </div>
        )}
        {date && <div className="gs-date">{date}</div>}
        <div className="gs-body" style={{ maxWidth: width }}>{children}</div>
      </main>
      <ShellFooter />
    </div>
  )
}
