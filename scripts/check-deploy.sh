#!/usr/bin/env bash
# Post-deploy smoke check: every route's status and title, the private pools'
# rewrites, the 404 page and the static files, on the live site (or the base
# URL given). Run it once a push has deployed — the build gate can't see
# routing (vercel.json rewrites only exist on Vercel; a146ea0's 404s on the
# pools were that). Prints FAIL lines; exit 1 on any.
#   bash scripts/check-deploy.sh [https://playstreakle.com]
SITE=${1:-https://playstreakle.com}
SITE=${SITE%/}
ADS_TXT=$(cat "$(dirname "$0")/../public/ads.txt")
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
fail=0
say() { echo "$@"; }
bad() { echo "FAIL $*"; fail=1; }
title_of() { grep -o '<title>[^<]*' "$1" | head -1 | sed 's/<title>//'; }

# Prerendered pages: 200 and their own title.
for p in / /words /link /nums /mines /weave /scramble /faceoff /gridiron /knockout /privacy /login /words/ /login/ "/?code=test"; do
  code=$(curl -s -o "$TMP" -w '%{http_code}' "$SITE$p")
  title=$(title_of "$TMP")
  if [ "$code" = 200 ]; then say "ok $p $code $title"; else bad "$p $code $title"; fi
done
# Words' title must not be the home one.
curl -s -o "$TMP" "$SITE/words"
case "$(title_of "$TMP")" in *Words*) ;; *) bad "/words has no Words title";; esac

# Rewritten private pages: 200 HTML.
for p in /pools /pools/ /bracket /bracket/ /octagon /octagon/; do
  code=$(curl -s -o "$TMP" -w '%{http_code}' "$SITE$p")
  if [ "$code" = 200 ] && grep -q '<div id="root">' "$TMP"; then say "ok $p $code"; else bad "$p $code"; fi
done

# /index.html redirects to /.
loc=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$SITE/index.html")
case "$loc" in 30[18]*"$SITE/") say "ok /index.html -> $loc";; *) bad "/index.html redirect $loc";; esac

# Unknown URLs: 404, the not-found head, and scripts that load.
for p in /no-such-page /a/b/c /words/extra /pools/x; do
  code=$(curl -s -o "$TMP" -w '%{http_code}' "$SITE$p")
  title=$(title_of "$TMP")
  robots=$(grep -c 'name="robots" content="noindex"' "$TMP")
  canon=$(grep -c 'rel="canonical"' "$TMP")
  if [ "$code" = 404 ] && [ "$title" = "Page not found | Streakle" ] && [ "$robots" = 1 ] && [ "$canon" = 0 ]; then
    say "ok $p $code $title"
  else
    bad "$p code=$code title=$title robots=$robots canonical=$canon"
  fi
done
js=$(curl -s "$SITE/no-such-page" | grep -o '/assets/index-[^"]*\.js' | head -1)
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE$js")
if [ -n "$js" ] && [ "$code" = 200 ]; then say "ok 404 page script $js"; else bad "404 page script '$js' $code"; fi

# Static files. ads.txt must match the repo's, as text/plain.
for p in /robots.txt /sitemap.xml /manifest.webmanifest /favicon.svg /og-image.png; do
  code=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$SITE$p")
  case "$code" in 200*) say "ok $p $code";; *) bad "$p $code";; esac
done
ct=$(curl -s -o "$TMP" -w '%{content_type}' "$SITE/ads.txt")
if [ "$(cat "$TMP")" = "$ADS_TXT" ] && [ "${ct#text/plain}" != "$ct" ]; then say "ok /ads.txt $ct"; else bad "/ads.txt content-type=$ct or content differs from public/ads.txt"; fi

if [ $fail = 0 ]; then say "ALL CHECKS PASSED"; else say "SOME CHECKS FAILED"; fi
exit $fail
