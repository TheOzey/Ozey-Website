#!/bin/bash
# EMULATOR-ONLY: the Workforce session suite (sign-in, admission, cookies, suspension, revocation).
HERE="$(cd "$(dirname "$0")" && pwd)"
B=http://localhost:3100/dashboard; O='Origin: http://localhost:3100'; H=$(mktemp); pass=0; fail=0
ok() { if [ "$2" = "$3" ]; then echo "  PASS $1 ($2)"; pass=$((pass+1)); else echo "  FAIL $1 (got $2, want $3)"; fail=$((fail+1)); fi; }
session() { curl -s -o /dev/null -D $H -w '%{http_code}' -X POST $B/api/session -H "$O" -H 'Content-Type: application/json' -d "{\"idToken\":\"$1\"}"; }
cookie() { grep -i '^set-cookie' $H | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]*);.*/\1/'; }
get() { curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $1" $B$2; }
emp() { (cd "$HERE/../../../../workforce" && FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9299 node -e '
const {createRequire}=require("node:module");const r=createRequire(process.cwd()+"/functions/package.json");
const {Firestore}=r("@google-cloud/firestore");const {initializeApp}=r("firebase-admin/app");const {getAuth}=r("firebase-admin/auth");
const db=new Firestore({projectId:"demo-ozey-workforce"});initializeApp({projectId:"demo-ozey-workforce"});
(async()=>{const d=(await db.collection("employees").get()).docs[0];const a=process.argv[1];
if(a.startsWith("status=")){await d.ref.update({status:a.slice(7)});console.log("ok");return;}
if(a==="state"){console.log(d.get("status")+"/"+(d.get("authUid")?"linked":"unlinked"));return;}
if(a==="auth"){console.log((await getAuth().listUsers()).users.map(u=>u.email).sort().join(","));return;}})()' "$1"); }
echo "== unauthenticated / forged / CSRF / bad token"
ok "no cookie -> redirect to sign-in" "$(curl -s -o /dev/null -w '%{http_code}' $B/shg)" 307
ok "forged cookie -> redirect to sign-in" "$(get 'ozey_console_session=forged' /shg)" 307
ok "session POST from another origin" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/api/session -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{"idToken":"x"}')" 403
ok "session POST with garbage token" "$(session garbage)" 401
echo "== admission"
ok "stranger (someone.else@gmail.com)" "$(session $(python3 "$HERE/emu_signin.py" someone.else@gmail.com))" 403
ok "employee state before first sign-in" "$(emp state)" "invited/unlinked"
ok "web.viru@gmail.com" "$(session $(python3 "$HERE/emu_signin.py" web.viru@gmail.com))" 200
C=$(cookie)
ok "employee linked + activated" "$(emp state)" "active/linked"
ok "stranger's Auth record discarded (only employee remains)" "$(emp auth)" "web.viru@gmail.com"
ok "cookie flags" "$(grep -ci 'Path=/dashboard.*HttpOnly.*SameSite=strict\|Path=/dashboard.*Secure.*HttpOnly' $H)" 1
echo "== authenticated pages"
ok "dashboard home" "$(get "$C" "")" 200
ok "SHG workspace" "$(get "$C" /shg/groups)" 200
ok "Employees page lists the directory" "$(curl -s -H "Cookie: $C" $B/employees | grep -q 'Ozey Console Administrator' && echo 1 || echo 0)" 1
ok "Roles page lists the seeded roles" "$(P=$(curl -s -H "Cookie: $C" $B/roles); echo "$P" | grep -q 'shg-viewer' && echo "$P" | grep -q 'console:employees.manage' && echo 1 || echo 0)" 1
ok "old global SHG URL redirects into Groups" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: $C" $B/shg/members)" "307 $B/shg/groups"
nav() { curl -s -H "Cookie: $C" "$B$1" | python3 "$HERE/navcheck.py"; }
G=/shg/groups/grp_nav; GB="back=Groups@/dashboard/shg/groups;crumbs="
ok "Groups page: SHG header tabs, no back button" "$(nav /shg/groups)" "product=Groups;group=;back=;crumbs="
ok "group root: Group Overview tab, no SHG header, back to Groups" "$(nav $G)" "product=;group=Overview;$GB"
for s in Members Transactions Loans Meetings; do
  ok "group $s: its tab active, no SHG header, back to Groups" "$(nav $G/$(echo $s | tr A-Z a-z))" "product=;group=$s;$GB"
done
ok "member page: SHG header + breadcrumb (group crumb is a link)" "$(nav $G/members/m_nav)" "product=Groups;group=;back=;crumbs=SHG@/dashboard/shg,Groups@/dashboard/shg/groups,Group@/dashboard/shg/groups/grp_nav,Members@/dashboard/shg/groups/grp_nav/members,Member!"
ok "legacy member URL redirects to group member URL" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: $C" $B/shg/members/grp_nav/m_nav)" "307 $B$G/members/m_nav"
ok "legacy group-filtered URL redirects to the group section" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: $C" "$B/shg/loans?group=grp_nav&status=active")" "307 $B$G/loans?group=grp_nav&status=active"
ok "legacy /shg/employees redirects to Employees" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H "Cookie: $C" $B/shg/employees)" "307 $B/employees"
ok "SHG logo (not a letter badge) on dashboard, sidebar and SHG header" "$(for path in "" /shg; do curl -s -H "Cookie: $C" "$B$path" | grep -o 'shg-logo[^"&]*\.png' | sort -u | wc -l | tr -d ' '; done | tr '\n' ' ')" "1 1 "
ok "only SHG in rendered product UI (dashboard + SHG pages)" "$(for path in "" /employees /roles /shg /shg/groups /shg/reports $G $G/members; do curl -s -H "Cookie: $C" "$B$path"; done | grep -ciE 'Spendrova|Ozey Sell|Ozey Gat|Ozey Book|Ozey Stay|All products|Coming soon')" 0
ok "SHG workspace is connected (Groups page, no 'not connected' state)" "$(P=$(curl -s -H "Cookie: $C" $B/shg/groups); echo "$P" | grep -q 'Every Self Help Group in the SHG app' && ! echo "$P" | grep -q 'SHG data is not connected yet' && echo 1 || echo 0)" 1
echo "== suspension (takes effect within the 60 s cache)"
emp status=suspended >/dev/null
until [ "$(get "$C" /shg)" = "307" ]; do sleep 5; done; ok "suspended employee's live session rejected" 307 307
ok "suspended employee cannot start a new session" "$(session $(python3 "$HERE/emu_signin.py" web.viru@gmail.com))" 403
emp status=active >/dev/null
echo "== sign-out revocation"
until [ "$(session $(python3 "$HERE/emu_signin.py" web.viru@gmail.com))" = "200" ] && C=$(cookie) && [ "$(get "$C" /shg)" = "200" ]; do sleep 5; done
ok "sign-out" "$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: $C" -X DELETE $B/api/session -H "$O")" 200
ok "copied cookie after sign-out rejected" "$(get "$C" /shg)" 307
rm -f $H; echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
